import json
import hashlib
from collections import defaultdict

def create_shift_signature(shift):
    """Creates a unique signature for a shift based on its content, ignoring the ID."""
    # Use a frozenset for workers to handle order-insensitivity
    workers = tuple(sorted(shift.get('workers', [])))
    
    # Create a tuple of the core shift properties
    # Using .get() with default values to prevent KeyErrors
    sig_tuple = (
        shift.get('date', ''),
        shift.get('shiftNumber', ''),
        shift.get('startTime', ''),
        shift.get('endTime', ''),
        shift.get('supportType', ''),
        shift.get('ratio', ''),
        workers,
        shift.get('location', ''),
        shift.get('notes', ''),
        shift.get('duration', '')
    )
    
    # Hash the string representation of the tuple for a consistent signature
    return hashlib.md5(str(sig_tuple).encode()).hexdigest()

def clean_roster_data(file_path):
    """
    Analyzes roster_data.json to remove duplicate shifts and regenerate unique IDs.
    """
    try:
        with open(file_path, 'r') as f:
            roster_data = json.load(f)
        print(f"✅ Successfully loaded {file_path}")
    except (IOError, json.JSONDecodeError) as e:
        print(f"❌ Error reading or parsing {file_path}: {e}")
        return

    cleaned_data = {}
    total_shifts_processed = 0
    total_duplicates_removed = 0

    print("🚀 Starting roster cleaning and re-indexing process...")

    for participant_code, participant_data in roster_data.items():
        if not isinstance(participant_data, dict):
            cleaned_data[participant_code] = participant_data
            continue
            
        cleaned_participant_data = {}
        for week_type, week_data in participant_data.items():
            if not isinstance(week_data, dict):
                cleaned_participant_data[week_type] = week_data
                continue

            cleaned_week_data = {}
            for date_str, shifts in week_data.items():
                if not isinstance(shifts, list):
                    cleaned_week_data[date_str] = shifts
                    continue

                unique_shifts_on_date = {} # Using a dict to store unique shifts by signature
                
                for shift in shifts:
                    total_shifts_processed += 1
                    signature = create_shift_signature(shift)
                    
                    if signature not in unique_shifts_on_date:
                        unique_shifts_on_date[signature] = shift
                    else:
                        total_duplicates_removed += 1
                
                # Convert the unique shifts back to a list
                cleaned_shifts = list(unique_shifts_on_date.values())
                
                # Regenerate IDs to ensure they are unique
                for i, shift in enumerate(cleaned_shifts):
                    # A more robust and descriptive ID
                    new_id = f"{participant_code}_{date_str}_{i+1}"
                    shift['id'] = new_id

                cleaned_week_data[date_str] = cleaned_shifts
            
            cleaned_participant_data[week_type] = cleaned_week_data
        
        cleaned_data[participant_code] = cleaned_participant_data

    print("\n--- Cleaning Summary ---")
    print(f"Total shifts processed: {total_shifts_processed}")
    print(f"Total duplicate shifts removed: {total_duplicates_removed}")
    print(f"Total shifts remaining: {total_shifts_processed - total_duplicates_removed}")
    
    # Write the cleaned data back to the file
    try:
        with open(file_path, 'w') as f:
            json.dump(cleaned_data, f, indent=2)
        print(f"\n✅ Successfully wrote cleaned and re-indexed data to {file_path}")
    except IOError as e:
        print(f"❌ Error writing cleaned data to {file_path}: {e}")

if __name__ == "__main__":
    clean_roster_data('roster_data.json')
