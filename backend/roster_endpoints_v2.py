"""
New roster endpoints for Roster/Planner structure

This module adds new endpoints while maintaining backward compatibility.
To integrate: Add these endpoints to server.py
"""
from fastapi import HTTPException, APIRouter
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# This will be imported from server.py
ROSTER_DATA = {}
ROSTER_FILE = Path(__file__).parent / 'roster_data.json'

def load_roster_v2():
    """Load roster data in new format"""
    global ROSTER_DATA
    try:
        if ROSTER_FILE.exists():
            with open(ROSTER_FILE, 'r') as f:
                ROSTER_DATA = json.load(f)
            logger.info(f"Loaded roster data from {ROSTER_FILE}")
        else:
            ROSTER_DATA = {
                "roster": {"start_date": "", "end_date": "", "data": {}},
                "planner": {
                    "week1": {"start_date": "", "end_date": "", "data": {}},
                    "week2": {"start_date": "", "end_date": "", "data": {}},
                    "week3": {"start_date": "", "end_date": "", "data": {}},
                    "week4": {"start_date": "", "end_date": "", "data": {}}
                }
            }
            logger.warning("Roster file not found, using empty structure")
    except Exception as e:
        logger.error(f"Error loading roster: {e}")
        ROSTER_DATA = {
            "roster": {"start_date": "", "end_date": "", "data": {}},
            "planner": {
                "week1": {"start_date": "", "end_date": "", "data": {}},
                "week2": {"start_date": "", "end_date": "", "data": {}},
                "week3": {"start_date": "", "end_date": "", "data": {}},
                "week4": {"start_date": "", "end_date": "", "data": {}}
            }
        }

def save_roster_v2():
    """Save roster data"""
    try:
        with open(ROSTER_FILE, 'w') as f:
            json.dump(ROSTER_DATA, f, indent=2)
        logger.info("Roster data saved successfully")
    except Exception as e:
        logger.error(f"Error saving roster: {e}")
        raise

# New Roster API Router
roster_v2_router = APIRouter(prefix="/api/roster-v2")

