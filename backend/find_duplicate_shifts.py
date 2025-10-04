import json
from collections import defaultdict

def find_duplicate_shifts(file_path):
    """
    Analyzes the roster data JSON file to find duplicate shift IDs.
    Prints any duplicates found.
    """
    try:
        with open(file_path, 'r') as f:
            roster_data = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error reading or parsing {file_path}: {e}")
        return

    shift_ids = defaultdict(list)
    duplicates_found = False

    print("🔍 Starting analysis for duplicate shift IDs...")

    for participant_code, participant_data in roster_data.items():
        if isinstance(participant_data, dict):
            for week_type, week_data in participant_data.items():
                if isinstance(week_data, dict):
                    for date_str, shifts in week_data.items():
                        if isinstance(shifts, list):
                            for shift in shifts:
                                if isinstance(shift, dict) and 'id' in shift:
                                    shift_id = shift['id']
                                    location = f"{participant_code} -> {week_type} -> {date_str}"
                                    shift_ids[shift_id].append(location)

    print("\n--- Duplicate Shift ID Report ---")
    for shift_id, locations in shift_ids.items():
        if len(locations) > 1:
            duplicates_found = True
            print(f"\n[!] Duplicate Shift ID found: '{shift_id}'")
            print(f"  This ID appears {len(locations)} times at the following locations:")
            for loc in locations:
                print(f"    - {loc}")

    if not duplicates_found:
        print("\n✅ No duplicate shift IDs found in the file.")
    else:
        print("\n--- End of Report ---")


if __name__ == "__main__":
    find_duplicate_shifts('roster_data.json')
