from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import asyncio

# Import our modules
from .database import Database, init_database
from .models import (
    Worker, WorkerCreate, AvailabilityRule, UnavailabilityPeriod, 
    Participant, Shift, WorkerAvailabilityCheck, ConflictCheck, 
    HoursCalculation, RosterState, TelegramMessage
)
from .worker_logic import (
    get_available_workers, check_worker_conflicts, calculate_worker_hours,
    validate_fair_work, calculate_shift_hours
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(title="Support Worker Rostering System")

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

# Global roster state (in production, this would be in Redis or similar)
ROSTER_STATE = RosterState()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and load initial data"""
    try:
        await init_database()
        # Load initial data
        await load_participants()
        await load_workers()
        await load_locations()
        logger.info("Application started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connections"""
    await Database.close_pool()

# Helper functions
async def load_participants():
    """Load participants from database"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM participants")
        ROSTER_STATE.participants = [Participant(**dict(row)) for row in rows]

async def load_workers():
    """Load workers from database"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM support_workers WHERE status = 'Active'")
        ROSTER_STATE.workers = [Worker(**dict(row)) for row in rows]

async def load_locations():
    """Load locations from database"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM locations")
        ROSTER_STATE.locations = [dict(row) for row in rows]

# API Routes

# Health check
@api_router.get("/")
async def root():
    return {"message": "Support Worker Rostering System API", "status": "running"}

# Worker Management Routes
@api_router.get("/workers", response_model=List[Worker])
async def get_workers():
    """Get all active workers"""
    await load_workers()  # Refresh from DB
    return ROSTER_STATE.workers

@api_router.post("/workers", response_model=Worker)
async def create_worker(worker: WorkerCreate):
    """Create a new worker"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        try:
            worker_id = await conn.fetchval("""
                INSERT INTO support_workers (code, full_name, email, phone, max_hours, car, skills, sex, telegram)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            """, worker.code, worker.full_name, worker.email, worker.phone, 
            worker.max_hours, worker.car, worker.skills, worker.sex, worker.telegram)
            
            # Get the created worker
            row = await conn.fetchrow("SELECT * FROM support_workers WHERE id = $1", worker_id)
            created_worker = Worker(**dict(row))
            
            # Refresh cache
            await load_workers()
            return created_worker
        except Exception as e:
            logger.error(f"Error creating worker: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/workers/{worker_id}", response_model=Worker)
async def update_worker(worker_id: int, worker: WorkerCreate):
    """Update a worker"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        try:
            await conn.execute("""
                UPDATE support_workers 
                SET full_name = $2, email = $3, phone = $4, max_hours = $5, 
                    car = $6, skills = $7, sex = $8, telegram = $9
                WHERE id = $1
            """, worker_id, worker.full_name, worker.email, worker.phone,
            worker.max_hours, worker.car, worker.skills, worker.sex, worker.telegram)
            
            # Get updated worker
            row = await conn.fetchrow("SELECT * FROM support_workers WHERE id = $1", worker_id)
            if not row:
                raise HTTPException(status_code=404, detail="Worker not found")
            
            updated_worker = Worker(**dict(row))
            await load_workers()
            return updated_worker
        except Exception as e:
            logger.error(f"Error updating worker: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: int):
    """Delete a worker (set to inactive)"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        try:
            await conn.execute("UPDATE support_workers SET status = 'Inactive' WHERE id = $1", worker_id)
            await load_workers()
            return {"message": "Worker deactivated successfully"}
        except Exception as e:
            logger.error(f"Error deleting worker: {e}")
            raise HTTPException(status_code=400, detail=str(e))

# Availability Management Routes
@api_router.get("/workers/{worker_id}/availability", response_model=List[AvailabilityRule])
async def get_worker_availability(worker_id: int):
    """Get worker availability rules"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM availability_rule WHERE worker_id = $1", worker_id)
        return [AvailabilityRule(**dict(row)) for row in rows]

@api_router.post("/workers/{worker_id}/availability", response_model=AvailabilityRule)
async def set_worker_availability(worker_id: int, rule: AvailabilityRule):
    """Set worker availability rule"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        try:
            # Delete existing rule for this weekday
            await conn.execute("DELETE FROM availability_rule WHERE worker_id = $1 AND weekday = $2", 
                              worker_id, rule.weekday)
            
            # Insert new rule
            rule_id = await conn.fetchval("""
                INSERT INTO availability_rule (worker_id, weekday, from_time, to_time, is_full_day, wraps_midnight)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            """, worker_id, rule.weekday, rule.from_time, rule.to_time, rule.is_full_day, rule.wraps_midnight)
            
            # Return created rule
            row = await conn.fetchrow("SELECT * FROM availability_rule WHERE id = $1", rule_id)
            return AvailabilityRule(**dict(row))
        except Exception as e:
            logger.error(f"Error setting availability: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/workers/{worker_id}/unavailability", response_model=List[UnavailabilityPeriod])
