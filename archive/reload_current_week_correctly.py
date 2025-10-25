#!/usr/bin/env python3
"""
Completely reload current week data correctly from the original CSV
"""

import json
import csv
from datetime import datetime

# Load existing roster data to preserve other weeks
with open('/Users/James/support-management-system/backend/roster_data.json', 'r') as f:
    roster_data = json.load(f)

# Load the original CSV data
csv_data = []
with open('/Users/James/Downloads/payroll_next_week_2025-10-13b.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['Day'] and row['Participant Name']:  # Skip empty rows
            csv_data.append(row)

print(f"Loaded {len(csv_data)} shifts from original CSV")

# CORRECT Worker name to ID mapping based on actual database
worker_mapping = {
    'Sandy Tran': '135',
    'Anika': '336', 
    'Parvinder Singh': '139',
    'Harshkumar (Happy) Modi': '125',
    'Mihir Patel': '130',
    'Krunalkumar (Krunal) Patel': '127',
    'Japneet (Rosie) Kaur': '126',
    'Muhammad (Hamza) Hamza': '132',
    'Sanjaykumar (Sanjay) Patel': '136',
    'Chaynne Humphrys': '120',
    'Mrunalkumar (MP) Patel': '131',
    'Taufique Raza': '138',
    'Mayurkumar (Mayu) Patel': '129',
    'Avani Patel': '119',
    'Sapanaben (Sapana) Krunalkumar Patel': '137',
    'Artiben (Arti) Patel': '118'  # CORRECTED: Arti is ID 118
}

# Participant name to code mapping
participant_mapping = {
    'Grace': 'GRA001',
    'James': 'JAM001', 
    'Libby': 'LIB001',
    'Ace': 'ACE001',
    'Milan': 'MIL001'
}

# Location mapping
location_mapping = {
    'Grace': '1',
    'James': '2',
    'Libby': '1', 
    'Ace': '1',
    'Milan': '1'
}

# Convert CSV to roster format
current_week_data = {}

# Process each shift
for shift in csv_data:
    participant_name = shift['Participant Name']
    participant_code = participant_mapping.get(participant_name)
    
    if not participant_code:
        print(f"Unknown participant: {participant_name}")
        continue
    
    # Parse date
    date_str = shift['Date']  # Format: 13/10/2025
    date_parts = date_str.split('/')
    formatted_date = f"{date_parts[2]}-{date_parts[1].zfill(2)}-{date_parts[0].zfill(2)}"
    
    # Parse times
    start_time = shift['Start Time']
    end_time = shift['End Time']
    
    # Use the hours from CSV directly
    duration = int(shift['Hours'])
    
    # Parse workers
    workers_str = shift['Workers']
    if ',' in workers_str:
        worker_names = [w.strip() for w in workers_str.split(',')]
    else:
        worker_names = [workers_str.strip()]
    
    worker_ids = []
    for worker_name in worker_names:
        worker_id = worker_mapping.get(worker_name)
        if worker_id:
            worker_ids.append(worker_id)
        else:
            print(f"❌ Unknown worker: {worker_name}")
    
    # Determine ratio based on number of workers
    ratio = f"{len(worker_ids)}:1" if len(worker_ids) > 1 else "1:1"
    
    # Create shift object
    shift_obj = {
        "id": f"shift_{int(datetime.now().timestamp() * 1000)}_{participant_code}_{formatted_date}_{start_time.replace(':', '')}",
        "date": formatted_date,
        "startTime": start_time,
        "endTime": end_time,
        "supportType": "Self-Care",
        "ratio": ratio,
        "workers": worker_ids,
        "location": location_mapping.get(participant_name, "1"),
        "notes": "",
        "shiftNumber": f"{participant_code[0]}{formatted_date.replace('-', '')}{start_time.replace(':', '')}",
        "duration": duration,
        "isSplitShift": False,
        "locked": False
    }
    
    # Add to current week data
    if participant_code not in current_week_data:
        current_week_data[participant_code] = {}
    
    if formatted_date not in current_week_data[participant_code]:
        current_week_data[participant_code][formatted_date] = []
    
    current_week_data[participant_code][formatted_date].append(shift_obj)

# Replace ONLY the current week data, preserve other weeks
roster_data["roster"]["data"] = current_week_data

# Save the roster data
with open('/Users/James/support-management-system/backend/roster_data.json', 'w') as f:
    json.dump(roster_data, f, indent=2)

print("✅ Current week roster data reloaded correctly!")
print(f"Current week participants: {list(current_week_data.keys())}")

# Print summary
for participant_code, participant_data in current_week_data.items():
    total_shifts = sum(len(shifts) for shifts in participant_data.values())
    print(f"{participant_code}: {total_shifts} shifts")

# Verify no Reena (134) in current week
all_worker_ids = set()
for participant_code, participant_data in current_week_data.items():
    for date, shifts in participant_data.items():
        for shift in shifts:
            all_worker_ids.update(shift['workers'])

if '134' in all_worker_ids:
    print("❌ ERROR: Reena (134) still found in current week!")
else:
    print("✅ SUCCESS: No Reena (134) in current week!")

if '118' in all_worker_ids:
    print("✅ SUCCESS: Arti (118) found in current week!")
else:
    print("❌ ERROR: Arti (118) missing from current week!")
