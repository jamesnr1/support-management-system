"""Participant management endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
from database import SupabaseDatabase
from models import Participant
from api.dependencies import get_db, require_admin
from core.security import optional_admin_auth, get_rate_limiter
from core.logging_config import get_logger

router = APIRouter(prefix="/api/participants", tags=["participants"])
limiter = get_rate_limiter()
logger = get_logger("participants")

@router.get("/", response_model=List[Participant])
@limiter.limit("30/minute")
async def get_participants(
    request: Request,
    db: SupabaseDatabase = Depends(get_db),
    is_admin: bool = Depends(optional_admin_auth)
):
    """Get all participants"""
    try:
        participants = db.get_participants()
        
        # Hide sensitive data for non-admin users
        if not is_admin:
            for participant in participants:
                participant.pop('ndis_number', None)
                participant.pop('phone', None)
        
        logger.info("participants_fetched", count=len(participants), admin=is_admin)
        return participants
    except Exception as e:
        logger.error("participants_fetch_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch participants")

@router.get("/{participant_id}", response_model=Participant)
@limiter.limit("30/minute")
async def get_participant(
    request: Request,
    participant_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get specific participant by ID"""
    try:
        participant = db.get_participant(participant_id)
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        logger.info("participant_fetched", participant_id=participant_id)
        return participant
    except HTTPException:
        raise
    except Exception as e:
        logger.error("participant_fetch_failed", participant_id=participant_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch participant")

@router.get("/{participant_id}/shifts")
@limiter.limit("30/minute")
async def get_participant_shifts(
    request: Request,
    participant_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get shifts for a specific participant"""
    try:
        shifts = db.get_shifts_by_participant(participant_id)
        
        logger.info("participant_shifts_fetched", 
            participant_id=participant_id, 
            shift_count=len(shifts)
        )
        return shifts
    except Exception as e:
        logger.error("participant_shifts_fetch_failed", 
            participant_id=participant_id, 
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to fetch participant shifts")
