#!/usr/bin/env python3
"""
ENHANCED VALIDATION RULES FOR NDIS COMPLIANCE
Improved validation with split shift support and better error messages
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Raised when a validation rule is violated"""
    def __init__(self, message: str, code: str = None, suggestions: List[str] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.suggestions = suggestions or []


class EnhancedRosterValidator:
    """
    Enhanced validator with better error messages and split shift support
    """
    
    def __init__(self, roster_data: dict, workers: dict):
        self.roster = roster_data
        self.workers = workers
        self.errors = []
        self.warnings = []
        self.suggestions = []
        
    def validate_all(self) -> Dict[str, List]:
        """
        Run all validation checks
        Returns: {
            'valid': bool,
            'errors': [str],
            'warnings': [str],
            'suggestions': [str]
        }
        """
        self.errors = []
        self.warnings = []
        self.suggestions = []
        
        self.check_worker_ratios()
        self.check_worker_conflicts()
        self.check_continuous_hours()
        self.check_weekly_max_hours()
        self.check_break_times()
        self.check_overnight_staffing()
        
        return {
            'valid': len(self.errors) == 0,
            'errors': self.errors,
            'warnings': self.warnings,
            'suggestions': self.suggestions
        }
    
    def check_worker_ratios(self):
        """Ensure shifts have correct number of workers for their ratio"""
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    ratio = shift.get('ratio', '1:1')
                    required = int(ratio.split(':')[0])
                    actual = len(shift.get('workers', []))
                    
                    if actual < required:
                        self.errors.append({
                            'type': 'INSUFFICIENT_WORKERS',
                            'message': f"❌ {p_code} {date} {shift['startTime']}-{shift['endTime']}: "
                                     f"Needs {required} workers, has {actual} ({ratio})",
                            'participant': p_code,
                            'date': date,
                            'shift_id': shift.get('id'),
                            'suggestion': f"Add {required - actual} more worker(s) to meet {ratio} requirement"
                        })
                    elif actual > required:
                        self.warnings.append({
                            'type': 'EXCESS_WORKERS',
                            'message': f"⚠️ {p_code} {date} {shift['startTime']}-{shift['endTime']}: "
                                     f"Has {actual} workers but only needs {required} ({ratio})",
                            'participant': p_code,
                            'date': date,
                            'shift_id': shift.get('id')
                        })
    
    def check_worker_conflicts(self):
        """
        Enhanced conflict detection with split shift support
        """
        worker_schedule = {}
        
        # Build worker schedules
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
                            'shift_id': shift.get('id', 'unknown'),
                            'is_split_shift': shift.get('is_split_shift', False)
                        })
        
        # Check for conflicts
        for worker_id, schedule in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            schedule.sort(key=lambda x: (x['date'], x['start']))
            
            for i in range(len(schedule) - 1):
                current = schedule[i]
                next_shift = schedule[i + 1]
                
                # Only check same-day conflicts
                if current['date'] != next_shift['date']:
                    continue
                
                # CASE 1: Different participants = conflict if overlapping
                if current['participant'] != next_shift['participant']:
                    if current['end'] > next_shift['start']:
                        self.errors.append({
                            'type': 'DOUBLE_BOOKING',
                            'message': f"❌ CONFLICT: {worker_name} on {current['date']} "
                                     f"scheduled for {current['participant']} ({current['shift_time']}) "
                                     f"AND {next_shift['participant']} ({next_shift['shift_time']})",
                            'worker_id': worker_id,
                            'worker_name': worker_name,
                            'date': current['date'],
                            'conflicts': [current['shift_id'], next_shift['shift_id']],
                            'suggestion': f"Remove {worker_name} from one of these shifts or adjust times"
                        })
                
                # CASE 2: Same participant
                elif current['participant'] == next_shift['participant']:
                    # Overlapping times = invalid
                    if current['end'] > next_shift['start']:
                        self.errors.append({
                            'type': 'INVALID_OVERLAP',
                            'message': f"❌ INVALID: {worker_name} on {current['date']} "
                                     f"has overlapping shifts {current['shift_time']} and {next_shift['shift_time']} "
                                     f"for {current['participant']}",
                            'worker_id': worker_id,
                            'date': current['date'],
                            'shift_ids': [current['shift_id'], next_shift['shift_id']],
                            'suggestion': "Adjust shift times to remove overlap"
                        })
                    
                    # Back-to-back = check if valid split shift
                    elif current['end'] == next_shift['start']:
                        current_funding = current.get('funding_category', 'default')
                        next_funding = next_shift.get('funding_category', 'default')
                        is_marked_split = current.get('is_split_shift') and next_shift.get('is_split_shift')
                        
                        # Different funding categories = valid split shift
                        if current_funding != next_funding:
                            self.suggestions.append({
                                'type': 'VALID_SPLIT_SHIFT',
                                'message': f"✓ SPLIT SHIFT: {worker_name} on {current['date']} "
                                         f"has valid split shift {current['shift_time']} and {next_shift['shift_time']} "
                                         f"(different funding categories)",
                                'worker_id': worker_id,
                                'date': current['date']
                            })
                        # Marked as intentional split shift
                        elif is_marked_split:
                            self.suggestions.append({
                                'type': 'MARKED_SPLIT_SHIFT',
                                'message': f"ℹ️ SPLIT SHIFT: {worker_name} on {current['date']} "
                                         f"has marked split shift {current['shift_time']} and {next_shift['shift_time']}",
                                'worker_id': worker_id,
                                'date': current['date']
                            })
                        # Back-to-back without split shift markers
                        else:
                            self.warnings.append({
                                'type': 'BACK_TO_BACK',
                                'message': f"⚠️ {worker_name} on {current['date']} "
                                         f"has back-to-back shifts {current['shift_time']} and {next_shift['shift_time']} "
                                         f"with no break",
                                'worker_id': worker_id,
                                'date': current['date'],
                                'suggestion': "Consider adding a break between shifts or marking as split shift"
                            })
    
    def check_continuous_hours(self):
        """Check for excessive continuous working hours"""
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
        
        for worker_id, dates in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            
            for date, day_shifts in dates.items():
                total_hours = sum(s['duration'] for s in day_shifts)
                
                if total_hours >= 16:
                    times = ', '.join([f"{s['start']}-{s['end']}" for s in day_shifts])
                    self.errors.append({
                        'type': 'EXCESSIVE_HOURS',
                        'message': f"❌ EXCESSIVE: {worker_name} on {date} "
                                 f"scheduled for {total_hours:.1f} hours ({times})",
                        'worker_id': worker_id,
                        'date': date,
                        'total_hours': total_hours,
                        'suggestion': "Reduce shift hours or add adequate rest breaks"
                    })
                elif total_hours >= 12:
                    times = ', '.join([f"{s['start']}-{s['end']}" for s in day_shifts])
                    self.warnings.append({
                        'type': 'LONG_DAY',
                        'message': f"⚠️ LONG DAY: {worker_name} on {date} "
                                 f"scheduled for {total_hours:.1f} hours ({times})",
                        'worker_id': worker_id,
                        'date': date,
                        'total_hours': total_hours
                    })
    
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
                    self.errors.append({
                        'type': 'MAX_HOURS_EXCEEDED',
                        'message': f"❌ LIMIT EXCEEDED: {worker_name} has {total_hours:.1f}h "
                                 f"(max: {max_hours}h)",
                        'worker_id': worker_id,
                        'total_hours': total_hours,
                        'max_hours': max_hours,
                        'over_by': total_hours - max_hours,
                        'suggestion': f"Reduce hours by {(total_hours - max_hours):.1f}h or adjust worker's limit"
                    })
                elif total_hours >= max_hours * 0.9:
                    self.warnings.append({
                        'type': 'APPROACHING_LIMIT',
                        'message': f"⚠️ APPROACHING LIMIT: {worker_name} has {total_hours:.1f}h "
                                 f"(max: {max_hours}h)",
                        'worker_id': worker_id,
                        'total_hours': total_hours,
                        'max_hours': max_hours,
                        'remaining': max_hours - total_hours
                    })
    
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
        
        for worker_id, schedule in worker_schedule.items():
            worker_name = self._get_worker_name(worker_id)
            schedule.sort(key=lambda x: (x['date'], x['start']))
            
            for i in range(len(schedule) - 1):
                current = schedule[i]
                next_shift = schedule[i + 1]
                
                current_date = datetime.strptime(current['date'], '%Y-%m-%d')
                next_date = datetime.strptime(next_shift['date'], '%Y-%m-%d')
                
                if (next_date - current_date).days <= 1:
                    current_end_mins = self._time_to_minutes(current['end'])
                    next_start_mins = self._time_to_minutes(next_shift['start'])
                    
                    if current_date == next_date:
                        break_hours = (next_start_mins - current_end_mins) / 60
                    else:
                        break_hours = ((24 * 60 - current_end_mins) + next_start_mins) / 60
                    
                    # Minimum 8 hours rest between adjacent days
                    if break_hours < 8 and (current['duration'] + next_shift['duration']) >= 12:
                        self.warnings.append({
                            'type': 'INSUFFICIENT_REST',
                            'message': f"⚠️ SHORT BREAK: {worker_name} has {break_hours:.1f}h rest "
                                     f"between {current['date']} ({current['start']}-{current['end']}) "
                                     f"and {next_shift['date']} ({next_shift['start']}-{next_shift['end']})",
                            'worker_id': worker_id,
                            'break_hours': break_hours,
                            'suggestion': "Consider adding at least 8 hours rest between shifts"
                        })
    
    def check_overnight_staffing(self):
        """Ensure overnight shifts have adequate staffing"""
        for p_code, dates in self.roster.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    start_hour = int(shift['startTime'].split(':')[0])
                    end_hour = int(shift['endTime'].split(':')[0])
                    
                    if start_hour >= 22 or end_hour <= 6:
                        ratio = shift.get('ratio', '1:1')
                        workers = shift.get('workers', [])
                        required = int(ratio.split(':')[0])
                        
                        if len(workers) < required:
                            self.warnings.append({
                                'type': 'OVERNIGHT_UNDERSTAFFED',
                                'message': f"⚠️ OVERNIGHT: {p_code} {date} "
                                         f"{shift['startTime']}-{shift['endTime']} needs {ratio} ratio",
                                'participant': p_code,
                                'date': date,
                                'shift_id': shift.get('id'),
                                'suggestion': f"Add {required - len(workers)} more worker(s) for overnight coverage"
                            })
    
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
    Main validation function with enhanced error reporting
    """
    validator = EnhancedRosterValidator(roster_data, workers)
    result = validator.validate_all()
    
    # Add metadata
    result['validation_time'] = datetime.now().isoformat()
    result['total_errors'] = len(result['errors'])
    result['total_warnings'] = len(result['warnings'])
    result['total_suggestions'] = len(result['suggestions'])
    
    return result
