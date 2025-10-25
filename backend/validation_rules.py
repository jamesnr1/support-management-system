#!/usr/bin/env python3
"""
COMPREHENSIVE VALIDATION RULES FOR NDIS COMPLIANCE
These rules should run automatically on every shift save/update

DEPRECATED: This file is being replaced by enhanced_validation_service.py
Maintained for backward compatibility
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import logging
from services.enhanced_validation_service import EnhancedValidationService
from services.validation_config import get_validation_config

logger = logging.getLogger(__name__)

class RosterValidationError(Exception):
    """Raised when a validation rule is violated"""
    pass

class RosterValidator:
    """
    Validates roster data against NDIS compliance rules
    """
    
    def __init__(self, roster_data: dict, workers: dict):
        """
        Args:
            roster_data: Full roster data {participant_code: {date: [shifts]}}
            workers: Worker information {worker_id: worker_data}
        """
        self.roster = roster_data
        self.workers = workers
        self.errors = []
        self.warnings = []
    
    def validate_all(self) -> Tuple[List[str], List[str]]:
        """
        Run all validation checks
        Returns: (errors, warnings)
        """
        self.errors = []
        self.warnings = []
        
        self.check_worker_ratios()
        self.check_double_bookings()
        self.check_continuous_hours()
        self.check_weekly_max_hours()
        self.check_break_times()
        self.check_overnight_staffing()
        
        return (self.errors, self.warnings)
    
    def check_worker_ratios(self):
        """Ensure shifts have correct number of workers for their ratio"""
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    ratio = shift.get('ratio', '1:1')
                    required = int(ratio.split(':')[0])
                    actual = len(shift.get('workers', []))
                    
                    if actual < required:
                        self.errors.append(
                            f"❌ {p_code} {date} {shift['startTime']}-{shift['endTime']}: "
                            f"Needs {required} workers, has {actual} ({ratio})"
                        )
                    elif actual > required:
                        self.warnings.append(
                            f"⚠️ {p_code} {date} {shift['startTime']}-{shift['endTime']}: "
                            f"Has {actual} workers but only needs {required} ({ratio})"
                        )
    
    def check_double_bookings(self):
        """Detect if a worker is scheduled at two places at the same time"""
        worker_schedule = {}  # {worker_id: [(date, start, end, participant, funding_category)]}
        
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    start = self._time_to_minutes(shift['startTime'])
                    end = self._time_to_minutes(shift['endTime'])
                    
                    for worker_id in shift.get('workers', []):
                        if worker_id not in worker_schedule:
                            worker_schedule[worker_id] = []
                        worker_schedule[worker_id].append({
                            'date': date,
                            'start': start,
                            'end': end,
                            'participant': p_code,
                            'shift_time': f"{shift['startTime']}-{shift['endTime']}",
                            'funding_category': shift.get('funding_category', 'default'),
                            'shift_id': shift.get('id', 'unknown')
                        })
        
        # Check for overlaps
        for worker_id, schedule in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            schedule.sort(key=lambda x: (x['date'], x['start']))
            
            for i in range(len(schedule) - 1):
                current = schedule[i]
                next_shift = schedule[i + 1]
                
                if current['date'] == next_shift['date']:
                    # Only flag as conflict if:
                    # 1. Different participants (true conflict)
                    # 2. Same participant but overlapping times (invalid split shift)
                    if current['participant'] != next_shift['participant']:
                        # Check for overlap - this is a real conflict
                        if current['end'] > next_shift['start']:
                            self.errors.append(
                                f"❌ WORKER CONFLICT: {worker_name} on {current['date']} "
                                f"scheduled for {current['participant']} ({current['shift_time']}) "
                                f"AND {next_shift['participant']} ({next_shift['shift_time']})"
                            )
                    elif current['participant'] == next_shift['participant']:
                        # Same participant - check if this is a valid split shift
                        if current['end'] > next_shift['start']:
                            # Overlapping times for same participant - this is invalid
                            self.errors.append(
                                f"❌ INVALID SPLIT SHIFT: {worker_name} on {current['date']} "
                                f"has overlapping times {current['shift_time']} and {next_shift['shift_time']} "
                                f"for {current['participant']}"
                            )
                        elif current['end'] == next_shift['start']:
                            # Back-to-back shifts for same participant - this is valid for different funding categories
                            current_funding = current.get('funding_category', 'default')
                            next_funding = next_shift.get('funding_category', 'default')
                            if current_funding == next_funding:
                                self.warnings.append(
                                    f"ℹ️ SPLIT SHIFT: {worker_name} on {current['date']} "
                                    f"has back-to-back shifts {current['shift_time']} and {next_shift['shift_time']} "
                                    f"for {current['participant']} with same funding category"
                                )
    
    def check_continuous_hours(self):
        """Check for excessive continuous working hours (12+ hours)"""
        worker_schedule = {}
        
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    for worker_id in shift.get('workers', []):
                        if worker_id not in worker_schedule:
                            worker_schedule[worker_id] = {}
                        if date not in worker_schedule[worker_id]:
                            worker_schedule[worker_id][date] = []
                        
                        worker_schedule[worker_id][date].append({
                            'start': shift['startTime'],
                            'end': shift['endTime'],
                            'duration': float(shift.get('duration', 0))
                        })
        
        # Check daily totals
        for worker_id, dates in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            
            for date, day_shifts in dates.items():
                total_hours = sum(s['duration'] for s in day_shifts)
                
                if total_hours >= 12:
                    times = ', '.join([f"{s['start']}-{s['end']}" for s in day_shifts])
                    self.errors.append(
                        f"❌ EXCESSIVE HOURS: {worker_name} on {date} "
                        f"scheduled for {total_hours:.1f} hours ({times})"
                    )
    
    def check_weekly_max_hours(self):
        """Check if workers exceed their maximum weekly hours"""
        worker_weekly_hours = {}
        
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    for worker_id in shift.get('workers', []):
                        if worker_id not in worker_weekly_hours:
                            worker_weekly_hours[worker_id] = 0
                        worker_weekly_hours[worker_id] += float(shift.get('duration', 0))
        
        for worker_id, total_hours in worker_weekly_hours.items():
            worker_data = self.workers.get(str(worker_id), {})
            worker_name = worker_data.get('full_name', f'Worker-{worker_id}')
            max_hours = worker_data.get('max_hours')
            
            if max_hours:
                if total_hours > max_hours:
                    self.errors.append(
                        f"❌ MAX HOURS EXCEEDED: {worker_name} has {total_hours:.1f}h "
                        f"(max: {max_hours}h)"
                    )
    
    def check_break_times(self):
        """Check for adequate break times between shifts"""
        worker_schedule = {}
        
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    for worker_id in shift.get('workers', []):
                        if worker_id not in worker_schedule:
                            worker_schedule[worker_id] = []
                        worker_schedule[worker_id].append({
                            'date': date,
                            'start': shift['startTime'],
                            'end': shift['endTime'],
                            'duration': float(shift.get('duration', 0))
                        })
        
        # Sort and check gaps
        for worker_id, schedule in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            schedule.sort(key=lambda x: (x['date'], x['start']))
            
            for i in range(len(schedule) - 1):
                current = schedule[i]
                next_shift = schedule[i + 1]
                
                # Check if on consecutive days or same day
                current_date = datetime.strptime(current['date'], '%Y-%m-%d')
                next_date = datetime.strptime(next_shift['date'], '%Y-%m-%d')
                
                if (next_date - current_date).days <= 1:
                    # Calculate break time
                    current_end_mins = self._time_to_minutes(current['end'])
                    next_start_mins = self._time_to_minutes(next_shift['start'])
                    
                    if current_date == next_date:
                        break_hours = (next_start_mins - current_end_mins) / 60
                    else:
                        # Overnight
                        break_hours = ((24 * 60 - current_end_mins) + next_start_mins) / 60
                    
                    if break_hours < 10 and (current['duration'] + next_shift['duration']) >= 16:
                        self.warnings.append(
                            f"⚠️ SHORT BREAK: {worker_name} has {break_hours:.1f}h break "
                            f"between {current['date']} ({current['start']}-{current['end']}) "
                            f"and {next_shift['date']} ({next_shift['start']}-{next_shift['end']})"
                        )
    
    def check_overnight_staffing(self):
        """Ensure overnight shifts (10PM-6AM) have adequate staffing"""
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    start_hour = int(shift['startTime'].split(':')[0])
                    end_hour = int(shift['endTime'].split(':')[0])
                    
                    # Overnight shift
                    if start_hour >= 22 or end_hour <= 6:
                        ratio = shift.get('ratio', '1:1')
                        workers = shift.get('workers', [])
                        
                        if len(workers) < 2 and ratio == '2:1':
                            self.warnings.append(
                                f"⚠️ OVERNIGHT UNDERSTAFFED: {p_code} {date} "
                                f"{shift['startTime']}-{shift['endTime']} needs 2:1 ratio"
                            )
    
    def _time_to_minutes(self, time_str: str) -> int:
        """Convert HH:MM to minutes since midnight"""
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    
    def _get_worker_name(self, worker_id: str) -> str:
        """Get worker display name"""
        worker_data = self.workers.get(str(worker_id), {})
        return worker_data.get('full_name', f'Worker-{worker_id}')


def validate_roster_data(roster_data: dict, workers: dict) -> dict:
    """
    Main validation function
    Returns: {
        'valid': bool,
        'errors': [str],
        'warnings': [str]
    }
    """
    validator = RosterValidator(roster_data, workers)
    errors, warnings = validator.validate_all()
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }


# ENHANCED VALIDATION FUNCTIONS
# These replace the legacy validation with improved logic

def validate_roster_data_enhanced(roster_data: dict, workers: dict, config: dict = None) -> dict:
    """
    Enhanced validation function with improved conflict detection and flexible rules
    
    Args:
        roster_data: The roster data to validate
        workers: Worker data for validation
        config: Optional validation configuration
        
    Returns:
        Dict with validation results including errors, warnings, and info
    """
    try:
        # Get validation configuration
        validation_config = get_validation_config()
        config = config or validation_config.get_config()
        
        # Use enhanced validation service
        validator = EnhancedValidationService(workers, config)
        result = validator.validate_roster_data(roster_data)
        
        logger.info(f"Enhanced validation completed: {result['summary']}")
        return result
        
    except Exception as e:
        logger.error(f"Enhanced validation failed: {e}")
        # Fallback to legacy validation
        return validate_roster_data_legacy(roster_data, workers)


def validate_roster_data_legacy(roster_data: dict, workers: dict) -> dict:
    """
    Legacy validation function for backward compatibility
    
    Args:
        roster_data: The roster data to validate
        workers: Worker data for validation
        
    Returns:
        Dict with validation results
    """
    try:
        validator = RosterValidator(roster_data, workers)
        errors, warnings = validator.validate_all()
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'info': [],
            'summary': {
                'total_errors': len(errors),
                'total_warnings': len(warnings),
                'total_info': 0,
                'is_valid': len(errors) == 0,
                'has_warnings': len(warnings) > 0,
                'validation_type': 'legacy'
            }
        }
        
    except Exception as e:
        logger.error(f"Legacy validation failed: {e}")
        return {
            'valid': False,
            'errors': [f"Validation failed: {str(e)}"],
            'warnings': [],
            'info': [],
            'summary': {
                'total_errors': 1,
                'total_warnings': 0,
                'total_info': 0,
                'is_valid': False,
                'has_warnings': False,
                'validation_type': 'error'
            }
        }


# Backward compatibility - main validation function now uses enhanced validation
def validate_roster_data(roster_data: dict, workers: dict) -> dict:
    """
    Main validation function - now uses enhanced validation by default
    
    Args:
        roster_data: The roster data to validate
        workers: Worker data for validation
        
    Returns:
        Dict with validation results
    """
    return validate_roster_data_enhanced(roster_data, workers)


def get_validation_config_info() -> dict:
    """
    Get information about current validation configuration
    
    Returns:
        Dict with configuration details
    """
    try:
        config = get_validation_config()
        return config.get_validation_rules_summary()
    except Exception as e:
        logger.error(f"Failed to get validation config: {e}")
        return {'error': str(e)}


def update_validation_config(updates: dict) -> dict:
    """
    Update validation configuration
    
    Args:
        updates: Configuration updates to apply
        
    Returns:
        Dict with updated configuration
    """
    try:
        config = get_validation_config()
        config.update_config(updates)
        return config.get_validation_rules_summary()
    except Exception as e:
        logger.error(f"Failed to update validation config: {e}")
        return {'error': str(e)}















