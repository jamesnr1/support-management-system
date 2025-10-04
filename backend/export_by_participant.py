#!/usr/bin/env python3
"""
Export roster data organized by participant in specific order
Format: Participant, Date, Start Time, End Time, Support Worker, Location, Support Type
"""

import requests
import csv
import sys
from datetime import datetime

API_BASE = "http://localhost:8001/api"

# Participant order (as requested)
PARTICIPANT_ORDER = ['JAM001', 'LIB001', 'ACE001', 'GRA001', 'MIL001']
PARTICIPANT_NAMES = {
    'JAM001': 'James Narula',
    'LIB001': 'Elizabeth (Libby) Narula',
    'ACE001': 'Ace Narula',
    'GRA001': 'Grace Narula',
    'MIL001': 'Milan Narula'
}

def get_workers_map():
    """Get worker ID to name mapping"""
    try:
        response = requests.get(f"{API_BASE}/workers")
        workers = response.json()
        return {w['id']: w['full_name'] for w in workers}
    except Exception as e:
        print(f"Error fetching workers: {e}")
        return {}

def get_locations_map():
    """Get location ID to name mapping"""
    try:
        response = requests.get(f"{API_BASE}/locations")
        locations = response.json()
        return {str(l['id']): l['name'] for l in locations}
    except Exception as e:
        print(f"Error fetching locations: {e}")
        return {}

def export_week(week_type, output_file):
    """Export a specific week to CSV"""
    
    print(f"\n📊 Exporting {week_type.upper()}...")
    
    # Get roster data
    try:
        response = requests.get(f"{API_BASE}/roster/{week_type}")
        if response.status_code != 200:
            print(f"❌ Failed to fetch {week_type}")
            return False
        
        roster_data = response.json()
        if not roster_data:
            print(f"⚠️  {week_type} is empty")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Get mappings
    workers_map = get_workers_map()
    locations_map = get_locations_map()
    
    # Collect all shifts organized by participant
    rows = []
    
    for participant_code in PARTICIPANT_ORDER:
        participant_name = PARTICIPANT_NAMES.get(participant_code, participant_code)
        
        if participant_code not in roster_data:
            continue
        
        participant_shifts = roster_data[participant_code]
        
        # Sort dates chronologically
        for date in sorted(participant_shifts.keys()):
            shifts = participant_shifts[date]
            
            # Sort shifts by start time
            shifts_sorted = sorted(shifts, key=lambda s: s.get('startTime', '00:00'))
            
            for shift in shifts_sorted:
                # Get worker names
                worker_ids = shift.get('workers', [])
                worker_names = []
                for worker_id in worker_ids:
                    worker_name = workers_map.get(str(worker_id), f"Worker {worker_id}")
                    worker_names.append(worker_name)
                
                # Get location name
                location_id = shift.get('location', '')
                location_name = locations_map.get(str(location_id), 'Unknown')
                
                # For each worker in the shift, create a separate row
                # This matches the input format where 2:1 shifts have 2 rows
                if worker_names:
                    for worker_name in worker_names:
                        rows.append({
                            'Participant': participant_name,
                            'Date': date,
                            'Start Time': shift.get('startTime', ''),
                            'End Time': shift.get('endTime', ''),
                            'Support Worker': worker_name,
                            'Location': location_name,
                            'Support Type': shift.get('supportType', 'Self-Care'),
                            'Ratio': shift.get('ratio', '1:1'),
                            'Shift Number': shift.get('shiftNumber', ''),
                            'Hours': shift.get('duration', '')
                        })
                else:
                    # Shift with no workers assigned
                    rows.append({
                        'Participant': participant_name,
                        'Date': date,
                        'Start Time': shift.get('startTime', ''),
                        'End Time': shift.get('endTime', ''),
                        'Support Worker': 'UNASSIGNED',
                        'Location': location_name,
                        'Support Type': shift.get('supportType', 'Self-Care'),
                        'Ratio': shift.get('ratio', '1:1'),
                        'Shift Number': shift.get('shiftNumber', ''),
                        'Hours': shift.get('duration', '')
                    })
    
    # Write CSV
    if rows:
        with open(output_file, 'w', newline='') as f:
            fieldnames = ['Participant', 'Date', 'Start Time', 'End Time', 'Support Worker', 'Location', 'Support Type', 'Ratio', 'Shift Number', 'Hours']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"✅ Exported {len(rows)} rows to {output_file}")
        return True
    else:
        print(f"⚠️  No shifts to export")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python export_by_participant.py <week_type>")
        print("Example: python export_by_participant.py weekB")
        print("\nAvailable weeks: weekA, weekB, nextA, nextB")
        sys.exit(1)
    
    week_type = sys.argv[1]
    output_file = f"{week_type}_export.csv"
    
    print("📋 ROSTER EXPORT BY PARTICIPANT")
    print("=" * 60)
    print(f"Week: {week_type}")
    print(f"Output: {output_file}")
    print(f"Participant Order: James → Libby → Ace → Grace → Milan")
    print("=" * 60)
    
    success = export_week(week_type, output_file)
    
    if success:
        print("\n🎉 Export complete!")
        print(f"📁 File saved: {output_file}")
    else:
        print("\n❌ Export failed")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())











