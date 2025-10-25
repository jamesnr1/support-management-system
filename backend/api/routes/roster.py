"""Roster management endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, Optional
from database import SupabaseDatabase
from api.dependencies import get_db, require_admin
from core.security import get_rate_limiter
from core.logging_config import get_logger
from validation_rules import validate_roster_data
from models import RosterState
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/roster", tags=["roster"])
limiter = get_rate_limiter()
logger = get_logger("roster")

# Global roster state - we'll use a simple dict for now
ROSTER_DATA = {
    'roster': {},
    'planner': {},
    'roster_next': {},
    'roster_after': {}
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
    next_monday = next_monday.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get Sunday of next week
    next_sunday = next_monday + timedelta(days=6)
    next_sunday = next_sunday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    return next_monday.strftime('%Y-%m-%d'), next_sunday.strftime('%Y-%m-%d')

def check_and_transition_weeks():
    """Check if we need to transition weeks (runs on Sunday)"""
    try:
        now = datetime.now()
        if now.weekday() == 6:  # Sunday
            logger.info("sunday_detected", message="Checking for week transition")
            
            # Move planner to roster
            planner = ROSTER_DATA.get("planner", {})
            if planner and planner.get("data"):
                ROSTER_DATA["roster"] = planner.copy()
                logger.info("planner_to_roster", message="Moved planner to roster")
            
            # Move next week to planner
            next_week = ROSTER_DATA.get("roster_next", {})
            if next_week and next_week.get("data"):
                ROSTER_DATA["planner"] = next_week.copy()
                logger.info("next_to_planner", message="Moved next week to planner")
            
            # Clear next week
            ROSTER_DATA["roster_next"] = {}
            logger.info("week_transition_completed")
        else:
            logger.debug("not_sunday", weekday=now.weekday())
    except Exception as e:
        logger.error("week_transition_failed", error=str(e))

@router.get("/{week_type}")
@limiter.limit("30/minute")
async def get_roster(
    request: Request,
    week_type: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get roster for specific week type from database"""
    try:
        # Check and perform week transition if needed
        # check_and_transition_weeks()  # TODO: Implement this function
        
        # Get data from database
        week_data = db.get_roster_data(week_type)
        
        if week_data:
            logger.info("roster_fetched", week_type=week_type, from_db=True)
            return week_data
        else:
            # Fallback to in-memory data
            week_data = ROSTER_DATA.get(week_type, {})
            logger.info("roster_fetched", week_type=week_type, from_memory=True)
            return week_data
    except Exception as e:
        logger.error("roster_fetch_failed", week_type=week_type, error=str(e))
        return {}

@router.post("/{week_type}", dependencies=[require_admin()])
@limiter.limit("5/minute")
async def update_roster(
    request: Request,
    week_type: str,
    roster_data: Dict[str, Any],
    db: SupabaseDatabase = Depends(get_db)
):
    """Robust roster update with comprehensive validation"""
    try:
        # Handle roster structure (current, next, week after)
        if week_type in ['roster', 'roster_next', 'roster_after']:
            if not roster_data:
                raise HTTPException(status_code=400, detail="Roster data is required")
            
            # Validate roster data
            validation_result = validate_roster_data(roster_data, db.get_support_workers())
            
            if not validation_result.get('valid', False):
                errors = validation_result.get('errors', [])
                logger.warning("roster_validation_failed", 
                    week_type=week_type, 
                    errors=errors
                )
                raise HTTPException(
                    status_code=400, 
                    detail=f"Roster validation failed: {'; '.join(errors)}"
                )
            
            # Save to database
            success = db.save_roster_data(week_type, roster_data)
            if success:
                # Also update in-memory cache
                ROSTER_DATA[week_type] = roster_data
                logger.info("roster_updated", week_type=week_type)
                return {"message": f"{week_type} roster updated successfully"}
            else:
                raise HTTPException(status_code=500, detail="Failed to save roster data")
        
        elif week_type == 'planner':
            if not roster_data:
                raise HTTPException(status_code=400, detail="Planner data is required")
            
            # Save to database
            success = db.save_roster_data(week_type, roster_data)
            if success:
                # Also update in-memory cache
                ROSTER_DATA[week_type] = roster_data
                logger.info("planner_updated", week_type=week_type)
                return {"message": "Planner updated successfully"}
            else:
                raise HTTPException(status_code=500, detail="Failed to save planner data")
        
        else:
            raise HTTPException(status_code=400, detail=f"Invalid week type: {week_type}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("roster_update_failed", week_type=week_type, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to update roster: {str(e)}")

@router.post("/copy_to_planner", dependencies=[require_admin()])
@limiter.limit("5/minute")
async def copy_to_planner(request: Request, db: SupabaseDatabase = Depends(get_db)):
    """Copy roster to planner with week_type flip"""
    try:
        roster = ROSTER_DATA.get("roster", {})
        if not roster or not roster.get("data"):
            raise HTTPException(status_code=400, detail="No roster data to copy")
        
        # Copy roster to planner
        planner_data = roster.copy()
        ROSTER_DATA["planner"] = planner_data
        
        # Save to database
        success = db.save_roster_data("planner", planner_data)
        if success:
            logger.info("roster_copied_to_planner")
            return {"message": "Roster copied to planner successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save planner data")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("copy_to_planner_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transition_to_roster", dependencies=[require_admin()])
@limiter.limit("5/minute")
async def transition_to_roster(request: Request, db: SupabaseDatabase = Depends(get_db)):
    """Move planner to roster (Sunday automation)"""
    try:
        planner = ROSTER_DATA.get("planner", {})
        if not planner or not planner.get("data"):
            raise HTTPException(status_code=400, detail="No planner data to transition")
        
        # Move planner to roster
        ROSTER_DATA["roster"] = planner.copy()
        
        # Save to database
        success = db.save_roster_data("roster", planner)
        if success:
            logger.info("planner_transitioned_to_roster")
            return {"message": "Planner moved to roster successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save roster data")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("transition_to_roster_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{week_type}/validate")
@limiter.limit("10/minute")
async def validate_roster(
    request: Request,
    week_type: str,
    roster_data: Optional[Dict[str, Any]] = None,
    db: SupabaseDatabase = Depends(get_db)
):
    """Validate roster data"""
    try:
        # Use provided data or get from storage
        if roster_data is None:
            if week_type in ROSTER_DATA:
                roster_data = ROSTER_DATA[week_type]
            else:
                roster_data = db.get_roster_data(week_type)
        
        if not roster_data:
            raise HTTPException(status_code=400, detail=f"No data found for {week_type}")
        
        # Get workers for validation
        workers = db.get_support_workers()
        
        # Validate the roster
        validation_result = validate_roster_data(roster_data, workers)
        
        logger.info("roster_validated", 
            week_type=week_type,
            valid=validation_result.get('valid', False),
            error_count=len(validation_result.get('errors', []))
        )
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("roster_validation_failed", week_type=week_type, error=str(e))
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

def load_roster_data():
    """Load roster data from database on startup"""
    try:
        for week_type in ['roster', 'planner', 'roster_next', 'roster_after']:
            data = db.get_roster_data(week_type)
            if data:
                ROSTER_DATA[week_type] = data
                logger.info("roster_data_loaded", week_type=week_type)
    except Exception as e:
        logger.error("roster_data_load_failed", error=str(e))
