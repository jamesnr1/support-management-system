#!/usr/bin/env python3
"""
Analyze roster for scheduling issues
- Double bookings (worker assigned to 2 participants at same time)
- Back-to-back shifts (no breaks)
- Excessive continuous hours
"""

import requests
import json
from datetime import datetime, timedelta
from collections import defaultdict

API_BASE = "http://localhost:8001/api"

def get_worker_name(worker_id, workers_map):
    return workers_map.get(str(worker_id), f"Worker-{worker_id}")

def time_to_minutes(time_str):
    h, m = time_str.split(':')
    return int(h) * 60 + int(m)

def times_overlap(start1, end1, start2, end2):
    s1 = time_to_minutes(start1)
    e1 = time_to_minutes(end1)
    s2 = time_to_minutes(start2)
    e2 = time_to_minutes(end2)
    
    if e1 < s1: e1 += 1440  # Overnight
    if e2 < s2: e2 += 1440
    
    return s1 < e2 and s2 < e1

def analyze_week(week_type):
    print(f"\n{'='*70}")
    print(f"🔍 ANALYZING {week_type.upper()} FOR ISSUES")
    print(f"{'='*70}\n")
    
    # Fetch data
    response = requests.get(f"{API_BASE}/roster/{week_type}")
    roster_data = response.json()
    
    workers_response = requests.get(f"{API_BASE}/workers")
    workers = workers_response.json()
    workers_map = {w['id']: w['full_name'] for w in workers}
    
    participants_response = requests.get(f"{API_BASE}/participants")
    participants = participants_response.json()
    participants_map = {p['code']: p['full_name'] for p in participants}
    
    # Track worker shifts across all participants
    worker_shifts = defaultdict(list)
    
    for participant_code, dates in roster_data.items():
        participant_name = participants_map.get(participant_code, participant_code)
        for date, shifts in dates.items():
            for shift in shifts:
                for worker_id in shift.get('workers', []):
                    worker_shifts[worker_id].append({
                        'date': date,
                        'start': shift['startTime'],
                        'end': shift['endTime'],
                        'participant': participant_name,
                        'shiftNumber': shift.get('shiftNumber', ''),
                        'duration': float(shift.get('duration', 0))
                    })
    
    # Analyze issues
    issues = {
        'double_bookings': [],
        'back_to_back': [],
        'excessive_hours': [],
        'triple_shifts': []
    }
    
    for worker_id, shifts in worker_shifts.items():
        worker_name = get_worker_name(worker_id, workers_map)
        
        # Sort shifts by date and start time
        shifts_sorted = sorted(shifts, key=lambda s: (s['date'], s['start']))
        
        # Check for conflicts and patterns
        for i, shift in enumerate(shifts_sorted):
            # Check for double booking (same time, different participants)
            for j in range(i+1, len(shifts_sorted)):
                other_shift = shifts_sorted[j]
                if shift['date'] == other_shift['date']:
                    if times_overlap(shift['start'], shift['end'], other_shift['start'], other_shift['end']):
                        if shift['participant'] != other_shift['participant']:
                            issues['double_bookings'].append({
                                'worker': worker_name,
                                'date': shift['date'],
                                'shift1': f"{shift['participant']} {shift['start']}-{shift['end']}",
                                'shift2': f"{other_shift['participant']} {other_shift['start']}-{other_shift['end']}"
                            })
            
            # Check for back-to-back shifts
            if i < len(shifts_sorted) - 1:
                next_shift = shifts_sorted[i+1]
                if shift['date'] == next_shift['date']:
                    if shift['end'] == next_shift['start']:
                        combined_hours = shift['duration'] + next_shift['duration']
                        issues['back_to_back'].append({
                            'worker': worker_name,
                            'date': shift['date'],
                            'time': f"{shift['start']}-{next_shift['end']}",
                            'hours': combined_hours,
                            'shifts': f"{shift['participant']} + {next_shift['participant']}"
                        })
        
        # Count shifts per day
        shifts_by_date = defaultdict(list)
        for shift in shifts_sorted:
            shifts_by_date[shift['date']].append(shift)
        
        for date, day_shifts in shifts_by_date.items():
            if len(day_shifts) >= 3:
                total_hours = sum(s['duration'] for s in day_shifts)
                issues['triple_shifts'].append({
                    'worker': worker_name,
                    'date': date,
                    'shift_count': len(day_shifts),
                    'total_hours': total_hours,
                    'shifts': ', '.join([f"{s['start']}-{s['end']}" for s in day_shifts])
                })
            elif len(day_shifts) == 2:
                # Check if 16+ hours
                total_hours = sum(s['duration'] for s in day_shifts)
                if total_hours >= 16:
                    issues['excessive_hours'].append({
                        'worker': worker_name,
                        'date': date,
                        'hours': total_hours,
                        'shifts': ', '.join([f"{s['start']}-{s['end']}" for s in day_shifts])
                    })
    
    # Print results
    print("🚨 DOUBLE BOOKINGS (Same worker, same time, different participants):")
    if issues['double_bookings']:
        for issue in issues['double_bookings']:
            print(f"  ❌ {issue['worker']} on {issue['date']}:")
            print(f"     • {issue['shift1']}")
            print(f"     • {issue['shift2']}")
    else:
        print("  ✅ None found")
    
    print("\n⚠️  BACK-TO-BACK SHIFTS (No break between shifts):")
    if issues['back_to_back']:
        for issue in issues['back_to_back']:
            print(f"  • {issue['worker']} on {issue['date']}: {issue['time']} ({issue['hours']}h)")
            print(f"    {issue['shifts']}")
    else:
        print("  ✅ None found")
    
    print("\n⚠️  TRIPLE SHIFTS (3+ shifts in one day):")
    if issues['triple_shifts']:
        for issue in issues['triple_shifts']:
            print(f"  • {issue['worker']} on {issue['date']}: {issue['shift_count']} shifts ({issue['total_hours']}h)")
            print(f"    Times: {issue['shifts']}")
    else:
        print("  ✅ None found")
    
    print("\n⚠️  EXCESSIVE HOURS (16+ hours in one day):")
    if issues['excessive_hours']:
        for issue in issues['excessive_hours']:
            print(f"  • {issue['worker']} on {issue['date']}: {issue['hours']}h")
            print(f"    Shifts: {issue['shifts']}")
    else:
        print("  ✅ None found")
    
    total_issues = (len(issues['double_bookings']) + len(issues['back_to_back']) + 
                   len(issues['triple_shifts']) + len(issues['excessive_hours']))
    
    print(f"\n{'='*70}")
    print(f"📊 TOTAL ISSUES FOUND: {total_issues}")
    print(f"{'='*70}\n")
    
    return total_issues

if __name__ == "__main__":
    import sys
    week_type = sys.argv[1] if len(sys.argv) > 1 else 'weekB'
    analyze_week(week_type)











