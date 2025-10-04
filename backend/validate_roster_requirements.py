#!/usr/bin/env python3
"""
Roster Validation Script
Checks if a roster meets participant requirements from PARTICIPANT_REQUIREMENTS.json
"""

import json
from datetime import datetime, timedelta
from collections import defaultdict

def load_requirements():
    with open('../PARTICIPANT_REQUIREMENTS.json', 'r') as f:
        return json.load(f)

def load_roster(roster_file):
    with open(roster_file, 'r') as f:
        return json.load(f)

def calculate_hours(start_time, end_time):
    """Calculate duration between HH:MM times"""
    start_h, start_m = map(int, start_time.split(':'))
    end_h, end_m = map(int, end_time.split(':'))
    
    start_mins = start_h * 60 + start_m
    end_mins = end_h * 60 + end_m
    
    # Handle overnight shifts
    if end_mins < start_mins:
        end_mins += 24 * 60
    
    return (end_mins - start_mins) / 60

def is_weekday(date_str):
    """Check if date is weekday (Mon-Fri)"""
    date = datetime.strptime(date_str, '%Y-%m-%d')
    return date.weekday() < 5

def validate_grace_schedule(roster_data, requirements):
    """Validate Grace's schedule against requirements"""
    errors = []
    warnings = []
    
    grace_req = requirements['participants']['GRA001']
    grace_data = roster_data.get('GRA001', {})
    
    for date, shifts in grace_data.items():
        is_wd = is_weekday(date)
        total_day = 0
        total_evening = 0
        has_evening = False
        
        for shift in shifts:
            start = shift['startTime']
            end = shift['endTime']
            duration = shift['duration']
            
            # Check for evening coverage (20:00-22:00)
            start_h = int(start.split(':')[0])
            end_h = int(end.split(':')[0])
            
            if start_h >= 20 or (start_h < 20 and end_h > 20):
                has_evening = True
                # Calculate evening portion
                if start_h < 20:
                    evening_start = 20
                else:
                    evening_start = start_h
                evening_duration = calculate_hours(f"{evening_start}:00", end)
                total_evening += evening_duration
            else:
                total_day += duration
        
        total_hours = total_day + total_evening
        
        if is_wd:
            # Weekday validation
            expected = 8.5  # 6.5 day + 2 evening
            
            if not has_evening:
                errors.append(f"❌ Grace {date} (WEEKDAY): MISSING 8pm-10pm evening shift!")
            
            if abs(total_hours - expected) > 0.5:
                errors.append(f"❌ Grace {date} (WEEKDAY): {total_hours}h (expected ~8.5h)")
            
            if total_evening < 1.5 and has_evening:
                warnings.append(f"⚠️  Grace {date} (WEEKDAY): Evening hours {total_evening}h (expected 2h)")
        
        else:
            # Weekend validation
            expected = 16
            
            if abs(total_hours - expected) > 0.5:
                errors.append(f"❌ Grace {date} (WEEKEND): {total_hours}h (expected 16h)")
    
    return errors, warnings

def validate_james_schedule(roster_data, requirements):
    """Validate James's 24/7 coverage"""
    errors = []
    warnings = []
    
    james_data = roster_data.get('JAM001', {})
    
    for date, shifts in james_data.items():
        # Check 24/7 coverage
        covered_minutes = set()
        
        for shift in shifts:
            start = shift['startTime']
            end = shift['endTime']
            
            start_h, start_m = map(int, start.split(':'))
            end_h, end_m = map(int, end.split(':'))
            
            start_mins = start_h * 60 + start_m
            end_mins = end_h * 60 + end_m
            
            if end_mins < start_mins:
                end_mins += 24 * 60
            
            for minute in range(start_mins, end_mins):
                covered_minutes.add(minute % (24 * 60))
        
        if len(covered_minutes) < 24 * 60:
            gaps = 24 * 60 - len(covered_minutes)
            errors.append(f"❌ James {date}: {gaps} minutes NOT covered (not 24/7)")
        
        # Check 2:1 ratio
        for shift in shifts:
            workers = shift.get('workers', [])
            if len(workers) < 2:
                if shift.get('note') and 'overlap' in shift.get('note', '').lower():
                    # Overlapping shift, may be intentional
                    warnings.append(f"⚠️  James {date} {shift['startTime']}-{shift['endTime']}: Only {len(workers)} worker (overlap shift)")
                else:
                    errors.append(f"❌ James {date} {shift['startTime']}-{shift['endTime']}: Only {len(workers)} worker (need 2:1)")
    
    return errors, warnings

def validate_milan_weekend(roster_data, requirements):
    """Validate Milan weekend separate shifts"""
    errors = []
    warnings = []
    
    milan_data = roster_data.get('MIL001', {})
    
    for date, shifts in milan_data.items():
        if not is_weekday(date):
            # Check for separate self-care and community shifts
            types = [s.get('supportType', '') for s in shifts]
            
            if 'Self-Care' not in types:
                errors.append(f"❌ Milan {date}: Missing Self-Care shift")
            
            if 'Community Participation' not in types:
                errors.append(f"❌ Milan {date}: Missing Community Participation shift")
            
            # Check each is 3 hours
            for shift in shifts:
                if shift['duration'] != 3:
                    errors.append(f"❌ Milan {date}: Shift is {shift['duration']}h (expected 3h)")
    
    return errors, warnings

def validate_worker_hours(roster_data, worker_targets):
    """Calculate actual worker hours and compare to targets"""
    worker_hours = defaultdict(float)
    
    for participant, dates in roster_data.items():
        for date, shifts in dates.items():
            for shift in shifts:
                workers = shift.get('workers', [])
                duration = shift['duration']
                
                for worker_id in workers:
                    worker_hours[worker_id] += duration
    
    # Report
    report = []
    for worker_id, hours in sorted(worker_hours.items()):
        target = worker_targets.get(worker_id, "N/A")
        report.append(f"Worker {worker_id}: {hours}h (target: {target})")
    
    return report

def main():
    print("=" * 60)
    print("ROSTER VALIDATION REPORT")
    print("=" * 60)
    print()
    
    # Load data
    requirements = load_requirements()
    roster = load_roster('roster_oct7-13_CORRECTED.json')
    
    all_errors = []
    all_warnings = []
    
    # Validate Grace
    print("📋 VALIDATING GRACE...")
    errors, warnings = validate_grace_schedule(roster, requirements)
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    # Validate James
    print("📋 VALIDATING JAMES...")
    errors, warnings = validate_james_schedule(roster, requirements)
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    # Validate Milan
    print("📋 VALIDATING MILAN...")
    errors, warnings = validate_milan_weekend(roster, requirements)
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    # Print results
    print()
    print("=" * 60)
    if all_errors:
        print(f"❌ ERRORS FOUND: {len(all_errors)}")
        print("=" * 60)
        for error in all_errors:
            print(error)
        print()
    else:
        print("✅ NO ERRORS FOUND!")
        print()
    
    if all_warnings:
        print("=" * 60)
        print(f"⚠️  WARNINGS: {len(all_warnings)}")
        print("=" * 60)
        for warning in all_warnings:
            print(warning)
    
    print()
    print("=" * 60)

if __name__ == '__main__':
    main()

