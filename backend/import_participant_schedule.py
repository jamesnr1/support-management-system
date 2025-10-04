#!/usr/bin/env python3
"""
Import shifts organized by participant (handles 2:1 shifts with multiple workers)
Groups rows with same participant/day/time into single shift with multiple workers
"""

import csv
import json
import requests
from datetime import datetime, timedelta
from collections import defaultdict
import sys

API_BASE = "http://localhost:8001/api"

# Participant name to code mapping
PARTICIPANT_MAP = {
    "Elizabeth (Libby) Narula": "LIB001",
    "Libby Narula": "LIB001",
    "James Narula": "JAM001",
    "Ace Narula": "ACE001",
    "Grace Narula": "GRA001",
    "Milan Narula": "MIL001"
}

# Location mapping
LOCATION_MAP = {
    "Glandore": "1",
    "Plympton Park": "2"
}

# Support type mapping
SUPPORT_TYPE_MAP = {
    "Self Care": "Self-Care",
    "Community Access": "Community Participation",
    "Community Participation": "Community Participation"
}

# Special worker name mappings
WORKER_NAME_OVERRIDES = {
    "Parvinder Kaur": "Parvinder Singh",
}

def get_worker_id_map():
    """Fetch all workers and create name to ID mapping"""
    try:
        response = requests.get(f"{API_BASE}/workers")
        workers = response.json()
        
        worker_map = {}
        for worker in workers:
            worker_map[worker['full_name']] = worker['id']
            worker_map[worker['code']] = worker['id']
            
            # Handle name variations like "Artiben (Arti) Patel" -> "Arti Patel"
            if '(' in worker['full_name'] and ')' in worker['full_name']:
                short_name = worker['full_name'].split('(')[1].split(')')[0].strip()
                after_paren = worker['full_name'].split(')')[1].strip()
                if after_paren:
                    worker_map[f"{short_name} {after_paren}"] = worker['id']
        
        return worker_map
    except Exception as e:
        print(f"⚠️  Error fetching workers: {e}")
        return {}

def parse_time_range(time_str):
    """Parse time range like '6AM-2PM' into 24-hour format"""
    if not time_str or time_str == '':
        return None, None
    
    parts = time_str.replace(' ', '').split('-')
    if len(parts) != 2:
        return None, None
    
    def convert_to_24h(t):
        t = t.upper().strip()
        if 'AM' in t:
            hour = int(t.replace('AM', ''))
            if hour == 12:
                hour = 0
            return f"{hour:02d}:00"
        elif 'PM' in t:
            hour = int(t.replace('PM', ''))
            if hour != 12:
                hour += 12
            return f"{hour:02d}:00"
        return t
    
    return convert_to_24h(parts[0]), convert_to_24h(parts[1])

def clear_roster_weeks(weeks):
    """Clear specified roster weeks"""
    print(f"\n🗑️  Clearing {', '.join(weeks)}...")
    for week in weeks:
        try:
            response = requests.post(f"{API_BASE}/roster/{week}", json={})
            if response.status_code == 200:
                print(f"  ✓ Cleared {week}")
            else:
                print(f"  ⚠️  Failed to clear {week}: {response.status_code}")
        except Exception as e:
            print(f"  ❌ Error clearing {week}: {e}")

