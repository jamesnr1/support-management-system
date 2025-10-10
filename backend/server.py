from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date
import uuid
import json
import copy
from collections import defaultdict

# Import database
from database import db

# Import our models
from models import (
    Worker, WorkerCreate, AvailabilityRule, UnavailabilityPeriod, 
    Participant, Shift, WorkerAvailabilityCheck, ConflictCheck, 
    HoursCalculation, RosterState, TelegramMessage
)
from validation_rules import validate_roster_data
from calendar_service import calendar_service
from telegram_service import telegram_service
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Lifespan event handler to replace deprecated on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events"""
    # Startup
    try:
        load_roster_data()
        logger.info("Application started successfully - using Supabase database")
        yield
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
    # Shutdown
    logger.info("Application shutdown")

# Create the main app with lifespan events
app = FastAPI(title="Support Management System", lifespan=lifespan)

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global roster state - we'll use a simple dict for now
ROSTER_DATA = {
    'weekA': {},
    'weekB': {},
    'nextA': {},
    'nextB': {}
}

def get_current_week_dates():
    """Calculate current week start and end dates (Monday to Sunday)"""
    now = datetime.now()
    # Get Monday of current week
    days_since_monday = now.weekday()  # Monday is 0, Sunday is 6
    monday = now - timedelta(days=days_since_monday)
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get Sunday of current week
    sunday = monday + timedelta(days=6)
    sunday = sunday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    return monday.strftime('%Y-%m-%d'), sunday.strftime('%Y-%m-%d')

def get_next_week_dates():
    """Calculate next week start and end dates (Monday to Sunday)"""
    now = datetime.now()
    # Get Monday of current week
    days_since_monday = now.weekday()  # Monday is 0, Sunday is 6
    monday = now - timedelta(days=days_since_monday)
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get Monday of next week
    next_monday = monday + timedelta(days=7)
    
    # Get Sunday of next week
    next_sunday = next_monday + timedelta(days=6)
    next_sunday = next_sunday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    return next_monday.strftime('%Y-%m-%d'), next_sunday.strftime('%Y-%m-%d')

def get_week_after_next_dates():
    """Calculate week after next start and end dates (Monday to Sunday)"""
    now = datetime.now()
    # Get Monday of current week
    days_since_monday = now.weekday()  # Monday is 0, Sunday is 6
    monday = now - timedelta(days=days_since_monday)
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get Monday of week after next
    week_after_monday = monday + timedelta(days=14)
    
    # Get Sunday of week after next
    week_after_sunday = week_after_monday + timedelta(days=6)
    week_after_sunday = week_after_sunday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    return week_after_monday.strftime('%Y-%m-%d'), week_after_sunday.strftime('%Y-%m-%d')

# File-based persistence for roster data
ROSTER_FILE = Path(__file__).parent / 'roster_data.json'

def load_roster_data():
    """Load roster data from file"""
    global ROSTER_DATA
    try:
        if ROSTER_FILE.exists():
            with open(ROSTER_FILE, 'r') as f:
                ROSTER_DATA = json.load(f)
                logger.info(f"Loaded roster data from {ROSTER_FILE}")
    except Exception as e:
        logger.error(f"Error loading roster data: {e}")
        
def save_roster_data():
    """Save roster data to file"""
    try:
        with open(ROSTER_FILE, 'w') as f:
            json.dump(ROSTER_DATA, f, indent=2)
            logger.info(f"Saved roster data to {ROSTER_FILE}")
    except Exception as e:
        logger.error(f"Error saving roster data: {e}")

# Helper functions are now replaced by direct Supabase calls

# API Routes

# Health check
@api_router.get("/")
async def root():
    return {"message": "Support Management System API", "status": "running"}

# Worker Management Routes
@api_router.get("/workers", response_model=List[Worker])
async def get_workers(check_date: Optional[str] = None):
    """Get all workers from Supabase"""
    try:
        # Parse check_date if provided
        parsed_date = None
        if check_date:
            try:
                parsed_date = datetime.strptime(check_date, '%Y-%m-%d').date()
            except ValueError:
                logger.warning(f"Invalid date format: {check_date}")
        
        workers_data = db.get_support_workers(parsed_date)
        workers = []
        for worker_data in workers_data:
            workers.append(Worker(**worker_data))
        return workers
    except Exception as e:
        logger.error(f"Error fetching workers: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch workers")

@api_router.post("/workers", response_model=Worker)
async def create_worker(worker: WorkerCreate):
    """Create a new worker in Supabase"""
    try:
        worker_data = worker.dict()
        worker_data['status'] = 'Active'
        
        created_worker = db.create_support_worker(worker_data)
        if created_worker:
            return Worker(**created_worker)
        else:
            raise HTTPException(status_code=400, detail="Failed to create worker")
    except Exception as e:
        logger.error(f"Error creating worker: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/workers/{worker_id}", response_model=Worker)
async def update_worker(worker_id: str, worker: WorkerCreate):
    """Update a worker in Supabase"""
    try:
        worker_data = worker.dict()
        
        updated_worker = db.update_support_worker(worker_id, worker_data)
        if updated_worker:
            return Worker(**updated_worker)
        else:
            raise HTTPException(status_code=404, detail="Worker not found")
    except Exception as e:
        logger.error(f"Error updating worker: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str):
    """Delete (deactivate) a worker in Supabase"""
    try:
        success = db.delete_support_worker(worker_id)
        if success:
            return {"message": "Worker deactivated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Worker not found")
    except Exception as e:
        logger.error(f"Error deleting worker: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Participant Management Routes
@api_router.get("/participants", response_model=List[Participant])
async def get_participants():
    """Get all participants from Supabase"""
    try:
        participants_data = db.get_participants()
        participants = []
        for participant_data in participants_data:
            participants.append(Participant(**participant_data))
        return participants
    except Exception as e:
        logger.error(f"Error fetching participants: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch participants")

# Roster Management Routes
@api_router.get("/roster/{week_type}")
async def get_roster(week_type: str):
    """Get roster for specific week type from database"""
    try:
        # Handle new roster/planner structure (including planner_next, planner_after)
        if week_type in ['roster', 'planner', 'planner_next', 'planner_after']:
            roster_section = ROSTER_DATA.get(week_type, {})
            
            # If planner_next or planner_after is empty, copy from current roster as template
            if week_type in ['planner_next', 'planner_after'] and not roster_section.get('data'):
                current_roster = ROSTER_DATA.get('roster', {})
                if current_roster.get('data'):
                    # Copy the roster data structure
                    roster_section = copy.deepcopy(current_roster)
                    logger.info(f"Auto-populated {week_type} with current roster as template")
                    # Don't save it yet - user can modify and save themselves
            
            # Always calculate dates dynamically based on current time
            if week_type == 'roster':
                start_date, end_date = get_current_week_dates()
                roster_section["start_date"] = start_date
                roster_section["end_date"] = end_date
            elif week_type == 'planner_after':
                start_date, end_date = get_week_after_next_dates()
                roster_section["start_date"] = start_date
                roster_section["end_date"] = end_date
            elif week_type in ['planner', 'planner_next']:
                start_date, end_date = get_next_week_dates()
                roster_section["start_date"] = start_date
                roster_section["end_date"] = end_date
            
            return {
                "week_type": roster_section.get("week_type", "weekA"),
                "start_date": roster_section.get("start_date", ""),
                "end_date": roster_section.get("end_date", ""),
                "data": roster_section.get("data", {})
            }
        
        # Backward compatibility for old structure
        week_data = {}
        
        # For nextA and nextB, return the stored data directly (no date filtering)
        if week_type in ['nextA', 'nextB']:
            for participant_code, participant_data in ROSTER_DATA.items():
                if participant_code in ['admin', 'hours']:
                    continue
                if isinstance(participant_data, dict) and week_type in participant_data:
                    week_data[participant_code] = participant_data[week_type]
            logger.info(f"Returning stored roster for {week_type}: {len(week_data)} participants")
            return week_data
        
        # Define date ranges for Week A and Week B (with dynamic date calculation)
        if week_type == 'weekA':
            start_date_str, end_date_str = get_current_week_dates()
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        elif week_type == 'weekB':
            start_date_str, end_date_str = get_next_week_dates()
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            # Unknown week type
            logger.warning(f"Unknown week type requested: {week_type}")
            return {}

        # Return shifts from the SPECIFIC week only (not date-filtered from all weeks)
        for participant_code, participant_data in ROSTER_DATA.items():
            if participant_code in ['admin', 'hours']:
                continue
            
            # Only look at the specific week being requested
            if isinstance(participant_data.get(week_type), dict):
                participant_week_data = participant_data[week_type]
                if participant_week_data:
                    week_data[participant_code] = dict(sorted(participant_week_data.items()))

        logger.info(f"Returning dynamically filtered roster for {week_type}: {len(week_data)} participants")
        return week_data
    except Exception as e:
        logger.error(f"Error getting roster {week_type}: {e}", exc_info=True)
        return {}

@api_router.post("/roster/{week_type}")
async def update_roster(week_type: str, roster_data: Dict[str, Any]):
    """Robust roster update with comprehensive validation"""
    try:
        # Handle new roster/planner structure (including planner_next, planner_after)
        if week_type in ['roster', 'planner', 'planner_next', 'planner_after']:
            if not roster_data:
                raise HTTPException(status_code=400, detail="No roster data provided")
            
            # Validate structure for new format
            if "data" in roster_data:
                # Full structure update with metadata
                ROSTER_DATA[week_type] = {
                    "week_type": roster_data.get("week_type", "weekA"),
                    "start_date": roster_data.get("start_date", ""),
                    "end_date": roster_data.get("end_date", ""),
                    "data": roster_data.get("data", {})
                }
            else:
                # Legacy: just updating data, keep existing metadata
                if week_type not in ROSTER_DATA:
                    ROSTER_DATA[week_type] = {"week_type": "weekA", "start_date": "", "end_date": "", "data": {}}
                ROSTER_DATA[week_type]["data"] = roster_data
            
            save_roster_data()
            logger.info(f"Updated {week_type}: {len(ROSTER_DATA[week_type].get('data', {}))} participants")
            return {"message": f"{week_type.capitalize()} updated successfully"}
        
        # Backward compatibility for old structure
        if not roster_data:
            logger.warning(f"Attempted to update {week_type} with empty data")
            raise HTTPException(status_code=400, detail="No roster data provided")

        # Ensure global ROSTER_DATA structure
        if 'admin' not in ROSTER_DATA:
            ROSTER_DATA['admin'] = {}
        if 'hours' not in ROSTER_DATA:
            ROSTER_DATA['hours'] = {}

        # REPLACE roster data (not merge) - clear ALL participants for this week first
        # Step 1: Clear the week for all existing participants
        for participant_code in list(ROSTER_DATA.keys()):
            if participant_code in ['admin', 'hours']:
                continue
            if isinstance(ROSTER_DATA[participant_code], dict) and week_type in ROSTER_DATA[participant_code]:
                ROSTER_DATA[participant_code][week_type] = {}
        
        # Step 2: Set new data for participants in the POST
        for participant_code, participant_shifts in roster_data.items():
            if participant_code in ['admin', 'hours']:
                continue

            if participant_code not in ROSTER_DATA:
                ROSTER_DATA[participant_code] = {}

            # Set the new week data
            ROSTER_DATA[participant_code][week_type] = participant_shifts

        # Save updated roster
        save_roster_data()

        logger.info(f"Successfully updated {week_type} roster with {len(roster_data)} participants")
        return {"message": f"Roster {week_type} updated successfully", "participants": len(roster_data)}

    except Exception as e:
        logger.error(f"Error updating {week_type} roster: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update roster: {str(e)}")

@api_router.post("/roster/copy_to_planner")
async def copy_to_planner():
    """Copy roster to planner with week_type flip"""
    try:
        roster = ROSTER_DATA.get("roster", {})
        if not roster or not roster.get("data"):
            raise HTTPException(status_code=400, detail="No roster data to copy")
        
        # Get current week_type and flip it
        current_week_type = roster.get("week_type", "weekA")
        new_week_type = "weekB" if current_week_type == "weekA" else "weekA"
        
        # Deep copy the data
        import copy
        planner_data = copy.deepcopy(roster.get("data", {}))
        
        # Create planner with flipped week_type
        ROSTER_DATA["planner"] = {
            "week_type": new_week_type,
            "start_date": "",  # Will be set when user selects dates
            "end_date": "",
            "data": planner_data
        }
        
        save_roster_data()
        logger.info(f"Copied roster ({current_week_type}) to planner ({new_week_type})")
        return {"message": "Copied to planner successfully", "flipped_to": new_week_type}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error copying to planner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/roster/transition_to_roster")
async def transition_to_roster():
    """Move planner to roster (Sunday automation)"""
    try:
        planner = ROSTER_DATA.get("planner", {})
        if not planner or not planner.get("data"):
            raise HTTPException(status_code=400, detail="No planner data to transition")
        
        # Get current week dates for the roster
        start_date, end_date = get_current_week_dates()
        
        # Move planner to roster (keeping the week_type and updating dates)
        ROSTER_DATA["roster"] = {
            "week_type": planner.get("week_type", "weekA"),
            "start_date": start_date,
            "end_date": end_date,
            "data": planner.get("data", {})
        }
        
        # Get next week dates for the new planner
        next_start_date, next_end_date = get_next_week_dates()
        
        # Clear planner and set it up for next week
        ROSTER_DATA["planner"] = {
            "week_type": "weekA",  # Default for empty planner
            "start_date": next_start_date,
            "end_date": next_end_date,
            "data": {}
        }
        
        save_roster_data()
        logger.info(f"Transitioned planner to roster")
        return {"message": "Planner transitioned to roster successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transitioning planner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/roster/{week_type}/validate")
async def validate_roster(week_type: str, roster_data: Optional[Dict[str, Any]] = None):
    """
    Validate roster data against NDIS compliance rules
    Returns errors and warnings
    """
    try:
        # Use provided data or current roster
        data_to_validate = roster_data if roster_data else ROSTER_DATA.get(week_type, {})
        
        # Get all workers for validation
        workers_list = db.get_support_workers()
        workers_dict = {str(w['id']): w for w in workers_list}
        
        # Run validation
        result = validate_roster_data(data_to_validate, workers_dict)
        
        logger.info(f"Validated {week_type}: {len(result['errors'])} errors, {len(result['warnings'])} warnings")
        return result
    except Exception as e:
        logger.error(f"Error validating roster {week_type}: {e}")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

# Location Routes
@api_router.get("/locations")
async def get_locations():
    """Get all locations from Supabase"""
    try:
        return db.get_locations()
    except Exception as e:
        logger.error(f"Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch locations")

# Availability Routes
@api_router.get("/workers/{worker_id}/availability")
async def get_worker_availability(worker_id: str):
    """Get worker availability rules"""
    try:
        rules = db.get_availability_rules(int(worker_id))
        
        # Format the data for the frontend
        days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        weekly_availability = {}
        
        # Group rules by weekday
        for rule in rules:
            day_name = days[rule['weekday']]
            if day_name not in weekly_availability:
                weekly_availability[day_name] = {
                    'available': True,
                    'from_time': rule['from_time'],
                    'to_time': rule['to_time'],
                    'is_full_day': rule['is_full_day'],
                    'wraps_midnight': rule['wraps_midnight']
                }
        
        return {
            'weeklyAvailability': weekly_availability,
            'rules': rules  # Also return raw rules for new split availability support
        }
    except Exception as e:
        logger.error(f"Error fetching availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/availability-rules")
async def get_availability_rules_batch(weekday: Optional[int] = None):
    """Get availability rules for all workers, optionally filtered by weekday (0=Sunday, 6=Saturday)"""
    try:
        query = db.client.table('availability_rule').select('*')
        
        if weekday is not None:
            query = query.eq('weekday', weekday)
        
        response = query.execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching availability rules batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/unavailability-periods")
async def get_unavailability_periods_batch(check_date: Optional[str] = None):
    """Get unavailability periods for all workers on a specific date"""
    try:
        from datetime import datetime
        check_date = check_date or datetime.now().date().isoformat()
        
        response = db.client.table('unavailability_periods').select('worker_id').lte('from_date', check_date).gte('to_date', check_date).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching unavailability periods batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/workers/{worker_id}/availability")
async def set_worker_availability(worker_id: str, availability_data: dict):
    """Save worker availability rules"""
    try:
        # Extract the rules array from the payload
        rules = availability_data.get('rules', [])
        success = db.save_availability_rules(int(worker_id), rules)
        if success:
            return {"message": "Availability updated successfully", "worker_id": worker_id}
        else:
            raise HTTPException(status_code=400, detail="Failed to update availability")
    except Exception as e:
        logger.error(f"Error saving availability: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Unavailability Routes
@api_router.get("/workers/{worker_id}/unavailability")
async def get_worker_unavailability(worker_id: str):
    """Get worker unavailability periods"""
    try:
        periods = db.get_unavailability_periods(int(worker_id))
        return periods
    except Exception as e:
        logger.error(f"Error fetching unavailability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/workers/{worker_id}/unavailability")
async def add_unavailability_period(worker_id: str, period: UnavailabilityPeriod):
    """Adds a new unavailability period for a worker."""
    try:
        logger.info(f"Attempting to add unavailability for worker {worker_id} from {period.from_date} to {period.to_date}")

        # Pydantic has already validated the date formats.
        # The database function expects ISO format strings.
        created_period = db.create_unavailability_period(
            worker_id=int(worker_id),
            from_date=period.from_date.isoformat(),
            to_date=period.to_date.isoformat(),
            reason=period.reason or "Other"  # Use default if reason is null/undefined
        )

        if not created_period:
            raise HTTPException(status_code=500, detail="Failed to create unavailability period in database.")

        logger.info(f"Successfully created unavailability for worker {worker_id}")
        return created_period

    except Exception as e:
        logger.error(f"Error adding unavailability period for worker {worker_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@api_router.delete("/unavailability/{period_id}")
async def delete_unavailability(period_id: int):
    """Deletes an unavailability period by its ID."""
    try:
        logger.info(f"Attempting to delete unavailability period {period_id}")
        success = db.delete_unavailability_period(period_id)
        if not success:
            raise HTTPException(status_code=404, detail="Unavailability period not found or could not be deleted.")
        
        logger.info(f"Successfully deleted unavailability period {period_id}")
        return {"message": "Unavailability period deleted successfully."}
    except Exception as e:
        logger.error(f"Error deleting unavailability period {period_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while deleting the period.")

# ============================================
# GOOGLE CALENDAR INTEGRATION ROUTES
# ============================================

@api_router.get("/calendar/appointments")
async def get_calendar_appointments(startDate: str, endDate: str, weekType: str):
    """
    Fetch appointments from Google Calendar for a date range
    
    Query params:
    - startDate: ISO format start date
    - endDate: ISO format end date
    - weekType: weekA, weekB, nextA, nextB (for logging)
    """
    try:
        start = datetime.fromisoformat(startDate.replace('Z', '+00:00'))
        end = datetime.fromisoformat(endDate.replace('Z', '+00:00'))
        
        logger.info(f"Fetching calendar appointments for {weekType}: {start} to {end}")
        
        # Try to get appointments from Google Calendar if authorized
        try:
            # Fetch from ALL calendars instead of just primary
            appointments = calendar_service.get_appointments(start, end, 'all')
            return {
                "success": True,
                "appointments": appointments,
                "count": len(appointments),
                "source": "google_calendar"
            }
        except Exception as calendar_error:
            logger.info(f"Google Calendar not available: {calendar_error}")
        
        # Return empty state when Google Calendar isn't connected
        return {
            "success": True,
            "appointments": [],
            "count": 0,
            "source": "not_connected",
            "message": "Connect Google Calendar to see your appointments here"
        }
        
    except Exception as e:
        logger.error(f"Error fetching calendar appointments: {e}")
        # Return empty list instead of error so UI doesn't break
        return {
            "success": False,
            "appointments": [],
            "count": 0,
            "error": str(e)
        }

@api_router.get("/calendar/auth-url")
async def get_calendar_auth_url(redirect_uri: str):
    """
    Get Google Calendar OAuth authorization URL
    """
    try:
        auth_url = calendar_service.get_authorization_url(redirect_uri)
        if auth_url:
            return {"auth_url": auth_url}
        else:
            raise HTTPException(status_code=500, detail="Could not generate auth URL")
    except Exception as e:
        logger.error(f"Error getting auth URL: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/calendar/authorize")
async def authorize_calendar(data: Dict[str, Any]):
    """
    Complete OAuth authorization with code
    """
    try:
        logger.info(f"DEBUG: Received authorization request with data: {data}")
        
        code = data.get('code')
        redirect_uri = data.get('redirect_uri')
        
        logger.info(f"DEBUG: Extracted code: {repr(code)}")
        logger.info(f"DEBUG: Extracted redirect_uri: {redirect_uri}")
        
        if not code or not redirect_uri:
            raise HTTPException(status_code=400, detail="Missing code or redirect_uri")
        
        logger.info(f"DEBUG: About to call calendar_service.authorize_with_code")
        success = calendar_service.authorize_with_code(code, redirect_uri)
        logger.info(f"DEBUG: authorize_with_code returned: {success}")
        
        if success:
            return {"success": True, "message": "Calendar authorized successfully"}
        else:
            raise HTTPException(status_code=400, detail="Authorization failed")
            
    except Exception as e:
        logger.error(f"Error authorizing calendar: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/calendar/oauth/callback")
async def oauth_callback(code: str = None, error: str = None):
    """
    OAuth callback endpoint - handles the redirect from Google
    """
    if error:
        logger.error(f"OAuth error: {error}")
        return {"error": error, "message": "Authorization was denied or failed"}
    
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")
    
    try:
        # Use the current request URL as redirect_uri
        redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8001')}/api/calendar/oauth/callback"
        
        success = calendar_service.authorize_with_code(code, redirect_uri)
        
        if success:
            # Return a simple HTML page that closes the popup and notifies parent
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Successful</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
                    .message { color: #666; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="success">✅ Authorization Successful!</div>
                <div class="message">Google Calendar has been connected successfully.</div>
                <div class="message">You can close this window and return to the application.</div>
                <script>
                    // Try to close the popup window
                    if (window.opener) {
                        window.opener.postMessage({type: 'oauth_success'}, '*');
                        window.close();
                    }
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content)
        else:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
            
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Failed</title>
            <style>
                body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                .error {{ color: #dc3545; font-size: 24px; margin-bottom: 20px; }}
                .message {{ color: #666; font-size: 16px; }}
            </style>
        </head>
        <body>
            <div class="error">❌ Authorization Failed</div>
            <div class="message">Error: {str(e)}</div>
            <div class="message">Please close this window and try again.</div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{type: 'oauth_error', error: '{str(e)}'}}, '*');
                    window.close();
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)

@api_router.get("/calendar/status")
async def get_calendar_status():
    """
    Check if Google Calendar is connected
    """
    try:
        is_connected = calendar_service.service is not None
        return {
            "connected": is_connected,
            "message": "Google Calendar is connected" if is_connected else "Google Calendar not connected"
        }
    except Exception as e:
        logger.error(f"Error checking calendar status: {e}")
        return {"connected": False, "message": "Error checking calendar status"}

# Telegram Routes
@api_router.get("/telegram/status")
async def get_telegram_status():
    """Get Telegram bot configuration status"""
    return {
        "configured": telegram_service.is_configured(),
        "coordinator_count": telegram_service.get_coordinator_count(),
        "bot_token_set": bool(telegram_service.bot_token)
    }

@api_router.post("/telegram/send-message")
async def send_telegram_message(data: Dict[str, Any]):
    """Send a message to specific workers"""
    try:
        worker_ids = data.get('worker_ids', [])
        message = data.get('message', '')
        
        if not worker_ids or not message:
            raise HTTPException(status_code=400, detail="worker_ids and message are required")
        
        # Get worker telegram IDs from database
        workers = db.get_support_workers()
        telegram_ids = []
        worker_names = []
        
        for worker_id in worker_ids:
            worker = next((w for w in workers if str(w['id']) == str(worker_id)), None)
            if worker and worker.get('telegram'):
                telegram_ids.append(str(worker['telegram']))
                worker_names.append(worker.get('full_name', 'Unknown'))
        
        if not telegram_ids:
            raise HTTPException(status_code=400, detail="No valid Telegram IDs found for selected workers")
        
        # Send messages
        results = await telegram_service.send_message_to_workers(telegram_ids, message)
        
        # Count successes
        successful = sum(1 for success in results.values() if success)
        
        return {
            "success": True,
            "message": f"Message sent to {successful}/{len(telegram_ids)} workers",
            "results": results,
            "worker_names": worker_names
        }
        
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/telegram/broadcast")
async def broadcast_telegram_message(data: Dict[str, Any]):
    """Broadcast a message to all workers with Telegram"""
    try:
        message = data.get('message', '')
        
        if not message:
            raise HTTPException(status_code=400, detail="message is required")
        
        # Get all workers with Telegram IDs
        workers = db.get_support_workers()
        telegram_ids = []
        worker_names = []
        
        for worker in workers:
            if worker.get('telegram') and worker.get('status') == 'Active':
                telegram_ids.append(str(worker['telegram']))
                worker_names.append(worker.get('full_name', 'Unknown'))
        
        if not telegram_ids:
            raise HTTPException(status_code=400, detail="No workers with Telegram IDs found")
        
        # Broadcast message
        results = await telegram_service.broadcast_to_all_workers(telegram_ids, message)
        
        # Count successes
        successful = sum(1 for success in results.values() if success)
        
        return {
            "success": True,
            "message": f"Broadcast sent to {successful}/{len(telegram_ids)} workers",
            "results": results,
            "worker_count": len(telegram_ids),
            "worker_names": worker_names
        }
        
    except Exception as e:
        logger.error(f"Error broadcasting Telegram message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/telegram/notify-coordinators")
async def notify_coordinators(data: Dict[str, Any]):
    """Send a notification to coordinators"""
    try:
        message = data.get('message', '')
        
        if not message:
            raise HTTPException(status_code=400, detail="message is required")
        
        # Send to coordinators
        results = await telegram_service.send_message_to_coordinators(message)
        
        if not results:
            raise HTTPException(status_code=400, detail="No coordinators configured")
        
        # Count successes
        successful = sum(1 for success in results.values() if success)
        
        return {
            "success": True,
            "message": f"Notification sent to {successful}/{len(results)} coordinators",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error notifying coordinators: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/telegram/shift-notification")
async def send_shift_notification(data: Dict[str, Any]):
    """Send shift notification to a worker"""
    try:
        worker_id = data.get('worker_id')
        shift_details = data.get('shift_details', {})
        
        if not worker_id or not shift_details:
            raise HTTPException(status_code=400, detail="worker_id and shift_details are required")
        
        # Get worker telegram ID
        workers = db.get_support_workers()
        worker = next((w for w in workers if str(w['id']) == str(worker_id)), None)
        
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        if not worker.get('telegram'):
            raise HTTPException(status_code=400, detail="Worker does not have Telegram configured")
        
        # Send notification
        success = await telegram_service.send_shift_notification(str(worker['telegram']), shift_details)
        
        return {
            "success": success,
            "message": f"Shift notification {'sent' if success else 'failed'} to {worker.get('full_name', 'Unknown')}"
        }
        
    except Exception as e:
        logger.error(f"Error sending shift notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/calendar/events")
async def create_calendar_event(event_data: dict):
    """Create a new event in Google Calendar"""
    try:
        # Validate required fields
        required_fields = ['calendar_id', 'summary', 'start', 'end']
        for field in required_fields:
            if field not in event_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Create the event
        created_event = calendar_service.create_calendar_event(
            calendar_id=event_data['calendar_id'],
            event_data=event_data
        )
        
        if created_event:
            return {
                "success": True,
                "event": created_event,
                "message": "Event created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create event")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating calendar event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/calendar/create-appointment")
async def create_appointment(appointment_data: dict):
    """Create an appointment in Google Calendar for a participant"""
    try:
        # Validate required fields
        required_fields = ['calendarId', 'title', 'date', 'startTime', 'endTime']
        for field in required_fields:
            if field not in appointment_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Get participant name for calendar title
        participant_name = appointment_data.get('participantName', 'Participant')
        
        # Create event data for Google Calendar
        date_str = appointment_data['date']
        start_time = appointment_data['startTime']
        end_time = appointment_data['endTime']
        
        # Combine date and time
        start_datetime = f"{date_str}T{start_time}:00"
        end_datetime = f"{date_str}T{end_time}:00"
        
        # Create the calendar event
        event_data = {
            'summary': f"{participant_name} - {appointment_data['title']}",
            'description': appointment_data.get('description', ''),
            'start': start_datetime,
            'end': end_datetime
        }
        
        # Use the selected calendar or primary as fallback
        calendar_id = appointment_data.get('calendarId', 'primary')
        created_event = calendar_service.create_calendar_event(
            calendar_id=calendar_id,
            event_data=event_data
        )
        
        if created_event:
            return {
                "success": True,
                "message": "Appointment created successfully",
                "event_id": created_event.get('id'),
                "event_url": created_event.get('htmlLink')
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create appointment")
            
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/calendar/list")
async def list_calendars():
    """Get list of available calendars"""
    try:
        calendars = calendar_service.get_calendars()
        return {
            "success": True,
            "calendars": calendars
        }
    except Exception as e:
        logger.error(f"Error listing calendars: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# AI CHAT ASSISTANT ROUTES
# ============================================

# Initialize OpenAI client (will be None if API key not set)
openai_client = None
try:
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        openai_client = OpenAI(api_key=api_key)
        logger.info("OpenAI client initialized successfully")
    else:
        logger.warning("OPENAI_API_KEY not found in environment. AI chat will not be available.")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")

@api_router.post("/chat")
async def chat_with_ai(data: Dict[str, Any]):
    """AI assistant for roster questions"""
    try:
        if not openai_client:
            raise HTTPException(
                status_code=503, 
                detail="AI chat is not configured. Please set OPENAI_API_KEY in your environment variables."
            )
        
        question = data.get('question', '')
        if not question:
            raise HTTPException(status_code=400, detail="question is required")
        
        # Gather context: workers, availability, roster data
        workers = db.get_support_workers()
        participants = db.get_participants()
        roster_data = ROSTER_DATA.get('weekA', {})  # Use current week
        
        # Build context string with detailed worker information
        worker_info = []
        for w in workers[:45]:  # Include more workers for comprehensive queries
            worker_id = w.get('id')
            
            # Get availability for this worker
            availability_text = "No availability set"
            unavailability_text = ""
            if worker_id:
                try:
                    # Get regular availability rules
                    avail_rules = db.get_availability_rules(worker_id)
                    if avail_rules:
                        # Group by weekday
                        by_day = defaultdict(list)
                        for rule in avail_rules:
                            weekday = rule.get('weekday', 0)
                            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                            day_name = day_names[weekday] if 0 <= weekday <= 6 else 'Unknown'
                            
                            if rule.get('is_full_day'):
                                by_day[day_name].append('all day')
                            else:
                                from_time = rule.get('from_time', '')
                                to_time = rule.get('to_time', '')
                                by_day[day_name].append(f"{from_time}-{to_time}")
                        
                        # Format availability text
                        avail_parts = [f"{day}: {', '.join(times)}" for day, times in sorted(by_day.items())]
                        availability_text = "; ".join(avail_parts) if avail_parts else "Available but no times set"
                    
                    # Check for unavailability periods
                    unavail_periods = db.get_unavailability_periods(worker_id)
                    if unavail_periods:
                        today = datetime.now().date()
                        active_periods = []
                        for period in unavail_periods:
                            from_date_str = period.get('from_date', '')
                            to_date_str = period.get('to_date', '')
                            reason = period.get('reason', 'Leave')
                            
                            try:
                                from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
                                to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()
                                
                                # Only include current or future unavailability
                                if to_date >= today:
                                    active_periods.append(f"{from_date_str} to {to_date_str} ({reason})")
                            except:
                                pass
                        
                        if active_periods:
                            unavailability_text = f" | UNAVAILABLE: {'; '.join(active_periods)}"
                except Exception as e:
                    availability_text = f"Error fetching availability: {str(e)}"
            
            sex = w.get('sex', 'N/A')
            worker_info.append(
                f"- {w.get('full_name', 'Unknown')} ({sex}, ID: {worker_id}, "
                f"Max hours: {w.get('max_hours', 'N/A')}/week, "
                f"Current hours: {w.get('current_hours', 0)}, "
                f"Car: {'Yes' if w.get('car') else 'No'}, "
                f"Skills: {w.get('skills', 'None')}, "
                f"Availability: {availability_text}{unavailability_text})"
            )
        
        participant_info = [
            f"- {p.get('name', 'Unknown')} (Code: {p.get('code', 'N/A')}, "
            f"Support ratio: {p.get('support_ratio', '1:1')})"
            for p in participants[:10]
        ]
        
        # Get current roster/shift assignments  
        # Build worker ID to name mapping
        worker_map = {str(w.get('id')): w.get('full_name', 'Unknown') for w in workers}
        participant_map = {p.get('code'): p.get('name', p.get('full_name', 'Unknown')) for p in participants}
        
        shift_assignments = []
        try:
            # Get current roster from global ROSTER_DATA
            roster_response = ROSTER_DATA.get('roster', {})
            logger.info(f"AI Chat - Roster keys: {list(roster_response.keys()) if roster_response else 'None'}")
            
            if roster_response and 'data' in roster_response:
                roster_data_dict = roster_response['data']
                logger.info(f"AI Chat - Found {len(roster_data_dict)} participants in roster")
                
                # Roster structure: { participant_code: { date: [shifts] } }
                for participant_code, dates_dict in roster_data_dict.items():
                    # Skip entries that aren't participant codes (e.g., stray date keys)
                    if not isinstance(dates_dict, dict):
                        continue
                    if participant_code.startswith('2025-'):  # Skip date keys
                        continue
                        
                    participant_name = participant_map.get(participant_code, participant_code)
                    for date_str, shifts in dates_dict.items():
                        if isinstance(shifts, list):
                            for shift in shifts:
                                worker_ids = shift.get('workers', [])
                                worker_names = [worker_map.get(str(wid), f'ID{wid}') for wid in worker_ids]
                                if worker_names:
                                    shift_time = f"{shift.get('startTime', '')}-{shift.get('endTime', '')}"
                                    shift_assignments.append(
                                        f"{date_str}: {participant_name} with {', '.join(worker_names)} ({shift_time})"
                                    )
                logger.info(f"AI Chat - Built {len(shift_assignments)} shift assignments")
        except Exception as e:
            logger.error(f"Error parsing roster for AI: {e}", exc_info=True)
        
        shift_info = "\n".join(shift_assignments[:150]) if shift_assignments else "No current shifts scheduled"
        
        # Pre-calculate statistics for accuracy
        male_count = len([w for w in workers if w.get('sex') == 'M'])
        female_count = len([w for w in workers if w.get('sex') == 'F'])
        total_workers = len(workers)
        
        stats_summary = f"""STATISTICS (use these exact numbers, don't count):
- Total workers: {total_workers}
- Male workers: {male_count}
- Female workers: {female_count}
"""
        
        context = f"""Roster assistant. Answer ONLY what was asked. NO explanations, apologies, or extra context unless requested.

{stats_summary}

WORKERS:
{chr(10).join(worker_info)}

PARTICIPANTS:
{chr(10).join(participant_info)}

CURRENT SHIFTS:
{shift_info}

RULES:
1. Use STATISTICS section for counting questions - NEVER count manually
2. If worker has "UNAVAILABLE:" they are NOT available during those dates
3. State facts only - no "I apologize", "unfortunately", "please note"
4. Answer the specific question asked - nothing more
5. For unavailable workers: state when they'll be back (e.g., "Rita unavailable until Oct 28")
6. Don't explain what you can/cannot do - just answer or say "No data"

RESPONSE FORMAT:
- Counting questions: Use STATISTICS numbers exactly as shown
- Worker availability: "[Name] available [days/times]" OR "[Name] unavailable until [date]"
- "Who does [worker] work with?": Extract UNIQUE participant names from CURRENT SHIFTS - no dates unless asked
- "Who works with [participant]?": Extract UNIQUE worker names from CURRENT SHIFTS - no dates unless asked
- "What shifts/when": Then include dates and times
- Multiple names: Simple list or comma-separated, no bullets unless 5+ items

Be direct. Extract what's asked. No extra info.
"""
        
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-effective model
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": question}
            ],
            temperature=0.3,  # Lower temperature for more focused, deterministic responses
            max_tokens=400  # Allow slightly longer responses for multiple shifts
        )
        
        answer = response.choices[0].message.content
        
        return {
            "success": True,
            "answer": answer,
            "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)