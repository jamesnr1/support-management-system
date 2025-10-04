#!/usr/bin/env python3
"""
Parse CSV shift data and convert to JSON format for bulk import
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
    "Community Access": "Community Participation"
}

# Special worker name mappings (for name variations)
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
            # Map by full name
            worker_map[worker['full_name']] = worker['id']
            # Also map by code
            worker_map[worker['code']] = worker['id']
            
            # Add variations for common name formats
            # "Artiben (Arti) Patel" -> "Arti Patel"
            if '(' in worker['full_name'] and ')' in worker['full_name']:
                # Extract short name from parentheses
                short_name = worker['full_name'].split('(')[1].split(')')[0].strip()
                # Get last name from full name (everything after the closing paren)
                after_paren = worker['full_name'].split(')')[1].strip()
                if after_paren:
                    # Map "Arti Patel" to same ID
                    worker_map[f"{short_name} {after_paren}"] = worker['id']
        
        return worker_map
    except Exception as e:
        print(f"⚠️  Error fetching workers: {e}")
        print("⚠️  Using empty worker map - worker IDs will be missing")
        return {}

def parse_time_range(time_str):
    """Parse time range like '6AM-2PM' into startTime and endTime"""
    if not time_str or pd.isna(time_str):
        return None, None
    
    parts = time_str.replace(' ', '').split('-')
    if len(parts) != 2:
        return None, None
    
    start, end = parts
    
    # Convert to 24-hour format
    def convert_to_24h(time_str):
        time_str = time_str.upper().strip()
        
        # Handle formats like "6AM", "10PM", "2PM"
        if 'AM' in time_str:
            hour = int(time_str.replace('AM', ''))
            if hour == 12:
                hour = 0
            return f"{hour:02d}:00"
        elif 'PM' in time_str:
            hour = int(time_str.replace('PM', ''))
            if hour != 12:
                hour += 12
            return f"{hour:02d}:00"
        else:
            return time_str
    
    return convert_to_24h(start), convert_to_24h(end)

def calculate_hours(start_time, end_time):
    """Calculate duration between start and end time"""
    try:
        start_h = int(start_time.split(':')[0])
        end_h = int(end_time.split(':')[0])
        
        # Handle overnight shifts
        if end_h < start_h:
            end_h += 24
        
        return float(end_h - start_h)
    except:
        return 0.0

def parse_csv_to_shifts(csv_text, week_type='weekB', start_date='2025-10-06'):
    """Parse CSV text into shifts JSON structure"""
    
    print(f"🔄 Parsing CSV data for {week_type}...")
    print(f"📅 Using start date: {start_date}")
    
    # Get worker mappings
    worker_map = get_worker_id_map()
    print(f"✓ Loaded {len(worker_map)} workers")
    
    # Parse CSV
    lines = csv_text.strip().split('\n')
    reader = csv.DictReader(lines)
    
    # Day to date offset (assuming Monday = day 0 of the week)
    day_offset = {
        'Monday': 0,
        'Tuesday': 1,
        'Wednesday': 2,
        'Thursday': 3,
        'Friday': 4,
        'Saturday': 5,
        'Sunday': 6
    }
    
    # Group shifts by participant and date
    shifts_by_participant = defaultdict(lambda: defaultdict(list))
    
    base_date = datetime.strptime(start_date, '%Y-%m-%d')
    
    for row in reader:
        # Skip total rows
        if not row.get('Day') or 'TOTAL' in row.get('Day', ''):
            continue
        
        worker_name = row.get('Support Worker', '').strip()
        day = row.get('Day', '').strip()
        time_range = row.get('Shift Time', '').strip()
        participant_name = row.get('Participant', '').strip()
        location_name = row.get('Location', '').strip()
        support_type = row.get('Support Type', '').strip()
        
        if not worker_name or not day or not time_range or not participant_name:
            continue
        
        # Map participant to code
        participant_code = PARTICIPANT_MAP.get(participant_name)
        if not participant_code:
            print(f"⚠️  Unknown participant: {participant_name}")
            continue
        
        # Check for worker name overrides
        if worker_name in WORKER_NAME_OVERRIDES:
            worker_name = WORKER_NAME_OVERRIDES[worker_name]
        
        # Get worker ID
        worker_id = worker_map.get(worker_name)
        if not worker_id:
            print(f"⚠️  Worker not found: {worker_name}")
            continue
        
        # Parse time range
        start_time, end_time = parse_time_range(time_range)
        if not start_time or not end_time:
            print(f"⚠️  Invalid time range: {time_range}")
            continue
        
        # Calculate date
        offset = day_offset.get(day, 0)
        shift_date = (base_date + timedelta(days=offset)).strftime('%Y-%m-%d')
        
        # Map location
        location_id = LOCATION_MAP.get(location_name, "2")  # Default to Plympton Park
        
        # Map support type
        support_type_mapped = SUPPORT_TYPE_MAP.get(support_type, "Self-Care")
        
        # Calculate duration
        duration = calculate_hours(start_time, end_time)
        
        # Create shift object
        shift = {
            "startTime": start_time,
            "endTime": end_time,
            "supportType": support_type_mapped,
            "ratio": "2:1",  # Default, can be adjusted
            "workers": [str(worker_id)],
            "location": location_id,
            "notes": "",
            "duration": str(duration)
        }
        
        shifts_by_participant[participant_code][shift_date].append(shift)
        print(f"  ✓ {worker_name} -> {participant_name} on {day} ({start_time}-{end_time})")
    
    # Build final structure
    result = {
        week_type: dict(shifts_by_participant)
    }
    
    return result

# Make pandas optional
try:
    import pandas as pd
except ImportError:
    pd = None
    # Simple fallback for isna
    class pd:
        @staticmethod
        def isna(val):
            return val is None or val == '' or str(val).lower() == 'nan'

def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_csv_shifts.py <week_type> [start_date]")
        print("Example: python parse_csv_shifts.py weekB 2025-10-06")
        print("\nThen paste your CSV data and press Ctrl+D")
        sys.exit(1)
    
    week_type = sys.argv[1]
    start_date = sys.argv[2] if len(sys.argv) > 2 else '2025-10-06'
    
    print(f"📋 Reading CSV from stdin...")
    print(f"   Week type: {week_type}")
    print(f"   Start date: {start_date} (Monday)")
    print()
    
    csv_text = sys.stdin.read()
    
    # Parse CSV to JSON
    shifts_json = parse_csv_to_shifts(csv_text, week_type, start_date)
    
    # Output JSON
    output_file = f"{week_type}_shifts.json"
    with open(output_file, 'w') as f:
        json.dump(shifts_json, f, indent=2)
    
    print(f"\n✅ Parsed shifts saved to: {output_file}")
    print(f"\nTo import, run:")
    print(f"  python bulk_import_shifts.py {output_file}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

