"""
Enhanced validation service with improved conflict detection and flexible rules
"""
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class EnhancedValidationService:
    """
    Enhanced validation service with improved conflict detection,
    flexible rest periods, and support for intentional split shifts
    """
    
    def __init__(self, workers: Dict[str, Any], config: Dict[str, Any] = None):
        self.workers = workers
        self.config = config or self._get_default_config()
        self.errors = []
        self.warnings = []
        self.info = []
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default validation configuration"""
        return {
            'min_rest_hours': 8,  # Minimum rest between shifts (configurable)
            'max_continuous_hours': 12,  # Maximum continuous work hours
            'max_daily_hours': 16,  # Maximum hours per day
            'max_weekly_hours': 40,  # Maximum hours per week
            'allow_split_shifts': True,  # Allow intentional split shifts
            'min_split_shift_gap': 1,  # Minimum gap between split shifts (hours)
            'strict_rest_validation': False,  # Whether to enforce strict rest rules
            'overnight_staffing_required': True,  # Require 2:1 for overnight shifts
        }
    
    def validate_roster_data(self, roster_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main validation function with enhanced logic
        
        Args:
            roster_data: The roster data to validate
            
        Returns:
            Dict with validation results
        """
        self.errors = []
        self.warnings = []
        self.info = []
        
        logger.info("Starting enhanced roster validation")
        
        # Run all validation checks
        self.check_worker_conflicts(roster_data)
        self.check_rest_periods(roster_data)
        self.check_continuous_hours(roster_data)
        self.check_weekly_limits(roster_data)
        self.check_overnight_staffing(roster_data)
        self.check_availability_compliance(roster_data)
        
        # Determine overall validity
        is_valid = len(self.errors) == 0
        
        result = {
            'valid': is_valid,
            'errors': self.errors,
            'warnings': self.warnings,
            'info': self.info,
            'summary': self._generate_summary()
        }
        
        logger.info(f"Validation completed: {len(self.errors)} errors, {len(self.warnings)} warnings")
        return result
    
    def check_worker_conflicts(self, roster_data: Dict[str, Any]):
        """
        Enhanced worker conflict detection with support for intentional split shifts
        """
        worker_schedule = {}
        
        # Build worker schedule
        for p_code, dates in roster_data.get('data', {}).items():
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
                            'is_split_shift': shift.get('is_split_shift', False),
                            'shift_id': shift.get('id', 'unknown'),
                            'duration': float(shift.get('duration', 0))
                        })
        
        # Check for conflicts
        for worker_id, schedule in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            schedule.sort(key=lambda x: (x['date'], x['start']))
            
            for i in range(len(schedule) - 1):
                current = schedule[i]
                next_shift = schedule[i + 1]
                
                if current['date'] != next_shift['date']:
                    continue
                
                # Different participants = conflict
                if current['participant'] != next_shift['participant']:
                    if current['end'] > next_shift['start']:
                        self.errors.append(
                            f"❌ CONFLICT: {worker_name} double-booked on {current['date']} "
                            f"for {current['participant']} ({current['shift_time']}) "
                            f"and {next_shift['participant']} ({next_shift['shift_time']})"
                        )
                
                # Same participant = check if intentional split shift
                elif current['participant'] == next_shift['participant']:
                    if current['end'] == next_shift['start']:
                        # Back-to-back for same participant
                        if current['funding_category'] != next_shift['funding_category']:
                            # Different funding = valid split shift
                            self.info.append(
                                f"ℹ️ SPLIT SHIFT: {worker_name} has back-to-back shifts "
                                f"for {current['participant']} with different funding categories"
                            )
                        elif current.get('is_split_shift') and next_shift.get('is_split_shift'):
                            # Marked as intentional split shift
                            self.info.append(
                                f"ℹ️ INTENTIONAL SPLIT: {worker_name} has planned split shift "
                                f"for {current['participant']}"
                            )
                        else:
                            self.warnings.append(
                                f"⚠️ SPLIT SHIFT: {worker_name} has back-to-back shifts "
                                f"for {current['participant']} - verify this is intentional"
                            )
                    elif current['end'] > next_shift['start']:
                        # Overlapping shifts for same participant
                        self.errors.append(
                            f"❌ INVALID: {worker_name} has overlapping shifts "
                            f"for {current['participant']} on {current['date']}"
                        )
                    else:
                        # Gap between shifts - check if it meets minimum requirements
                        gap_hours = (next_shift['start'] - current['end']) / 60
                        if gap_hours < self.config['min_split_shift_gap']:
                            self.warnings.append(
                                f"⚠️ SHORT GAP: {worker_name} has {gap_hours:.1f}h gap "
                                f"between shifts for {current['participant']} "
                                f"(minimum: {self.config['min_split_shift_gap']}h)"
                            )
    
    def check_rest_periods(self, roster_data: Dict[str, Any]):
        """
        Flexible rest period validation with configurable rules
        """
        worker_schedule = {}
        
        # Build worker schedule
        for p_code, dates in roster_data.get('data', {}).items():
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
                            'duration': float(shift.get('duration', 0)),
                            'shift_id': shift.get('id', 'unknown')
                        })
        
        # Check rest periods
        for worker_id, schedule in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            schedule.sort(key=lambda x: (x['date'], x['start']))
            
            for i in range(len(schedule) - 1):
                current = schedule[i]
                next_shift = schedule[i + 1]
                
                # Calculate rest period
                current_date = datetime.strptime(current['date'], '%Y-%m-%d')
                next_date = datetime.strptime(next_shift['date'], '%Y-%m-%d')
                
                if (next_date - current_date).days <= 1:
                    # Calculate break time
                    current_end_mins = current['end']
                    next_start_mins = next_shift['start']
                    
                    if current_date == next_date:
                        # Same day
                        break_hours = (next_start_mins - current_end_mins) / 60
                    else:
                        # Overnight
                        break_hours = ((24 * 60 - current_end_mins) + next_start_mins) / 60
                    
                    # Check against configurable minimum
                    min_rest = self.config['min_rest_hours']
                    
                    if break_hours < min_rest:
                        if self.config['strict_rest_validation']:
                            self.errors.append(
                                f"❌ INSUFFICIENT REST: {worker_name} has {break_hours:.1f}h rest "
                                f"between {current['date']} ({self._minutes_to_time(current['start'])}-{self._minutes_to_time(current['end'])}) "
                                f"and {next_shift['date']} ({self._minutes_to_time(next_shift['start'])}-{self._minutes_to_time(next_shift['end'])}) "
                                f"(minimum: {min_rest}h)"
                            )
                        else:
                            self.warnings.append(
                                f"⚠️ SHORT REST: {worker_name} has {break_hours:.1f}h rest "
                                f"between shifts (recommended: {min_rest}h)"
                            )
                    
                    # Check for excessive continuous work
                    total_work_hours = current['duration'] + next_shift['duration']
                    if total_work_hours > self.config['max_continuous_hours']:
                        self.warnings.append(
                            f"⚠️ LONG WORK PERIOD: {worker_name} has {total_work_hours:.1f}h "
                            f"continuous work (max recommended: {self.config['max_continuous_hours']}h)"
                        )
    
    def check_continuous_hours(self, roster_data: Dict[str, Any]):
        """
        Check for excessive continuous work hours
        """
        worker_schedule = {}
        
        # Build worker schedule
        for p_code, dates in roster_data.get('data', {}).items():
            for date, shifts in dates.items():
                for shift in shifts:
                    for worker_id in shift.get('workers', []):
                        if worker_id not in worker_schedule:
                            worker_schedule[worker_id] = []
                        worker_schedule[worker_id].append({
                            'date': date,
                            'duration': float(shift.get('duration', 0)),
                            'start_time': shift['startTime'],
                            'end_time': shift['endTime']
                        })
        
        # Check daily and weekly limits
        for worker_id, schedule in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            
            # Group by date
            daily_hours = {}
            for shift in schedule:
                date = shift['date']
                if date not in daily_hours:
                    daily_hours[date] = 0
                daily_hours[date] += shift['duration']
            
            # Check daily limits
            for date, hours in daily_hours.items():
                if hours > self.config['max_daily_hours']:
                    self.warnings.append(
                        f"⚠️ DAILY LIMIT: {worker_name} has {hours:.1f}h on {date} "
                        f"(max recommended: {self.config['max_daily_hours']}h)"
                    )
            
            # Check weekly limits
            total_weekly_hours = sum(daily_hours.values())
            if total_weekly_hours > self.config['max_weekly_hours']:
                self.warnings.append(
                    f"⚠️ WEEKLY LIMIT: {worker_name} has {total_weekly_hours:.1f}h this week "
                    f"(max recommended: {self.config['max_weekly_hours']}h)"
                )
    
    def check_weekly_limits(self, roster_data: Dict[str, Any]):
        """
        Check weekly hour limits for workers
        """
        worker_weekly_hours = {}
        
        # Calculate weekly hours for each worker
        for p_code, dates in roster_data.get('data', {}).items():
            for date, shifts in dates.items():
                for shift in shifts:
                    for worker_id in shift.get('workers', []):
                        if worker_id not in worker_weekly_hours:
                            worker_weekly_hours[worker_id] = 0
                        worker_weekly_hours[worker_id] += float(shift.get('duration', 0))
        
        # Check against worker-specific limits
        for worker_id, total_hours in worker_weekly_hours.items():
            worker_name = self._get_worker_name(worker_id)
            worker_data = self.workers.get(str(worker_id), {})
            max_hours = worker_data.get('max_hours', self.config['max_weekly_hours'])
            
            if total_hours > max_hours:
                self.errors.append(
                    f"❌ WEEKLY LIMIT EXCEEDED: {worker_name} has {total_hours:.1f}h "
                    f"(max: {max_hours}h)"
                )
    
    def check_overnight_staffing(self, roster_data: Dict[str, Any]):
        """
        Check overnight shift staffing requirements
        """
        if not self.config['overnight_staffing_required']:
            return
        
        for p_code, dates in roster_data.get('data', {}).items():
            for date, shifts in dates.items():
                for shift in shifts:
                    start_hour = int(shift['startTime'].split(':')[0])
                    end_hour = int(shift['endTime'].split(':')[0])
                    
                    # Check if this is an overnight shift
                    is_overnight = (
                        start_hour >= 22 or  # Starts at 10 PM or later
                        end_hour <= 6 or     # Ends at 6 AM or earlier
                        (start_hour > end_hour)  # Crosses midnight
                    )
                    
                    if is_overnight:
                        ratio = shift.get('ratio', '1:1')
                        workers = shift.get('workers', [])
                        
                        if ratio == '2:1' and len(workers) < 2:
                            self.warnings.append(
                                f"⚠️ OVERNIGHT UNDERSTAFFED: {p_code} {date} "
                                f"{shift['startTime']}-{shift['endTime']} needs 2:1 ratio "
                                f"(currently {len(workers)} worker(s))"
                            )
    
    def check_availability_compliance(self, roster_data: Dict[str, Any]):
        """
        Check if shifts comply with worker availability rules
        """
        for p_code, dates in roster_data.get('data', {}).items():
            for date, shifts in dates.items():
                for shift in shifts:
                    for worker_id in shift.get('workers', []):
                        worker_data = self.workers.get(str(worker_id), {})
                        if not worker_data:
                            continue
                        
                        # Check if worker is available on this day/time
                        # This would integrate with the availability system
                        # For now, just log that we're checking
                        pass
    
    def _time_to_minutes(self, time_str: str) -> int:
        """Convert HH:MM to minutes since midnight"""
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    
    def _minutes_to_time(self, minutes: int) -> str:
        """Convert minutes since midnight to HH:MM"""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}"
    
    def _get_worker_name(self, worker_id: str) -> str:
        """Get worker display name"""
        worker_data = self.workers.get(str(worker_id), {})
        return worker_data.get('full_name', f'Worker-{worker_id}')
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate validation summary"""
        return {
            'total_errors': len(self.errors),
            'total_warnings': len(self.warnings),
            'total_info': len(self.info),
            'is_valid': len(self.errors) == 0,
            'has_warnings': len(self.warnings) > 0,
            'config_used': self.config
        }
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update validation configuration"""
        self.config.update(new_config)
        logger.info(f"Validation config updated: {new_config}")
    
    def get_config(self) -> Dict[str, Any]:
        """Get current validation configuration"""
        return self.config.copy()


def validate_roster_data_enhanced(roster_data: dict, workers: dict, config: dict = None) -> dict:
    """
    Enhanced main validation function
    
    Args:
        roster_data: The roster data to validate
        workers: Worker data for validation
        config: Optional validation configuration
        
    Returns:
        Dict with validation results
    """
    validator = EnhancedValidationService(workers, config)
    return validator.validate_roster_data(roster_data)
