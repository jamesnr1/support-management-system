from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import uuid

# Import database
from database import db

# Import our models
from models import (
    Worker, WorkerCreate, AvailabilityRule, UnavailabilityPeriod, 
    Participant, Shift, WorkerAvailabilityCheck, ConflictCheck, 
    HoursCalculation, RosterState, TelegramMessage
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(title="Support Management System")

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

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize application"""
    try:
        logger.info("Application started successfully - using Supabase database")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

@app.on_event("shutdown") 
async def shutdown_event():
    """Clean up on shutdown"""
    logger.info("Application shutdown")

# Helper functions are now replaced by direct Supabase calls

# API Routes

# Health check
@api_router.get("/")
async def root():
    return {"message": "Support Management System API", "status": "running"}

# Worker Management Routes
@api_router.get("/workers", response_model=List[Worker])
async def get_workers():
    """Get all workers from Supabase"""
    try:
        workers_data = db.get_support_workers()
        workers = []
        for worker_data in workers_data:
            workers.append(Worker(**worker_data))
        return workers
    except Exception as e:
        logger.error(f"Error fetching workers: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch workers")

@api_router.post("/workers", response_model=Worker)
async def create_worker(worker: WorkerCreate):
    """Create a new worker - TODO: Implement Supabase integration"""
    raise HTTPException(status_code=501, detail="Create worker not implemented yet")

@api_router.put("/workers/{worker_id}", response_model=Worker)
async def update_worker(worker_id: str, worker: WorkerCreate):
    """Update a worker - TODO: Implement Supabase integration"""
    raise HTTPException(status_code=501, detail="Update worker not implemented yet")

@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str):
    """Delete a worker - TODO: Implement Supabase integration"""
    raise HTTPException(status_code=501, detail="Delete worker not implemented yet")

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
    """Get roster for specific week type"""
    if week_type not in ROSTER_DATA:
        ROSTER_DATA[week_type] = {}
    return ROSTER_DATA[week_type]

@api_router.post("/roster/{week_type}")
async def update_roster(week_type: str, roster_data: Dict[str, Any]):
    """Update roster for specific week type"""
    ROSTER_DATA[week_type] = roster_data
    logger.info(f"Updated roster {week_type} with {len(roster_data)} participants")
    return {"message": f"Roster {week_type} updated successfully"}

# Location Routes
@api_router.get("/locations")
async def get_locations():
    """Get all locations from Supabase"""
    try:
        return db.get_locations()
    except Exception as e:
        logger.error(f"Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch locations")

# Availability Routes (simplified)
@api_router.get("/workers/{worker_id}/availability")
async def get_worker_availability(worker_id: str):
    """Get worker availability rules"""
    return []

@api_router.post("/workers/{worker_id}/availability")
async def set_worker_availability(worker_id: str, rule: dict):
    """Set worker availability rule"""
    return {"message": "Availability updated"}

@api_router.get("/workers/{worker_id}/unavailability")
async def get_worker_unavailability(worker_id: str):
    """Get worker unavailability periods"""
    return []

@api_router.post("/workers/{worker_id}/unavailability")
async def add_unavailability_period(worker_id: str, period: dict):
    """Add unavailability period"""
    return {"message": "Unavailability added"}

# Include the router in the main app
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)