async def get_worker_unavailability(worker_id: int):
    """Get worker unavailability periods"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM unavailability_periods WHERE worker_id = $1", worker_id)
        return [UnavailabilityPeriod(**dict(row)) for row in rows]

@api_router.post("/workers/{worker_id}/unavailability", response_model=UnavailabilityPeriod)
async def add_unavailability_period(worker_id: int, period: UnavailabilityPeriod):
    """Add unavailability period"""
    pool = await Database.get_connection()
    async with pool.acquire() as conn:
        try:
            period_id = await conn.fetchval("""
                INSERT INTO unavailability_periods (worker_id, from_date, to_date, reason)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            """, worker_id, period.from_date, period.to_date, period.reason)
            
            row = await conn.fetchrow("SELECT * FROM unavailability_periods WHERE id = $1", period_id)
            return UnavailabilityPeriod(**dict(row))
        except Exception as e:
            logger.error(f"Error adding unavailability: {e}")
            raise HTTPException(status_code=400, detail=str(e))

# Participant Management Routes
@api_router.get("/participants", response_model=List[Participant])
async def get_participants():
    """Get all participants"""
    await load_participants()
    return ROSTER_STATE.participants

# Scheduling Routes
@api_router.post("/check-availability")
async def check_worker_availability(check: WorkerAvailabilityCheck):
    """Check if workers are available for a shift"""
    try:
        available_workers = await get_available_workers(check.shift_start, check.shift_end)
        return {"available_workers": available_workers}
    except Exception as e:
        logger.error(f"Error checking availability: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/check-conflicts")
async def check_conflicts(check: ConflictCheck):
    """Check for scheduling conflicts"""
    try:
        conflicts = await check_worker_conflicts(
            check.worker_id, check.shift_date, check.start_time, check.end_time, 
            ROSTER_STATE.rosters
        )
        return conflicts
    except Exception as e:
        logger.error(f"Error checking conflicts: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/calculate-hours/{worker_id}")
async def calculate_hours(worker_id: int):
    """Calculate worker hours across all rosters"""
    try:
        hours = await calculate_worker_hours(worker_id, ROSTER_STATE.rosters)
        return hours
    except Exception as e:
        logger.error(f"Error calculating hours: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/validate-fair-work")
async def validate_shift(check: ConflictCheck):
    """Validate shift against fair work regulations"""
    try:
        validation = validate_fair_work(
            check.worker_id, check.shift_date, check.start_time, check.end_time,
            ROSTER_STATE.rosters
        )
        return validation
    except Exception as e:
        logger.error(f"Error validating fair work: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Roster Management Routes
@api_router.get("/roster/{week_type}")
async def get_roster(week_type: str):
    """Get roster for specific week type"""
    if week_type not in ROSTER_STATE.rosters:
        ROSTER_STATE.rosters[week_type] = {}
    return ROSTER_STATE.rosters[week_type]

@api_router.post("/roster/{week_type}")
async def update_roster(week_type: str, roster_data: Dict[str, Any]):
    """Update roster for specific week type"""
    ROSTER_STATE.rosters[week_type] = roster_data
    return {"message": f"Roster {week_type} updated successfully"}

# Telegram Integration Routes
@api_router.post("/telegram/send")
async def send_telegram_message(message: TelegramMessage):
    """Send Telegram message to worker"""
    # This would integrate with Telegram Bot API
    # For now, just log the message
    logger.info(f"Telegram message to worker {message.worker_id}: {message.message}")
    return {"message": "Message sent successfully", "urgent": message.urgent}

@api_router.get("/telegram/workers")
async def get_workers_with_telegram():
    """Get workers who have Telegram configured"""
    workers_with_telegram = [w for w in ROSTER_STATE.workers if w.telegram]
    return workers_with_telegram

# Location Routes
@api_router.get("/locations")
async def get_locations():
    """Get all locations"""
    await load_locations()
    return ROSTER_STATE.locations

# Include the router in the main app
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)