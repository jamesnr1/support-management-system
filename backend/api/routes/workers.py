"""Worker management endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
from database import SupabaseDatabase
from models import Worker, WorkerCreate, AvailabilityRule, UnavailabilityPeriod
from api.dependencies import get_db, require_admin
from core.security import optional_admin_auth, get_rate_limiter
from core.logging_config import get_logger

router = APIRouter(prefix="/api/workers", tags=["workers"])
limiter = get_rate_limiter()
logger = get_logger("workers")

@router.get("/", response_model=List[Worker])
@limiter.limit("30/minute")
async def get_workers(
    request: Request,
    db: SupabaseDatabase = Depends(get_db),
    is_admin: bool = Depends(optional_admin_auth)
):
    """Get all workers"""
    try:
        workers = db.get_support_workers()
        
        # Hide sensitive data for non-admin users
        if not is_admin:
            for worker in workers:
                worker.pop('telegram_id', None)
                worker.pop('phone', None)
        
        logger.info("workers_fetched", count=len(workers), admin=is_admin)
        return workers
    except Exception as e:
        logger.error("workers_fetch_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch workers")

@router.get("/{worker_id}", response_model=Worker)
@limiter.limit("30/minute")
async def get_worker(
    request: Request,
    worker_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get specific worker by ID"""
    try:
        worker = db.get_support_worker(worker_id)
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        logger.info("worker_fetched", worker_id=worker_id)
        return worker
    except HTTPException:
        raise
    except Exception as e:
        logger.error("worker_fetch_failed", worker_id=worker_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch worker")

@router.post("/", response_model=Worker, dependencies=[require_admin()])
@limiter.limit("10/minute")
async def create_worker(
    request: Request,
    worker: WorkerCreate,
    db: SupabaseDatabase = Depends(get_db)
):
    """Create new worker (admin only)"""
    try:
        # Use Pydantic v2 API and exclude None fields
        worker_data = worker.model_dump(exclude_none=True)
        worker_data['status'] = 'Active'
        
        new_worker = db.create_support_worker(worker_data)
        if new_worker:
            logger.info("worker_created", 
                worker_id=new_worker.get('id'),
                name=worker_data.get('full_name')
            )
            return Worker(**new_worker)
        else:
            raise HTTPException(status_code=400, detail="Failed to create worker")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("worker_creation_failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{worker_id}", response_model=Worker, dependencies=[require_admin()])
@limiter.limit("10/minute")
async def update_worker(
    request: Request,
    worker_id: str,
    worker: WorkerCreate,
    db: SupabaseDatabase = Depends(get_db)
):
    """Update worker (admin only)"""
    try:
        # Only include fields that are not None
        worker_data = worker.model_dump(exclude_none=True)
        
        updated_worker = db.update_support_worker(worker_id, worker_data)
        if updated_worker:
            logger.info("worker_updated", worker_id=worker_id)
            return Worker(**updated_worker)
        else:
            raise HTTPException(status_code=404, detail="Worker not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("worker_update_failed", worker_id=worker_id, error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{worker_id}", dependencies=[require_admin()])
@limiter.limit("10/minute")
async def delete_worker(
    request: Request,
    worker_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Soft delete worker (admin only)"""
    try:
        success = db.delete_support_worker(worker_id)
        if success:
            logger.info("worker_deleted", worker_id=worker_id)
            return {"message": "Worker deactivated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Worker not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("worker_deletion_failed", worker_id=worker_id, error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{worker_id}/availability")
@limiter.limit("30/minute")
async def get_worker_availability(
    request: Request,
    worker_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get worker's availability schedule"""
    try:
        availability = db.get_worker_availability(worker_id)
        logger.info("worker_availability_fetched", worker_id=worker_id)
        return availability
    except Exception as e:
        logger.error("worker_availability_fetch_failed", worker_id=worker_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch availability")

@router.put("/{worker_id}/availability", dependencies=[require_admin()])
@limiter.limit("10/minute")
async def update_worker_availability(
    request: Request,
    worker_id: str,
    availability: List[AvailabilityRule],
    db: SupabaseDatabase = Depends(get_db)
):
    """Update worker's availability (admin only)"""
    try:
        # Convert to dict format expected by database
        availability_data = [rule.model_dump() for rule in availability]
        
        success = db.set_worker_availability(worker_id, availability_data)
        if success:
            logger.info("worker_availability_updated", worker_id=worker_id)
            return {"message": "Availability updated successfully", "worker_id": worker_id}
        else:
            raise HTTPException(status_code=400, detail="Failed to update availability")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("worker_availability_update_failed", worker_id=worker_id, error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{worker_id}/unavailability")
@limiter.limit("30/minute")
async def get_worker_unavailability(
    request: Request,
    worker_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get worker unavailability periods"""
    try:
        periods = db.get_unavailability_periods(worker_id)
        logger.info("worker_unavailability_fetched", worker_id=worker_id)
        return periods
    except Exception as e:
        logger.error("worker_unavailability_fetch_failed", worker_id=worker_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch unavailability periods")

@router.post("/{worker_id}/unavailability", dependencies=[require_admin()])
@limiter.limit("10/minute")
async def add_unavailability_period(
    request: Request,
    worker_id: str,
    period: UnavailabilityPeriod,
    db: SupabaseDatabase = Depends(get_db)
):
    """Add unavailability period for worker (admin only)"""
    try:
        period_data = period.model_dump()
        
        result = db.add_unavailability_period(
            worker_id=worker_id,
            from_date=period_data['from_date'],
            to_date=period_data['to_date'],
            reason=period_data.get('reason', 'Other')
        )
        
        if result:
            logger.info("unavailability_period_added", worker_id=worker_id)
            return {"message": "Unavailability period added successfully", "period": result}
        else:
            raise HTTPException(status_code=400, detail="Failed to add unavailability period")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("unavailability_period_add_failed", worker_id=worker_id, error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/unavailability/{period_id}", dependencies=[require_admin()])
@limiter.limit("10/minute")
async def delete_unavailability_period(
    request: Request,
    period_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Delete unavailability period (admin only)"""
    try:
        success = db.delete_unavailability_period(period_id)
        if success:
            logger.info("unavailability_period_deleted", period_id=period_id)
            return {"message": "Unavailability period deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Unavailability period not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("unavailability_period_deletion_failed", period_id=period_id, error=str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred while deleting the period")
