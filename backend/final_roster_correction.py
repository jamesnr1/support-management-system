import json
import re
from datetime import datetime, date

def final_roster_correction(input_file, output_file):
    """
    Corrects the roster data based on strict, final rules:
    1. Works from a safe backup file.
    2. Only creates Week A and Week B.
    3. Places shifts based *only* on the date in their shiftNumber.
    4. Preserves all original shift data and shiftNumbers.
    5. Discards all shifts that do not fall into Week A or B.
    """
    print(f"--- Starting Final Roster Correction ---")
    print(f"Reading from: {input_file}")

    try:
        with open(input_file, 'r') as f:
            source_data = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"❌ FATAL ERROR: Could not read source file. Aborting. Error: {e}")
        return

    # Define the exact date ranges
    week_a_start = date(2025, 9, 22)
    week_a_end = date(2025, 9, 28)
    week_b_start = date(2025, 9, 29)
    week_b_end = date(2025, 10, 5)

    print(f"Week A defined as: {week_a_start} to {week_a_end}")
    print(f"Week B defined as: {week_b_start} to {week_b_end}")

    final_roster = {}
    seen_shift_numbers = set()
    date_pattern = re.compile(r'[A-Z](\d{8})\d{2}')
    
    shifts_processed = 0
    shifts_placed = 0
    shifts_discarded = 0
    duplicates_skipped = 0

    for participant, p_data in source_data.items():
        if not isinstance(p_data, dict):
            final_roster[participant] = p_data
            continue
        
        final_roster[participant] = {'weekA': {}, 'weekB': {}}

        # Search all possible original locations for shifts
        for week_key in ['weekA', 'weekB', 'nextA', 'nextB']:
            if week_key in p_data and isinstance(p_data[week_key], dict):
                for date_key, shifts in p_data[week_key].items():
                    if not isinstance(shifts, list): continue
                    for shift in shifts:
                        shifts_processed += 1
                        shift_num = shift.get('shiftNumber')

                        if not shift_num or not date_pattern.match(shift_num):
                            shifts_discarded += 1
                            continue
                        
                        if shift_num in seen_shift_numbers:
                            duplicates_skipped += 1
                            continue
                        
                        seen_shift_numbers.add(shift_num)

                        # Extract date from shiftNumber
                        num_date_str = date_pattern.match(shift_num).group(1)
                        shift_date = datetime.strptime(num_date_str, '%Y%m%d').date()

                        # Determine correct week and place the shift
                        target_week = None
                        if week_a_start <= shift_date <= week_a_end:
                            target_week = 'weekA'
                        elif week_b_start <= shift_date <= week_b_end:
                            target_week = 'weekB'
                        
                        if target_week:
                            date_str = shift_date.strftime('%Y-%m-%d')
                            shift['date'] = date_str # Ensure internal date is also correct
                            
                            if date_str not in final_roster[participant][target_week]:
                                final_roster[participant][target_week][date_str] = []
                            
                            final_roster[participant][target_week][date_str].append(shift)
                            shifts_placed += 1
                        else:
                            shifts_discarded += 1

    print("\n--- Correction Summary ---")
    print(f"Total shifts found in source file: {shifts_processed}")
    print(f"Duplicate shifts skipped: {duplicates_skipped}")
    print(f"Shifts placed into Week A/B: {shifts_placed}")
    print(f"Shifts outside A/B date ranges (discarded): {shifts_discarded}")

    try:
        with open(output_file, 'w') as f:
            json.dump(final_roster, f, indent=2)
        print(f"\n✅ Successfully wrote corrected roster to {output_file}")
    except IOError as e:
        print(f"❌ FATAL ERROR: Could not write to output file. Error: {e}")

if __name__ == "__main__":
    backup_file = '/Users/James/support-management-system/backend/roster_data.json.backup_20251004_safe'
    target_file = '/Users/James/support-management-system/backend/roster_data.json'
    final_roster_correction(backup_file, target_file)
