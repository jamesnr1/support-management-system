#!/usr/bin/env python3
"""
Auto-fix roster scheduling issues:
1. Remove back-to-back 16+ hour shifts for same worker
2. Keep the first shift, remove worker from second shift
"""

import requests
import json
from collections import defaultdict

API_BASE = "http://localhost:8001/api"

def autofix_week(week_type):
    print(f"\n🔧 AUTO-FIXING {week_type.upper()}...")
    
    # Fetch data
    response = requests.get(f"{API_BASE}/roster/{week_type}")
    roster_data = response.json()
    
    workers_response = requests.get(f"{API_BASE}/workers")
    workers = workers_response.json()
    workers_map = {w['id']: w['full_name'] for w in workers}
    
    fixes_applied = 0
    
    # Track worker shifts by date
    worker_shifts_by_date = defaultdict(lambda: defaultdict(list))
    
    for participant_code, dates in roster_data.items():
        for date, shifts in dates.items():
            for shift_idx, shift in enumerate(shifts):
                for worker_id in shift.get('workers', []):
                    worker_shifts_by_date[worker_id][date].append({
                        'participant': participant_code,
                        'shift': shift,
                        'shift_idx': shift_idx,
                        'date': date
                    })
    
    # Fix back-to-back shifts (16+ hours)
    for worker_id, dates in worker_shifts_by_date.items():
        worker_name = workers_map.get(str(worker_id), f"Worker-{worker_id}")
        
        for date, day_shifts in dates.items():
            # Sort by start time
            day_shifts_sorted = sorted(day_shifts, key=lambda s: s['shift']['startTime'])
            
            # Check for back-to-back patterns
            for i in range(len(day_shifts_sorted) - 1):
                current = day_shifts_sorted[i]
                next_shift = day_shifts_sorted[i+1]
                
                # If shifts are back-to-back (end time = start time)
                if current['shift']['endTime'] == next_shift['shift']['startTime']:
                    # Calculate total hours
                    current_duration = float(current['shift'].get('duration', 0))
                    next_duration = float(next_shift['shift'].get('duration', 0))
                    total_hours = current_duration + next_duration
                    
                    if total_hours >= 16:
                        # Remove worker from second shift
                        participant_code = next_shift['participant']
                        shift_date = next_shift['date']
                        shift_idx = next_shift['shift_idx']
                        
                        # Find and update the shift
                        roster_data[participant_code][shift_date][shift_idx]['workers'] = [
                            w for w in roster_data[participant_code][shift_date][shift_idx]['workers'] 
                            if w != worker_id
                        ]
                        
                        print(f"  ✓ Removed {worker_name} from {participant_code} {shift_date} {next_shift['shift']['startTime']}-{next_shift['shift']['endTime']}")
                        print(f"    Reason: Back-to-back {total_hours}h shift")
                        fixes_applied += 1
    
    # Save fixed data
    if fixes_applied > 0:
        print(f"\n💾 Saving fixed roster...")
        response = requests.post(f"{API_BASE}/roster/{week_type}", json=roster_data)
        if response.status_code == 200:
            print(f"✅ {week_type.upper()} auto-fixed!")
            print(f"   Fixes applied: {fixes_applied}")
        else:
            print(f"❌ Failed to save fixes")
    else:
        print(f"✅ No fixes needed for {week_type}")
    
    return fixes_applied

if __name__ == "__main__":
    import sys
    week_type = sys.argv[1] if len(sys.argv) > 1 else 'weekB'
    autofix_week(week_type)











