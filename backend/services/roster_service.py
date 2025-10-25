"""Business logic for roster operations"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from database import SupabaseDatabase
from services.validation_service import ValidationService
from core.logging_config import get_logger

logger = get_logger("roster_service")

class RosterService:
    """Service for roster business logic"""
    
    def __init__(self, db: SupabaseDatabase):
        self.db = db
        self.validator = ValidationService(db)
    
    def get_week_roster(
        self, 
        week_start: datetime,
        participant_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get roster for specific week"""
        week_end = week_start + timedelta(days=7)
        
        # Get all shifts for the week
        shifts = self.db.get_shifts_by_date_range(
            week_start.date(),
            week_end.date()
        )
        
        # Filter by participants if specified
        if participant_ids:
            shifts = [s for s in shifts if s['participant_id'] in participant_ids]
        
        # Group by participant and date
        roster = self._group_shifts_by_participant_and_date(shifts)
        
        # Calculate statistics
        stats = self._calculate_week_stats(shifts)
        
        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "roster": roster,
            "statistics": stats
        }
    
    def create_shift(
        self,
        shift_data: Dict[str, Any],
        validate: bool = True
    ) -> Dict[str, Any]:
        """Create a new shift with validation"""
        
        # Validate if requested
        if validate:
            validation_result = self.validator.validate_new_shift(shift_data)
            if not validation_result['valid']:
                raise ValueError(f"Validation failed: {validation_result['errors']}")
        
        # Create shift
        try:
            new_shift = self.db.create_shift(shift_data)
            
            logger.info("shift_created",
                shift_id=new_shift['id'],
                participant=shift_data.get('participant_id'),
                date=shift_data.get('shift_date'),
                duration=shift_data.get('duration')
            )
            
            return new_shift
            
        except Exception as e:
            logger.error("shift_creation_failed",
                error=str(e),
                shift_data=shift_data
            )
            raise
    
    def update_shift(
        self,
        shift_id: str,
        updates: Dict[str, Any],
        validate: bool = True
    ) -> Dict[str, Any]:
        """Update existing shift with validation"""
        
        # Get existing shift
        existing_shift = self.db.get_shift(shift_id)
        if not existing_shift:
            raise ValueError(f"Shift {shift_id} not found")
        
        # Check if shift is locked
        if existing_shift.get('locked', False):
            raise ValueError(f"Shift {shift_id} is locked and cannot be modified")
        
        # Merge updates
        updated_data = {**existing_shift, **updates}
        
        # Validate if requested
        if validate:
            validation_result = self.validator.validate_shift_update(
                shift_id,
                updated_data
            )
            if not validation_result['valid']:
                raise ValueError(f"Validation failed: {validation_result['errors']}")
        
        # Update shift
        try:
            updated_shift = self.db.update_shift(shift_id, updates)
            
            logger.info("shift_updated",
                shift_id=shift_id,
                updates=list(updates.keys())
            )
            
            return updated_shift
            
        except Exception as e:
            logger.error("shift_update_failed",
                shift_id=shift_id,
                error=str(e)
            )
            raise
    
    def _group_shifts_by_participant_and_date(
        self,
        shifts: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, List[Dict]]]:
        """Group shifts by participant code and date"""
        grouped = {}
        
        for shift in shifts:
            participant_id = shift['participant_id']
            shift_date = shift['shift_date']
            
            if participant_id not in grouped:
                grouped[participant_id] = {}
            
            if shift_date not in grouped[participant_id]:
                grouped[participant_id][shift_date] = []
            
            grouped[participant_id][shift_date].append(shift)
        
        return grouped
    
    def _calculate_week_stats(
        self,
        shifts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate statistics for the week"""
        total_hours = sum(float(s.get('duration', 0)) for s in shifts)
        total_shifts = len(shifts)
        
        # Worker hours
        worker_hours = {}
        for shift in shifts:
            for worker_id in shift.get('workers', []):
                worker_hours[worker_id] = worker_hours.get(worker_id, 0) + float(shift.get('duration', 0))
        
        return {
            "total_hours": total_hours,
            "total_shifts": total_shifts,
            "unique_workers": len(worker_hours),
            "worker_hours": worker_hours
        }