@roster_v2_router.get("/current")
async def get_current_roster():
    """Get current week roster"""
    try:
        return ROSTER_DATA.get("roster", {"start_date": "", "end_date": "", "data": {}})
    except Exception as e:
        logger.error(f"Error getting current roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@roster_v2_router.get("/planner/{week_num}")
async def get_planner_week(week_num: int):
    """Get a specific planner week (1-4)"""
    try:
        if week_num < 1 or week_num > 4:
            raise HTTPException(status_code=400, detail="Week number must be 1-4")
        
        week_key = f"week{week_num}"
        planner = ROSTER_DATA.get("planner", {})
        return planner.get(week_key, {"start_date": "", "end_date": "", "data": {}})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting planner week {week_num}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@roster_v2_router.post("/current")
async def update_current_roster(roster_update: Dict[str, Any]):
    """Update current week roster"""
    try:
        # Validate structure
        if "start_date" not in roster_update or "end_date" not in roster_update or "data" not in roster_update:
            raise HTTPException(status_code=400, detail="Invalid roster structure")
        
        ROSTER_DATA["roster"] = roster_update
        save_roster_v2()
        
        logger.info(f"Updated current roster: {roster_update['start_date']} to {roster_update['end_date']}")
        return {"message": "Current roster updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating current roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@roster_v2_router.post("/planner/{week_num}")
async def update_planner_week(week_num: int, week_update: Dict[str, Any]):
    """Update a specific planner week"""
    try:
        if week_num < 1 or week_num > 4:
            raise HTTPException(status_code=400, detail="Week number must be 1-4")
        
        # Validate structure
        if "start_date" not in week_update or "end_date" not in week_update or "data" not in week_update:
            raise HTTPException(status_code=400, detail="Invalid week structure")
        
        week_key = f"week{week_num}"
        if "planner" not in ROSTER_DATA:
            ROSTER_DATA["planner"] = {}
        
        ROSTER_DATA["planner"][week_key] = week_update
        save_roster_v2()
        
        logger.info(f"Updated planner {week_key}: {week_update['start_date']} to {week_update['end_date']}")
        return {"message": f"Planner week {week_num} updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating planner week {week_num}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@roster_v2_router.post("/planner/{week_num}/set-dates")
async def set_planner_dates(week_num: int, dates: Dict[str, str]):
    """Set start and end dates for a planner week"""
    try:
        if week_num < 1 or week_num > 4:
            raise HTTPException(status_code=400, detail="Week number must be 1-4")
        
        if "start_date" not in dates or "end_date" not in dates:
            raise HTTPException(status_code=400, detail="Must provide start_date and end_date")
        
        # Validate dates are Monday-Sunday
        start = datetime.strptime(dates["start_date"], '%Y-%m-%d')
        end = datetime.strptime(dates["end_date"], '%Y-%m-%d')
        
        if start.weekday() != 0:  # Monday is 0
            raise HTTPException(status_code=400, detail="Start date must be a Monday")
        
        if end.weekday() != 6:  # Sunday is 6
            raise HTTPException(status_code=400, detail="End date must be a Sunday")
        
        if (end - start).days != 6:
            raise HTTPException(status_code=400, detail="Week must be exactly 7 days (Monday-Sunday)")
        
        week_key = f"week{week_num}"
        if "planner" not in ROSTER_DATA:
            ROSTER_DATA["planner"] = {}
        if week_key not in ROSTER_DATA["planner"]:
            ROSTER_DATA["planner"][week_key] = {"start_date": "", "end_date": "", "data": {}}
        
        ROSTER_DATA["planner"][week_key]["start_date"] = dates["start_date"]
        ROSTER_DATA["planner"][week_key]["end_date"] = dates["end_date"]
        save_roster_v2()
        
        logger.info(f"Set dates for planner {week_key}: {dates['start_date']} to {dates['end_date']}")
        return {"message": f"Dates set for planner week {week_num}"}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        logger.error(f"Error setting planner dates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@roster_v2_router.post("/copy-to-planner/{week_num}")
async def copy_roster_to_planner(week_num: int, dates: Optional[Dict[str, str]] = None):
    """Copy current roster to a planner week, optionally with new dates"""
    try:
        if week_num < 1 or week_num > 4:
            raise HTTPException(status_code=400, detail="Week number must be 1-4")
        
        current_roster = ROSTER_DATA.get("roster", {})
        if not current_roster.get("data"):
            raise HTTPException(status_code=400, detail="No current roster to copy")
        
        week_key = f"week{week_num}"
        if "planner" not in ROSTER_DATA:
            ROSTER_DATA["planner"] = {}
        
        # Copy roster data
        planner_week = {
            "start_date": dates.get("start_date") if dates else "",
            "end_date": dates.get("end_date") if dates else "",
            "data": json.loads(json.dumps(current_roster["data"]))  # Deep copy
        }
        
        # If dates provided, update shift dates
        if dates and dates.get("start_date"):
            # Calculate date offset
            old_start = datetime.strptime(current_roster["start_date"], '%Y-%m-%d')
            new_start = datetime.strptime(dates["start_date"], '%Y-%m-%d')
            offset = (new_start - old_start).days
            
            # Update dates in shifts
            for participant_code, participant_dates in planner_week["data"].items():
                new_participant_dates = {}
                for old_date_str, shifts in participant_dates.items():
                    old_date = datetime.strptime(old_date_str, '%Y-%m-%d')
                    new_date = old_date + timedelta(days=offset)
                    new_date_str = new_date.strftime('%Y-%m-%d')
                    
                    # Update date in each shift
                    for shift in shifts:
                        shift["date"] = new_date_str
                    
                    new_participant_dates[new_date_str] = shifts
                
                planner_week["data"][participant_code] = new_participant_dates
        
        ROSTER_DATA["planner"][week_key] = planner_week
        save_roster_v2()
        
        logger.info(f"Copied roster to planner {week_key}")
        return {"message": f"Roster copied to planner week {week_num}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error copying roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))

