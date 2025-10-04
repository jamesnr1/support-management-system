import json
import csv
from datetime import datetime, timedelta
from collections import defaultdict

def parse_weekB_export():
    """Parse weekB_export.csv which has shift numbers and dates"""
    week_b_data = defaultdict(lambda: defaultdict(list))
    
    name_to_code = {
        'James Narula': 'JAM001',
        'Elizabeth (Libby) Narula': 'LIB001',
        'Grace Narula': 'GRA001',
        'Ace Narula': 'ACE001',
        'Milan Narula': 'MIL001'
    }
    
    location_map = {
        'Plympton Park': '2',
        'Glandore': '1'
    }
    
    with open('/Users/James/support-management-system/backend/weekB_export.csv', 'r') as f:
        reader = csv.DictReader(f)
        shifts_by_number = {}
        
        for row in reader:
            participant_name = row['Participant']
            participant_code = name_to_code.get(participant_name)
            if not participant_code:
                continue
            
            shift_number = row['Shift Number']
            date = row['Date']
            
            # Group workers by shift number
            if shift_number not in shifts_by_number:
                shifts_by_number[shift_number] = {
                    'id': shift_number.replace(':', '_'),
                    'date': date,
                    'shiftNumber': shift_number,
                    'startTime': row['Start Time'],
                    'endTime': row['End Time'],
                    'supportType': row['Support Type'],
                    'ratio': row['Ratio'],
                    'workers': [],
                    'location': location_map.get(row['Location'], '2'),
                    'notes': '',
                    'duration': row['Hours']
                }
            
            # Add worker ID (would need to look up from support_workers table)
            shifts_by_number[shift_number]['workers'].append(row['Support Worker'])
        
        # Group by participant and date
        for shift_num, shift_data in shifts_by_number.items():
            # Extract participant code from shift number (first letter)
            first_char = shift_num[0]
            code_map = {'J': 'JAM001', 'L': 'LIB001', 'G': 'GRA001', 'A': 'ACE001', 'M': 'MIL001'}
            participant_code = code_map.get(first_char)
            
            if participant_code:
                date = shift_data['date']
                week_b_data[participant_code][date].append(shift_data)
    
    return week_b_data

def parse_weekA_csv():
    """Parse weekA.csv and generate shift numbers for Sep 22-28"""
    week_a_data = defaultdict(lambda: defaultdict(list))
    
    name_to_code = {
        'James Narula': 'JAM001',
        'Elizabeth (Libby) Narula': 'LIB001',
        'Grace Narula': 'GRA001',
        'Ace Narula': 'ACE001',
        'Milan Narula': 'MIL001'
    }
    
    code_to_prefix = {
        'JAM001': 'J',
        'LIB001': 'L',
        'GRA001': 'G',
        'ACE001': 'A',
        'MIL001': 'M'
    }
    
    location_map = {
        'Plympton Park': '2',
        'Glandore': '1'
    }
    
    day_to_date = {
        'Monday': '2025-09-22',
        'Tuesday': '2025-09-23',
        'Wednesday': '2025-09-24',
        'Thursday': '2025-09-25',
        'Friday': '2025-09-26',
        'Saturday': '2025-09-27',
        'Sunday': '2025-09-28'
    }
    
    with open('/Users/James/support-management-system/backend/weekA.csv', 'r') as f:
        reader = csv.DictReader(f)
        
        # Group by participant and date first
        entries_by_participant_date = defaultdict(lambda: defaultdict(list))
        for row in reader:
            participant_name = row['Participant']
            participant_code = name_to_code.get(participant_name)
            if not participant_code:
                continue
            
            day = row['Day']
            date = day_to_date.get(day)
            if not date:
                continue
            
            entries_by_participant_date[participant_code][date].append(row)
        
        # Now create shifts with proper numbering
        for participant_code, dates_dict in entries_by_participant_date.items():
            prefix = code_to_prefix[participant_code]
            
            for date, entries in sorted(dates_dict.items()):
                # Group by time slot
                shifts_by_time = defaultdict(list)
                for entry in entries:
                    time_key = (entry['Shift Time'], entry['Location'], entry['Support Type'])
                    shifts_by_time[time_key].append(entry)
                
                # Create shifts with numbering
                shift_counter = 1
                for (time_str, location, support_type), shift_entries in sorted(shifts_by_time.items()):
                    date_str = date.replace('-', '')
                    shift_number = f"{prefix}{date_str}{shift_counter:02d}"
                    
                    # Parse time
                    if '-' in time_str:
                        start, end = time_str.split('-')
                        # Convert times like "6AM" to "06:00"
                        start_time = convert_time(start)
                        end_time = convert_time(end)
                    else:
                        start_time = "09:00"
                        end_time = "17:00"
                    
                    # Determine ratio based on number of workers
                    num_workers = len(shift_entries)
                    ratio = "2:1" if num_workers >= 2 else "1:1"
                    
                    shift = {
                        'id': shift_number.replace(':', '_'),
                        'date': date,
                        'shiftNumber': shift_number,
                        'startTime': start_time,
                        'endTime': end_time,
                        'supportType': support_type,
                        'ratio': ratio,
                        'workers': [entry['Support Worker'] for entry in shift_entries],
                        'location': location_map.get(location, '2'),
                        'notes': '',
                        'duration': shift_entries[0].get('Hours', '8')
                    }
                    
                    week_a_data[participant_code][date].append(shift)
                    shift_counter += 1
    
    return week_a_data

def convert_time(time_str):
    """Convert time like '6AM' or '2PM' to '06:00' or '14:00'"""
    time_str = time_str.strip().upper()
    if 'AM' in time_str or 'PM' in time_str:
        is_pm = 'PM' in time_str
        time_str = time_str.replace('AM', '').replace('PM', '').strip()
        hour = int(time_str)
        if is_pm and hour != 12:
            hour += 12
        elif not is_pm and hour == 12:
            hour = 0
        return f"{hour:02d}:00"
    return time_str

def main():
    print("=== Rebuilding Roster from CSV Files ===\n")
    
    print("Parsing Week B export (with shift numbers)...")
    week_b_data = parse_weekB_export()
    
    print("Parsing Week A CSV (generating shift numbers)...")
    week_a_data = parse_weekA_csv()
    
    # Build final roster
    final_roster = {}
    all_participants = set(list(week_a_data.keys()) + list(week_b_data.keys()))
    
    for participant_code in all_participants:
        final_roster[participant_code] = {
            'weekA': dict(week_a_data[participant_code]),
            'weekB': dict(week_b_data[participant_code])
        }
    
    # Print summary
    print("\n=== Rebuild Summary ===")
    for code in ['JAM001', 'LIB001', 'GRA001', 'ACE001', 'MIL001']:
        if code in final_roster:
            week_a_dates = sorted(final_roster[code]['weekA'].keys())
            week_b_dates = sorted(final_roster[code]['weekB'].keys())
            week_a_shifts = sum(len(final_roster[code]['weekA'][d]) for d in week_a_dates)
            week_b_shifts = sum(len(final_roster[code]['weekB'][d]) for d in week_b_dates)
            print(f"{code}:")
            print(f"  Week A: {len(week_a_dates)} days, {week_a_shifts} shifts")
            print(f"  Week B: {len(week_b_dates)} days, {week_b_shifts} shifts")
    
    # Save to file
    output_file = '/Users/James/support-management-system/backend/roster_data.json'
    with open(output_file, 'w') as f:
        json.dump(final_roster, f, indent=2)
    
    print(f"\n✅ Successfully wrote rebuilt roster to {output_file}")

if __name__ == "__main__":
    main()

