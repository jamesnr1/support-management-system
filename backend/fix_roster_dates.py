import json
import re
from collections import defaultdict
from datetime import datetime

def fix_roster_data(file_path):
    with open(file_path, 'r') as f:
        roster_data = json.load(f)

    corrected_roster_data = {}

    for participant_id, participant_data in roster_data.items():
        corrected_participant_data = {}
        for week_key, week_data in participant_data.items():
            if week_key not in ['weekA', 'weekB', 'nextA', 'nextB']:
                corrected_participant_data[week_key] = week_data
                continue

            # Using defaultdict to automatically handle new date keys
            corrected_week = defaultdict(list)
            
            # week_data can be None or not a dict
            if not isinstance(week_data, dict):
                corrected_participant_data[week_key] = week_data
                continue

            for date_key, shifts in week_data.items():
                for shift in shifts:
                    shift_number = shift.get("shiftNumber")
                    if not shift_number:
                        # If there's no shift number, we can't determine the correct date.
                        # We'll place it under its original date key for now.
                        corrected_week[date_key].append(shift)
                        continue

                    # Extract date from shift number, e.g., J2025092901 -> 20250929
                    match = re.search(r'\d{8}', shift_number)
                    if match:
                        date_str = match.group(0)
                        try:
                            correct_date = datetime.strptime(date_str, '%Y%m%d').strftime('%Y-%m-%d')
                            
                            # Update the shift's own date field
                            shift['date'] = correct_date
                            
                            # Add the corrected shift to the new structure
                            corrected_week[correct_date].append(shift)
                        except ValueError:
                            # If the date in shift number is invalid, keep it under the old date
                            corrected_week[date_key].append(shift)
                    else:
                        # If no date found in shift number, keep it under the old date
                        corrected_week[date_key].append(shift)

            # Convert defaultdict back to a regular dict for JSON serialization
            corrected_participant_data[week_key] = dict(sorted(corrected_week.items()))
        
        corrected_roster_data[participant_id] = corrected_participant_data

    # Write the corrected data back to the file
    with open(file_path, 'w') as f:
        json.dump(corrected_roster_data, f, indent=2)

    print("✅ Roster data has been successfully corrected.")

if __name__ == "__main__":
    fix_roster_data('backend/roster_data.json')
