#!/usr/bin/env python3
"""
Fix shift numbers for existing shifts without adding or removing any shifts
Regenerates shift numbers in format: L2025092901
"""

import requests
import json
from datetime import datetime
from collections import defaultdict

API_BASE = "http://localhost:8001/api"

def fix_shift_numbers_for_week(week_type):
    """Fix shift numbers for a specific week"""
    
    print(f"\n🔧 Fixing shift numbers for {week_type.upper()}...")
    
    # GET current data
    try:
        response = requests.get(f"{API_BASE}/roster/{week_type}")
        if response.status_code != 200:
            print(f"❌ Failed to fetch {week_type}")
            return False
        
        roster_data = response.json()
        
        if not roster_data:
            print(f"⚠️  {week_type} is empty, skipping...")
            return True
        
    except Exception as e:
        print(f"❌ Error fetching {week_type}: {e}")
        return False
    
    # Track sequence per participant per date
    sequence_tracker = defaultdict(lambda: defaultdict(int))
    shifts_updated = 0
    
    # Process each participant
    for participant_code, dates in roster_data.items():
        for date, shifts in dates.items():
            # Sort shifts by start time to ensure consistent numbering
            shifts_sorted = sorted(shifts, key=lambda s: s.get('startTime', '00:00'))
            
            for shift in shifts_sorted:
                # Increment sequence for this participant on this date
                sequence_tracker[participant_code][date] += 1
                sequence = sequence_tracker[participant_code][date]
                
                # Generate new shift number: L2025092901
                letter = participant_code[0].upper()
                date_formatted = date.replace('-', '')
                new_shift_number = f"{letter}{date_formatted}{sequence:02d}"
                
                # Update only if different
                old_shift_number = shift.get('shiftNumber', '')
                if old_shift_number != new_shift_number:
                    print(f"  Updating: {old_shift_number} → {new_shift_number}")
                    shift['shiftNumber'] = new_shift_number
                    shifts_updated += 1
                else:
                    print(f"  OK: {new_shift_number}")
    
    # POST updated data back
    if shifts_updated > 0:
        try:
            print(f"\n💾 Saving updated {week_type}...")
            response = requests.post(
                f"{API_BASE}/roster/{week_type}",
                json=roster_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                print(f"✅ {week_type.upper()} shift numbers updated!")
                print(f"   Updated: {shifts_updated} shift numbers")
                return True
            else:
                print(f"❌ Failed to save: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error saving: {e}")
            return False
    else:
        print(f"✅ All shift numbers already correct in {week_type}")
        return True

def main():
    print("🔢 SHIFT NUMBER FIXER")
    print("=" * 60)
    print("This will regenerate shift numbers for existing shifts")
    print("Format: [L][YYYYMMDD][NN]  (e.g., L2025092901)")
    print("No shifts will be added or removed!")
    print("=" * 60)
    
    weeks = ['weekA', 'weekB', 'nextA', 'nextB']
    
    results = {}
    for week in weeks:
        results[week] = fix_shift_numbers_for_week(week)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    for week, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {week.upper()}")
    
    all_success = all(results.values())
    if all_success:
        print("\n🎉 All shift numbers fixed!")
    else:
        print("\n⚠️  Some weeks had errors")
    
    return 0 if all_success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())











