"""
Core worker scheduling logic - adapted from corrected_worker_logic.js
"""
from datetime import datetime, time as dt_time, timedelta
from typing import List, Dict, Any, Optional, Tuple
import asyncpg
from database import Database
import logging

logger = logging.getLogger(__name__)

def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM time string to minutes"""
    try:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    except (ValueError, AttributeError):
        return 0

def calculate_shift_hours(start_time: str, end_time: str) -> float:
    """Calculate shift duration in hours, handling overnight shifts"""
    start = time_to_minutes(start_time)
    end = time_to_minutes(end_time)
    if end < start:  # Handle overnight shifts
        end += 24 * 60
    return (end - start) / 60

def extract_adelaide_datetime(timestamptz: datetime) -> Dict[str, Any]:
    """Extract Adelaide timezone date and time components"""
    # For simplicity, using UTC offset. In production, use proper timezone handling
    adelaide_dt = timestamptz + timedelta(hours=10.5)  # Adelaide is UTC+10:30
    
    return {
        'date': adelaide_dt.strftime('%Y-%m-%d'),
        'time': adelaide_dt.strftime('%H:%M'),
        'weekday': adelaide_dt.weekday() + 1 % 7  # Convert to 0=Sunday format
    }

async def get_available_workers(shift_start: datetime, shift_end: datetime) -> List[Dict[str, Any]]:
    """Get available workers for a shift timeframe"""
    try:
        start_info = extract_adelaide_datetime(shift_start)
        end_info = extract_adelaide_datetime(shift_end)
        
        weekday = start_info['weekday']
        start_minutes = time_to_minutes(start_info['time'])
        end_minutes = time_to_minutes(end_info['time'])
        
        # Handle overnight shifts
        if end_minutes < start_minutes:
            end_minutes += 24 * 60
        
        pool = await Database.get_connection()
        async with pool.acquire() as conn:
            # Get active workers
            workers = await conn.fetch("""
                SELECT id, full_name, max_hours 
                FROM support_workers 
                WHERE status = 'Active'
            """)
            
            if not workers:
                return []
            
            # Check unavailability periods
            shift_date = start_info['date']
            unavailable_workers = await conn.fetch("""
                SELECT worker_id 
                FROM unavailability_periods 
                WHERE from_date <= $1 AND to_date >= $1
            """, shift_date)
            
            unavailable_ids = {row['worker_id'] for row in unavailable_workers}
            available_workers = [w for w in workers if w['id'] not in unavailable_ids]
            
            # Check availability rules
            availability_rules = await conn.fetch("""
                SELECT * FROM availability_rule WHERE weekday = $1
            """, weekday)
            
            # Filter workers with proper availability
            final_workers = []
            for worker in available_workers:
                worker_rules = [rule for rule in availability_rules if rule['worker_id'] == worker['id']]
                
                # Workers must have availability rules to be assignable
                if not worker_rules:
                    continue
                
                # Check if any rule allows this time slot
                is_available = False
                for rule in worker_rules:
                    if rule['is_full_day']:
                        is_available = True
                        break
                    
                    if not rule['from_time'] or not rule['to_time']:
                        continue
                    
                    rule_start = time_to_minutes(str(rule['from_time']))
                    rule_end = time_to_minutes(str(rule['to_time']))
                    
                    # Handle overnight availability
                    if rule['wraps_midnight']:
                        rule_end += 24 * 60
                    
                    # Check time compatibility
                    if rule['wraps_midnight'] and end_minutes > 24 * 60:
                        # Overnight shift with overnight availability
                        if start_minutes >= rule_start or (end_minutes - 24 * 60) <= (rule_end - 24 * 60):
                            is_available = True
                            break
                    elif not rule['wraps_midnight'] and end_minutes > 24 * 60:
                        # Overnight shift with daytime availability - not compatible
                        continue
                    else:
                        # Regular shift timing check
                        if start_minutes >= rule_start and end_minutes <= rule_end:
                            is_available = True
                            break
                
                if is_available:
                    final_workers.append(dict(worker))
            
            return final_workers
            
    except Exception as e:
        logger.error(f"Error getting available workers: {e}")
        return []

async def check_worker_conflicts(worker_id: int, shift_date: str, start_time: str, end_time: str, 
                               roster_data: Dict[str, Any]) -> Dict[str, Any]:
    """Check for scheduling conflicts for a worker"""
    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)
    if end_minutes < start_minutes:
        end_minutes += 24 * 60  # Handle overnight
    
    result = {'hasConflict': False, 'conflictDetails': ''}
    
    # Check across all rosters
    rosters = [
        {'name': 'weekA', 'data': roster_data.get('weekA', {})},
        {'name': 'weekB', 'data': roster_data.get('weekB', {})},
        {'name': 'nextA', 'data': roster_data.get('nextA', {})},
        {'name': 'nextB', 'data': roster_data.get('nextB', {})}
    ]
    
    for roster in rosters:
        for participant_code, participant_roster in roster['data'].items():
            for date_str, day_shifts in participant_roster.items():
                for shift in day_shifts:
                    # Check if worker is assigned
                    workers = shift.get('workers', [])
                    is_assigned = (worker_id in workers or 
                                 str(worker_id) in workers or 
                                 int(worker_id) in [int(w) for w in workers if str(w).isdigit()])
                    
                    if not is_assigned:
                        continue
                    
                    # Check time conflicts
                    if shift.get('date') == shift_date or date_str == shift_date:
                        shift_start = time_to_minutes(shift.get('startTime', ''))
                        shift_end = time_to_minutes(shift.get('endTime', ''))
                        if shift_end < shift_start:
                            shift_end += 24 * 60
                        
                        # Check for overlap
                        if start_minutes < shift_end and end_minutes > shift_start:
                            result['hasConflict'] = True
                            result['conflictDetails'] = f"Overlap with existing shift {shift.get('startTime')}-{shift.get('endTime')} on {date_str}"
                            return result
                    
                    # Check break requirements
                    break_violation = check_break_requirements(
                        date_str, shift.get('startTime'), shift.get('endTime'),
                        shift_date, start_time, end_time
                    )
                    
                    if break_violation['hasViolation']:
                        result['hasConflict'] = True
                        result['conflictDetails'] = break_violation['message']
                        return result
    
    return result

def check_break_requirements(existing_date: str, existing_start: str, existing_end: str,
                           new_date: str, new_start: str, new_end: str) -> Dict[str, Any]:
    """Check break requirements between shifts"""
    try:
        existing_date_obj = datetime.strptime(existing_date, '%Y-%m-%d').date()
        new_date_obj = datetime.strptime(new_date, '%Y-%m-%d').date()
        day_diff = abs((new_date_obj - existing_date_obj).days)
        
        # Same day - require 2 hour break
        if day_diff == 0:
            existing_start_min = time_to_minutes(existing_start)
            existing_end_min = time_to_minutes(existing_end)
            if existing_end_min < existing_start_min:
                existing_end_min += 24 * 60
                
            new_start_min = time_to_minutes(new_start)
            new_end_min = time_to_minutes(new_end)
            if new_end_min < new_start_min:
                new_end_min += 24 * 60
            
            # Calculate gaps
            gap_after_existing = new_start_min - existing_end_min
            gap_before_existing = existing_start_min - new_end_min
            
            if ((gap_after_existing > 0 and gap_after_existing < 120) or
                (gap_before_existing > 0 and gap_before_existing < 120)):
                return {
                    'hasViolation': True,
                    'message': f'Insufficient same-day break: {max(gap_after_existing, gap_before_existing)} minutes (minimum 2 hours)'
                }
        
        # Adjacent days - require 10 hour break
        elif day_diff == 1:
            if new_date_obj > existing_date_obj:
                later_start = new_start
                earlier_end = existing_end
            else:
                later_start = existing_start
                earlier_end = new_end
            
            earlier_end_min = time_to_minutes(earlier_end)
            later_start_min = time_to_minutes(later_start)
            
            # Add 24 hours to later start to account for next day
            gap_minutes = (later_start_min + 24 * 60) - earlier_end_min
            
            if gap_minutes < 600:  # Less than 10 hours
                return {
                    'hasViolation': True,
                    'message': f'Insufficient break between days: {gap_minutes} minutes (minimum 10 hours)'
                }
        
        return {'hasViolation': False}
        
    except Exception as e:
        logger.error(f"Error checking break requirements: {e}")
        return {'hasViolation': False}

async def calculate_worker_hours(worker_id: int, roster_data: Dict[str, Any]) -> Dict[str, float]:
    """Calculate worker hours across all roster periods"""
    result = {
        'weekA': 0.0,
        'weekB': 0.0,
        'nextA': 0.0,
        'nextB': 0.0,
        'total': 0.0
    }
    
    rosters = {
        'weekA': roster_data.get('weekA', {}),
        'weekB': roster_data.get('weekB', {}),
        'nextA': roster_data.get('nextA', {}),
        'nextB': roster_data.get('nextB', {})
    }
    
    for roster_type, roster in rosters.items():
        for participant_code, participant_roster in roster.items():
            for date_str, day_shifts in participant_roster.items():
                for shift in day_shifts:
                    # Check worker assignment
                    workers = shift.get('workers', [])
                    is_assigned = (worker_id in workers or 
                                 str(worker_id) in workers or 
                                 int(worker_id) in [int(w) for w in workers if str(w).isdigit()])
                    
                    if is_assigned:
                        hours = calculate_shift_hours(
                            shift.get('startTime', '00:00'),
                            shift.get('endTime', '00:00')
                        )
                        result[roster_type] += hours
                        result['total'] += hours
    
    return result

def validate_fair_work(worker_id: int, shift_date: str, start_time: str, end_time: str,
                      roster_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate shift against fair work regulations"""
    result = {
        'isValid': True,
        'warnings': [],
        'canOverride': False
    }
    
    # Calculate shift duration
    duration = calculate_shift_hours(start_time, end_time)
    if duration > 10:
        result['warnings'].append(f'Shift exceeds 10 hours ({duration:.1f} hours)')
        result['canOverride'] = True
    
    # Check break requirements using conflict detection
    conflict_check = check_worker_conflicts(worker_id, shift_date, start_time, end_time, roster_data)
    if conflict_check['hasConflict']:
        result['isValid'] = False
        result['warnings'].append(conflict_check['conflictDetails'])
        
        # Only allow override for break violations, not overlaps
        if 'overlap' not in conflict_check['conflictDetails'].lower():
            result['canOverride'] = True
    
    return result