def parse_participant_csv(csv_text, week_type='weekB', start_date='2025-09-29'):
    """Parse participant-organized CSV where multiple rows = multiple workers for same shift"""
    
    print(f"\n🔄 Parsing participant CSV for {week_type}...")
    print(f"📅 Week starting: {start_date} (Monday)")
    
    worker_map = get_worker_id_map()
    print(f"✓ Loaded {len(worker_map)} worker mappings")
    
    lines = csv_text.strip().split('\n')
    reader = csv.DictReader(lines)
    
    day_offset = {
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
    }
    
    base_date = datetime.strptime(start_date, '%Y-%m-%d')
    
    # Group shifts by unique key: (participant_code, date, start_time, end_time)
    shift_groups = defaultdict(lambda: {
        'workers': [],
        'location': None,
        'support_type': None,
        'ratio': None,
        'hours': None
    })
    
    for row in reader:
        if not row.get('Day') or 'TOTAL' in row.get('Day', ''):
            continue
        
        participant_name = row.get('Participant', '').strip()
        day = row.get('Day', '').strip()
        time_range = row.get('Shift Time', '').strip()
        worker_name = row.get('Support Worker', '').strip()
        location_name = row.get('Location', '').strip()
        support_type = row.get('Support Type', '').strip()
        hours = row.get('Hours', '').strip()
        
        if not participant_name or not day or not time_range or not worker_name:
            continue
        
        # Map participant
        participant_code = PARTICIPANT_MAP.get(participant_name)
        if not participant_code:
            print(f"⚠️  Unknown participant: {participant_name}")
            continue
        
        # Apply worker name override if needed
        if worker_name in WORKER_NAME_OVERRIDES:
            worker_name = WORKER_NAME_OVERRIDES[worker_name]
        
        # Get worker ID
        worker_id = worker_map.get(worker_name)
        if not worker_id:
            print(f"⚠️  Worker not found: {worker_name}")
            continue
        
        # Parse times
        start_time, end_time = parse_time_range(time_range)
        if not start_time or not end_time:
            print(f"⚠️  Invalid time: {time_range}")
            continue
        
        # Calculate date
        offset = day_offset.get(day, 0)
        shift_date = (base_date + timedelta(days=offset)).strftime('%Y-%m-%d')
        
        # Create unique shift key
        shift_key = (participant_code, shift_date, start_time, end_time)
        
        # Add worker to this shift group
        shift_groups[shift_key]['workers'].append(str(worker_id))
        shift_groups[shift_key]['location'] = LOCATION_MAP.get(location_name, "2")
        shift_groups[shift_key]['support_type'] = SUPPORT_TYPE_MAP.get(support_type, "Self-Care")
        shift_groups[shift_key]['hours'] = hours
    
    # Now convert grouped shifts to final format
    shifts_by_participant = defaultdict(lambda: defaultdict(list))
    sequence_tracker = defaultdict(lambda: defaultdict(int))
    
    for (participant_code, date, start_time, end_time), shift_data in shift_groups.items():
        # Generate sequence number
        sequence_tracker[participant_code][date] += 1
        sequence = sequence_tracker[participant_code][date]
        
        # Generate shift number in format: L2025092901
        letter = participant_code[0].upper()
        date_formatted = date.replace('-', '')
        shift_number = f"{letter}{date_formatted}{sequence:02d}"
        
        # Calculate duration
        start_h = int(start_time.split(':')[0])
        end_h = int(end_time.split(':')[0])
        if end_h < start_h:
            end_h += 24
        duration = float(end_h - start_h)
        
        # Determine ratio based on worker count
        worker_count = len(shift_data['workers'])
        ratio = f"{worker_count}:1"
        
        # Create shift object
        shift = {
            "id": f"{int(datetime.now().timestamp() * 1000)}_{sequence}",
            "date": date,
            "shiftNumber": shift_number,
            "startTime": start_time,
            "endTime": end_time,
            "supportType": shift_data['support_type'],
            "ratio": ratio,
            "workers": shift_data['workers'],
            "location": shift_data['location'],
            "notes": "",
            "duration": str(duration)
        }
        
        shifts_by_participant[participant_code][date].append(shift)
        
        worker_names = ', '.join([f"Worker {w}" for w in shift_data['workers']])
        print(f"  ✓ {shift_number}: {participant_code} {date} {start_time}-{end_time} ({worker_count} workers)")
    
    return {week_type: dict(shifts_by_participant)}

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_participant_schedule.py <week_type> [start_date]")
        print("Example: python import_participant_schedule.py weekB 2025-09-29")
        print("\nThen paste your CSV data and press Ctrl+D")
        sys.exit(1)
    
    week_type = sys.argv[1]
    start_date = sys.argv[2] if len(sys.argv) > 2 else '2025-09-29'
    
    # Clear only the week being imported
    weeks_to_clear = [week_type]
    clear_roster_weeks(weeks_to_clear)
    
    print(f"\n📋 Reading CSV from stdin...")
    print(f"   Week: {week_type}")
    print(f"   Start: {start_date}")
    
    csv_text = sys.stdin.read()
    
    # Parse and group shifts
    shifts_data = parse_participant_csv(csv_text, week_type, start_date)
    
    # Upload to API
    print(f"\n🚀 Uploading {week_type} to API...")
    try:
        roster_data = shifts_data[week_type]
        response = requests.post(
            f"{API_BASE}/roster/{week_type}",
            json=roster_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            total_shifts = sum(len(shifts) for dates in roster_data.values() for shifts in dates.values())
            print(f"✅ {week_type.upper()} uploaded successfully!")
            print(f"   Total shifts: {total_shifts}")
            print(f"   Participants: {len(roster_data)}")
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   {response.text}")
            return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    print("\n🎉 Import complete!")
    return 0

if __name__ == "__main__":
    sys.exit(main())

