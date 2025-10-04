#!/usr/bin/env python3
"""
Bulk Import Shifts - Load Week A and Week B shifts with auto-generated shift numbers
Usage: python bulk_import_shifts.py <shifts_data.json>
"""

import json
import sys
import requests
from datetime import datetime
from collections import defaultdict

API_BASE = "http://localhost:8001/api"

def generate_shift_number(participant_code, date_str, sequence):
    """
    Generate shift number in format: L2025092201
    - First letter of participant name
    - Date (YYYYMMDD)
    - Sequence number (01-99)
    """
    # Get first letter from participant code or name
    letter = participant_code[0].upper() if participant_code else 'X'
    
    # Format date as YYYYMMDD
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        date_formatted = date_obj.strftime('%Y%m%d')
    except:
        date_formatted = date_str.replace('-', '')
    
    # Format sequence as 2 digits
    seq_formatted = str(sequence).zfill(2)
    
    return f"{letter}{date_formatted}{seq_formatted}"


def load_shifts(shifts_data):
    """
    Load shifts from JSON data structure
    Expected format:
    {
      "weekA": {
        "LIB001": {
          "2025-09-22": [
            {
              "startTime": "06:00",
              "endTime": "14:00",
              "supportType": "Self-Care",
              "ratio": "2:1",
              "workers": ["123", "124"],
              "location": "1",
              "notes": "",
              "duration": "8.0"
            }
          ]
        }
      },
      "weekB": { ... }
    }
    """
    
    results = {
        'weekA': {'success': 0, 'failed': 0, 'errors': []},
        'weekB': {'success': 0, 'failed': 0, 'errors': []}
    }
    
    # Track sequence numbers per participant per date
    sequence_tracker = defaultdict(lambda: defaultdict(int))
    
    for week_type in ['weekA', 'weekB']:
        if week_type not in shifts_data:
            print(f"⚠️  No data for {week_type}, skipping...")
            continue
            
        print(f"\n📋 Processing {week_type.upper()}...")
        week_data = shifts_data[week_type]
        
        # Convert to roster format for API
        roster_data = {}
        
        for participant_code, dates in week_data.items():
            roster_data[participant_code] = {}
            
            for date_str, shifts in dates.items():
                roster_data[participant_code][date_str] = []
                
                for shift in shifts:
                    # Generate sequence number for this participant on this date
                    sequence_tracker[participant_code][date_str] += 1
                    sequence = sequence_tracker[participant_code][date_str]
                    
                    # Generate shift number
                    shift_number = generate_shift_number(participant_code, date_str, sequence)
                    
                    # Add generated fields
                    shift_with_id = {
                        'id': f"{int(datetime.now().timestamp() * 1000)}_{sequence}",
                        'date': date_str,
                        'shiftNumber': shift_number,
                        **shift  # Include all original shift data
                    }
                    
                    roster_data[participant_code][date_str].append(shift_with_id)
                    
                    print(f"  ✓ {shift_number}: {participant_code} on {date_str} ({shift.get('startTime', '?')}-{shift.get('endTime', '?')})")
        
        # POST to API
        try:
            print(f"\n🚀 Uploading {week_type} to API...")
            response = requests.post(
                f"{API_BASE}/roster/{week_type}",
                json=roster_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                results[week_type]['success'] = len([s for dates in roster_data.values() for shifts in dates.values() for s in shifts])
                print(f"✅ {week_type.upper()} uploaded successfully! ({results[week_type]['success']} shifts)")
            else:
                results[week_type]['failed'] = 1
                error_msg = f"API returned {response.status_code}: {response.text}"
                results[week_type]['errors'].append(error_msg)
                print(f"❌ Failed to upload {week_type}: {error_msg}")
                
        except Exception as e:
            results[week_type]['failed'] = 1
            results[week_type]['errors'].append(str(e))
            print(f"❌ Error uploading {week_type}: {e}")
    
    return results


def main():
    if len(sys.argv) < 2:
        print("Usage: python bulk_import_shifts.py <shifts_data.json>")
        print("\nOr pipe JSON data:")
        print("  cat shifts.json | python bulk_import_shifts.py -")
        print("\nOr paste JSON directly:")
        print("  python bulk_import_shifts.py")
        print("  (then paste your JSON and press Ctrl+D)")
        sys.exit(1)
    
    # Read input
    if sys.argv[1] == '-':
        # Read from stdin
        print("📥 Reading from stdin...")
        shifts_data = json.load(sys.stdin)
    else:
        # Read from file
        filename = sys.argv[1]
        print(f"📥 Reading from {filename}...")
        with open(filename, 'r') as f:
            shifts_data = json.load(f)
    
    # Load shifts
    print("🔄 Starting bulk import...")
    results = load_shifts(shifts_data)
    
    # Summary
    print("\n" + "="*60)
    print("📊 IMPORT SUMMARY")
    print("="*60)
    
    total_success = results['weekA']['success'] + results['weekB']['success']
    total_failed = results['weekA']['failed'] + results['weekB']['failed']
    
    print(f"✅ Successfully imported: {total_success} shifts")
    print(f"❌ Failed: {total_failed} weeks")
    
    if total_failed > 0:
        print("\n⚠️  Errors:")
        for week_type in ['weekA', 'weekB']:
            for error in results[week_type]['errors']:
                print(f"  - {week_type}: {error}")
    
    print("\n🎉 Import complete!")
    
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())










