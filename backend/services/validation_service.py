"""Validation service for business logic validation"""
from typing import Dict, List, Any
from database import SupabaseDatabase
from core.logging_config import get_logger

logger = get_logger("validation_service")

class ValidationService:
    """Service for business logic validation"""
    
    def __init__(self, db: SupabaseDatabase):
        self.db = db
    
    def validate_new_shift(self, shift_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a new shift before creation"""
        errors = []
        
        # Required fields
        required_fields = ['participant_id', 'shift_date', 'start_time', 'end_time', 'workers']
        for field in required_fields:
            if not shift_data.get(field):
                errors.append(f"Missing required field: {field}")
        
        if errors:
            return {"valid": False, "errors": errors}
        
        # Validate workers exist and are available
        worker_ids = shift_data.get('workers', [])
        if worker_ids:
            workers = self.db.get_support_workers()
            available_worker_ids = {w['id'] for w in workers}
            
            for worker_id in worker_ids:
                if worker_id not in available_worker_ids:
                    errors.append(f"Worker {worker_id} not found or inactive")
        
        # Validate participant exists
        participant_id = shift_data.get('participant_id')
        if participant_id:
            participants = self.db.get_participants()
            participant_ids = {p['id'] for p in participants}
            if participant_id not in participant_ids:
                errors.append(f"Participant {participant_id} not found")
        
        # Validate time format and logic
        start_time = shift_data.get('start_time')
        end_time = shift_data.get('end_time')
        
        if start_time and end_time:
            try:
                start_hour, start_min = map(int, start_time.split(':'))
                end_hour, end_min = map(int, end_time.split(':'))
                
                if start_hour > end_hour or (start_hour == end_hour and start_min >= end_min):
                    errors.append("End time must be after start time")
                
                # Check for reasonable shift duration (not more than 12 hours)
                start_minutes = start_hour * 60 + start_min
                end_minutes = end_hour * 60 + end_min
                duration_hours = (end_minutes - start_minutes) / 60
                
                if duration_hours > 12:
                    errors.append("Shift duration cannot exceed 12 hours")
                elif duration_hours <= 0:
                    errors.append("Shift duration must be positive")
                    
            except ValueError:
                errors.append("Invalid time format. Use HH:MM format")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def validate_shift_update(
        self, 
        shift_id: str, 
        updated_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate a shift update"""
        errors = []
        
        # Check for conflicts with other shifts
        shift_date = updated_data.get('shift_date')
        workers = updated_data.get('workers', [])
        
        if shift_date and workers:
            # Get all shifts for the same date
            all_shifts = self.db.get_shifts_by_date(shift_date)
            
            for other_shift in all_shifts:
                if other_shift['id'] == shift_id:
                    continue  # Skip the shift being updated
                
                # Check for worker conflicts
                other_workers = other_shift.get('workers', [])
                for worker_id in workers:
                    if worker_id in other_workers:
                        errors.append(f"Worker {worker_id} already has a shift on {shift_date}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def validate_roster_data(self, roster_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate entire roster data"""
        errors = []
        
        if not roster_data:
            errors.append("Roster data is empty")
            return {"valid": False, "errors": errors}
        
        # Get all workers and participants for validation
        workers = self.db.get_support_workers()
        participants = self.db.get_participants()
        
        worker_ids = {w['id'] for w in workers}
        participant_ids = {p['id'] for p in participants}
        
        # Validate each shift in the roster
        shifts = roster_data.get('data', {}).get('shifts', [])
        for i, shift in enumerate(shifts):
            shift_errors = []
            
            # Validate participant
            participant_id = shift.get('participant_id')
            if participant_id and participant_id not in participant_ids:
                shift_errors.append(f"Invalid participant ID: {participant_id}")
            
            # Validate workers
            shift_workers = shift.get('workers', [])
            for worker_id in shift_workers:
                if worker_id not in worker_ids:
                    shift_errors.append(f"Invalid worker ID: {worker_id}")
            
            if shift_errors:
                errors.append(f"Shift {i}: {'; '.join(shift_errors)}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
