from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import uuid

# Import our modules
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

# MongoDB connection
client = None
db = None

# Global roster state
ROSTER_STATE = RosterState()

async def connect_to_mongo():
    """Create database connection"""
    global client, db
    try:
        client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
        db = client.rostering_db
        logger.info("Connected to MongoDB successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and load initial data"""
    try:
        await connect_to_mongo()
        await init_sample_data()
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
    await close_mongo_connection()

# Helper functions
async def init_sample_data():
    """Initialize sample data"""
    # Add locations
    locations_data = [
        {"name": "Glandore", "_id": "loc1"},
        {"name": "Plympton Park", "_id": "loc2"}
    ]
    
    for location in locations_data:
        existing = await db.locations.find_one({"_id": location["_id"]})
        if not existing:
            await db.locations.insert_one(location)
    
    # Add sample workers from SQL data
    workers_data = [
        {
            "_id": "worker1", 
            "code": "GAU001", 
            "full_name": "Gaumit Patel", 
            "email": "gaumit@example.com", 
            "phone": "0423123456", 
            "status": "Active",
            "skills": "Manual Handling, First Aid",
            "car": "Yes",
            "max_hours": 40
        },
        {
            "_id": "worker2", 
            "code": "VER001", 
            "full_name": "Pranvera (Vera) Ymeraj", 
            "email": "vera@example.com", 
            "phone": "0423234567", 
            "status": "Active",
            "skills": "Personal Care, Community Support",
            "car": "Yes",
            "max_hours": 35
        },
        {
            "_id": "worker3", 
            "code": "HAP001", 
            "full_name": "Harshkumar (Happy) Modi", 
            "email": "happy@example.com", 
            "phone": "0423345678", 
            "status": "Active",
            "skills": "Manual Handling, Driving",
            "car": "Yes",
            "max_hours": 40
        },
        {
            "_id": "worker4", 
            "code": "SAN001", 
            "full_name": "Sanjaykumar (Sanjay) Patel", 
            "email": "sanjay@example.com", 
            "phone": "0423456789", 
            "status": "Active",
            "skills": "Personal Care, First Aid",
            "car": "No",
            "max_hours": 30
        },
        {
            "_id": "worker5", 
            "code": "KRU001", 
            "full_name": "Krunalkumar (Krunal) Patel", 
            "email": "krunal@example.com", 
            "phone": "0423567890", 
            "status": "Active",
            "skills": "Community Access, Driving",
            "car": "Yes",
            "max_hours": 40
        },
        {
            "_id": "worker6", 
            "code": "CHA001", 
            "full_name": "Chaynne Humphrys", 
            "email": "chaynne@example.com", 
            "phone": "0423678901", 
            "status": "Active",
            "skills": "Personal Care, Community Support",
            "car": "No",
            "max_hours": 25
        },
        {
            "_id": "worker7", 
            "code": "MEE001", 
            "full_name": "Meena Sapkota", 
            "email": "meena@example.com", 
            "phone": "0423789012", 
            "status": "Active",
            "skills": "Personal Care, ADL Support",
            "car": "No",
            "max_hours": 30
        },
        {
            "_id": "worker8", 
            "code": "MIH001", 
            "full_name": "Mihir Patel", 
            "email": "mihir@example.com", 
            "phone": "0423890123", 
            "status": "Active",
            "skills": "Manual Handling, Community Access",
            "car": "Yes",
            "max_hours": 35
        }
    ]
    
    for worker in workers_data:
        existing = await db.workers.find_one({"_id": worker["_id"]})
        if not existing:
            await db.workers.insert_one(worker)
    
    # Add participants
    participants_data = [
        {"code": "LIB001", "full_name": "Libby", "location": "loc1", "default_ratio": "2:1", "_id": str(uuid.uuid4())},
        {"code": "JAM001", "full_name": "James", "location": "loc2", "default_ratio": "2:1", "_id": str(uuid.uuid4())},
        {"code": "ACE001", "full_name": "Ace", "location": "loc1", "default_ratio": "1:1", "_id": str(uuid.uuid4())},
        {"code": "GRA001", "full_name": "Grace", "location": "loc1", "default_ratio": "1:1", "_id": str(uuid.uuid4())},
        {"code": "MIL001", "full_name": "Milan", "location": "loc1", "default_ratio": "1:1", "_id": str(uuid.uuid4())}
    ]
    
    for participant in participants_data:
        existing = await db.participants.find_one({"code": participant["code"]})
        if not existing:
            await db.participants.insert_one(participant)

async def load_participants():
    """Load participants from database"""
    cursor = db.participants.find()
    participants = []
    async for doc in cursor:
        doc['id'] = doc['_id']
        participants.append(Participant(**doc))
    ROSTER_STATE.participants = participants

async def load_workers():
    """Load workers from database"""
    cursor = db.workers.find({"status": {"$ne": "Inactive"}})
    workers = []
    async for doc in cursor:
        doc['id'] = doc['_id']
        workers.append(Worker(**doc))
    ROSTER_STATE.workers = workers

async def load_locations():
    """Load locations from database"""
    cursor = db.locations.find()
    locations = []
    async for doc in cursor:
        doc['id'] = doc['_id']
        locations.append(dict(doc))
    ROSTER_STATE.locations = locations

# API Routes

# Health check
@api_router.get("/")
async def root():
    return {"message": "Support Management System API", "status": "running"}

# Worker Management Routes
@api_router.get("/workers", response_model=List[Worker])
async def get_workers():
    """Get all active workers"""
    await load_workers()
    return ROSTER_STATE.workers

@api_router.post("/workers", response_model=Worker)
async def create_worker(worker: WorkerCreate):
    """Create a new worker"""
    try:
        worker_data = worker.dict()
        worker_data['_id'] = str(uuid.uuid4())
        worker_data['status'] = 'Active'
        
        result = await db.workers.insert_one(worker_data)
        created_worker = await db.workers.find_one({"_id": worker_data['_id']})
        created_worker['id'] = created_worker['_id']
        
        await load_workers()
        return Worker(**created_worker)
    except Exception as e:
        logger.error(f"Error creating worker: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/workers/{worker_id}", response_model=Worker)
async def update_worker(worker_id: str, worker: WorkerCreate):
    """Update a worker"""
    try:
        worker_data = worker.dict()
        await db.workers.update_one({"_id": worker_id}, {"$set": worker_data})
        
        updated_worker = await db.workers.find_one({"_id": worker_id})
        if not updated_worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        updated_worker['id'] = updated_worker['_id']
        await load_workers()
        return Worker(**updated_worker)
    except Exception as e:
        logger.error(f"Error updating worker: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str):
    """Delete a worker (set to inactive)"""
    try:
        await db.workers.update_one({"_id": worker_id}, {"$set": {"status": "Inactive"}})
        await load_workers()
        return {"message": "Worker deactivated successfully"}
    except Exception as e:
        logger.error(f"Error deleting worker: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Participant Management Routes
@api_router.get("/participants", response_model=List[Participant])
async def get_participants():
    """Get all participants"""
    await load_participants()
    return ROSTER_STATE.participants

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

# Location Routes
@api_router.get("/locations")
async def get_locations():
    """Get all locations"""
    await load_locations()
    return ROSTER_STATE.locations

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