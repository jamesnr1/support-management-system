import json
import re

def clean_and_organize_roster(file_path):
    """
    Cleans the roster data by:
    1. Removing all 'nextA' and 'nextB' week data.
    2. Ensuring only unique shifts (by shiftNumber) exist in 'weekA' and 'weekB'.
    3. Reorganizing shifts to be under the correct date key, based on their shiftNumber.
    """
    print(f"🚀 Starting advanced cleaning and reorganization of {file_path}...")
    try:
        with open(file_path, 'r') as f:
            roster_data = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"❌ Error reading or parsing {file_path}: {e}")
        return

    cleaned_data = {}
    total_shifts_processed = 0
    duplicates_removed = 0
    next_weeks_shifts_removed = 0
    shifts_reorganized = 0
    date_pattern = re.compile(r'[A-Z](\d{8})\d{2}')

    for participant, p_data in roster_data.items():
        if not isinstance(p_data, dict):
            cleaned_data[participant] = p_data
            continue

        # Create a clean slate for the participant
        cleaned_participant_data = {'weekA': {}, 'weekB': {}}
        seen_shift_numbers = set()

        # Only iterate through the weeks we want to keep
        for week_key in ['weekA', 'weekB']:
            if week_key in p_data and isinstance(p_data[week_key], dict):
                for date_key, shifts in p_data[week_key].items():
                    if not isinstance(shifts, list): continue
                    for shift in shifts:
                        total_shifts_processed += 1
                        shift_num = shift.get('shiftNumber')

                        if not shift_num:
                            continue # Skip shifts without a number

                        # Prevent duplicate shifts from being added
                        if shift_num in seen_shift_numbers:
                            duplicates_removed += 1
                            continue
                        
                        seen_shift_numbers.add(shift_num)
                        
                        # Determine the correct date from the shiftNumber
                        match = date_pattern.match(shift_num)
                        if match:
                            num_date_str = match.group(1)
                            correct_date = f"{num_date_str[:4]}-{num_date_str[4:6]}-{num_date_str[6:]}"
                            
                            # Ensure the shift's internal date is correct
                            shift['date'] = correct_date

                            if date_key != correct_date:
                                shifts_reorganized += 1

                            # Place the shift under the correct date in the correct week
                            if week_key not in cleaned_participant_data:
                                cleaned_participant_data[week_key] = {}
                            if correct_date not in cleaned_participant_data[week_key]:
                                cleaned_participant_data[week_key][correct_date] = []
                            
                            cleaned_participant_data[week_key][correct_date].append(shift)
                        else:
                            # If shift number is invalid, place it where it was found
                            if date_key not in cleaned_participant_data[week_key]:
                                cleaned_participant_data[week_key][date_key] = []
                            cleaned_participant_data[week_key][date_key].append(shift)

        # Count shifts removed from nextA/B for the report
        for week_key in ['nextA', 'nextB']:
             if week_key in p_data and isinstance(p_data[week_key], dict):
                 for date_key, shifts in p_data[week_key].items():
                     if isinstance(shifts, list):
                        next_weeks_shifts_removed += len(shifts)

        cleaned_data[participant] = cleaned_participant_data

    # --- Summary Report ---
    print("\n--- Cleaning and Reorganization Summary ---")
    print(f"Total shifts processed: {total_shifts_processed}")
    print(f"Shifts removed from 'nextA'/'nextB': {next_weeks_shifts_removed}")
    print(f"Duplicate shifts removed: {duplicates_removed}")
    print(f"Shifts placed under correct date: {shifts_reorganized}")
    
    final_shift_count = total_shifts_processed - next_weeks_shifts_removed - duplicates_removed
    print(f"Total shifts remaining in Week A & B: {final_shift_count}")

    # Write the cleaned data back to the file
    try:
        with open(file_path, 'w') as f:
            json.dump(cleaned_data, f, indent=2)
        print(f"\n✅ Successfully wrote cleaned and reorganized data to {file_path}")
    except IOError as e:
        print(f"❌ Error writing cleaned data to {file_path}: {e}")


if __name__ == "__main__":
    clean_and_organize_roster('/Users/James/support-management-system/backend/roster_data.json')
