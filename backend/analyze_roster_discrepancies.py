import json
import re
import hashlib
from collections import defaultdict

def create_shift_signature(shift):
    """Creates a unique signature for a shift based on its content, ignoring the ID."""
    workers = tuple(sorted(shift.get('workers', [])))
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
    return hashlib.md5(str(sig_tuple).encode()).hexdigest()

def analyze_roster_discrepancies(file_path):
    """
    Analyzes the roster data to find date mismatches and duplicate content without modifying the file.
    """
    print(f"🔍 Starting analysis of {file_path}...")
    try:
        with open(file_path, 'r') as f:
            roster_data = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"❌ Error reading or parsing {file_path}: {e}")
        return

    discrepancies = []
    seen_shifts = defaultdict(list)
    date_pattern = re.compile(r'[A-Z](\d{8})\d{2}')

    for participant, p_data in roster_data.items():
        if not isinstance(p_data, dict): continue
        for week, w_data in p_data.items():
            if not isinstance(w_data, dict): continue
            for date_key, shifts in w_data.items():
                if not isinstance(shifts, list): continue
                for shift in shifts:
                    location = f"{participant} -> {week} -> {date_key}"
                    
                    # 1. Check for date mismatches
                    shift_num = shift.get('shiftNumber')
                    shift_date_field = shift.get('date')
                    
                    if shift_num:
                        match = date_pattern.match(shift_num)
                        if match:
                            num_date_str = match.group(1)
                            num_date = f"{num_date_str[:4]}-{num_date_str[4:6]}-{num_date_str[6:]}"
                            
                            if num_date != shift_date_field:
                                discrepancies.append(
                                    f"[Date Field Mismatch] {location}:\n"
                                    f"  - ShiftNumber '{shift_num}' implies date is {num_date}\n"
                                    f"  - But its 'date' field is '{shift_date_field}'"
                                )
                            if num_date != date_key:
                                discrepancies.append(
                                    f"[Placement Mismatch] {location}:\n"
                                    f"  - ShiftNumber '{shift_num}' implies date is {num_date}\n"
                                    f"  - But it is filed under date key '{date_key}'"
                                )
                        else:
                            discrepancies.append(
                                f"[Invalid Format] {location}: ShiftNumber '{shift_num}' is invalid."
                            )

                    # 2. Track shifts for duplicate content analysis
                    signature = create_shift_signature(shift)
                    seen_shifts[signature].append(location)

    print("\n--- Roster Discrepancy Report ---")
    if not discrepancies and not any(len(locs) > 1 for locs in seen_shifts.values()):
        print("\n✅ No discrepancies found in the roster data.")
    else:
        if discrepancies:
            print("\n--- Mismatch Issues Found ---")
            for d in sorted(discrepancies):
                print(d)
        
        print("\n--- Duplicate Content Found ---")
        duplicates_found = False
        for sig, locs in seen_shifts.items():
            if len(locs) > 1:
                duplicates_found = True
                print(f"\n[!] Found {len(locs)} identical shifts at these locations:")
                for loc in sorted(locs):
                    print(f"    - {loc}")
        if not duplicates_found:
            print("✅ No duplicate shift content found.")

    print("\n--- End of Report ---")

if __name__ == "__main__":
    analyze_roster_discrepancies('roster_data.json')
