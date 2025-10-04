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
        
        # Define date ranges for Week A and Week B (with date-based filtering)
        if week_type == 'weekA':
            start_date = date(2025, 9, 22)
            end_date = date(2025, 9, 28)
        elif week_type == 'weekB':
            start_date = date(2025, 9, 29)
            end_date = date(2025, 10, 5)
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
        
        # Move planner to roster (keeping the week_type)
        ROSTER_DATA["roster"] = {
            "week_type": planner.get("week_type", "weekA"),
            "start_date": planner.get("start_date", ""),
            "end_date": planner.get("end_date", ""),
            "data": planner.get("data", {})
        }
        
        # Clear planner
        ROSTER_DATA["planner"] = {
            "week_type": "weekA",  # Default for empty planner
            "start_date": "",
            "end_date": "",
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
        return rules
    except Exception as e:
        logger.error(f"Error fetching availability: {e}")
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
        roster_data = roster_state.get('weekA', {})  # Use current week
        
        # Build context string
        worker_info = []
        for w in workers[:20]:  # Limit to prevent token overflow
            avail_summary = "availability data available" if w.get('id') else "no availability"
            worker_info.append(
                f"- {w.get('full_name', 'Unknown')} (ID: {w.get('id')}, "
                f"Max hours: {w.get('max_hours', 'N/A')}, "
                f"Car: {w.get('car', 'No')}, "
                f"Skills: {w.get('skills', 'None')}, "
                f"{avail_summary})"
            )
        
        participant_info = [
            f"- {p.get('name', 'Unknown')} (Code: {p.get('code', 'N/A')}, "
            f"Support ratio: {p.get('support_ratio', '1:1')})"
            for p in participants[:10]
        ]
        
        context = f"""You are a roster management assistant for a support services organization.

WORKERS:
{chr(10).join(worker_info)}

PARTICIPANTS:
{chr(10).join(participant_info)}

CURRENT WEEK: Week A

Your role is to:
- Answer questions about worker availability
- Suggest workers for specific shifts based on their skills, hours, and availability
- Identify scheduling conflicts
- Provide coverage recommendations
- Help with ratio requirements (1:1, 2:1)

Keep answers concise and helpful. Use bullet points when listing workers or suggestions.
"""
        
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-effective model
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": question}
            ],
            temperature=0.7,
            max_tokens=500
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