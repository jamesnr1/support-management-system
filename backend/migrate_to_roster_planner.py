#!/usr/bin/env python3
"""
Migration script: Week A/B/Next A/Next B → Roster/Planner structure

Converts participant-based week structure to date-based roster/planner structure.
"""
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

def get_monday_of_week(date_str):
    """Get Monday of the week containing the given date"""
    date = datetime.strptime(date_str, '%Y-%m-%d')
    days_since_monday = date.weekday()
    monday = date - timedelta(days=days_since_monday)
    return monday

def get_week_range(monday):
    """Get start and end dates for a week starting on Monday"""
    sunday = monday + timedelta(days=6)
    return monday.strftime('%Y-%m-%d'), sunday.strftime('%Y-%m-%d')

def migrate_roster_data():
    """Migrate from old structure to new Roster/Planner structure"""
    
    # Load current data
    roster_file = Path(__file__).parent / 'roster_data.json'
    backup_file = Path(__file__).parent / f'roster_data_pre_migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    
    print("📂 Loading current roster data...")
    with open(roster_file, 'r') as f:
        old_data = json.load(f)
    
    # Create backup
    print(f"💾 Creating backup: {backup_file.name}")
    with open(backup_file, 'w') as f:
        json.dump(old_data, f, indent=2)
    
    # Analyze date ranges to determine current week
    all_dates = set()
    week_data = {'weekA': {}, 'weekB': {}, 'nextA': {}, 'nextB': {}}
    
    for participant_code, participant_data in old_data.items():
        for week_type in ['weekA', 'weekB', 'nextA', 'nextB']:
            week_shifts = participant_data.get(week_type, {})
            if week_shifts:
                week_data[week_type][participant_code] = week_shifts
                all_dates.update(week_shifts.keys())
    
    if not all_dates:
        print("⚠️  No roster data found. Creating empty structure.")
        new_data = {
            "roster": {
                "start_date": datetime.now().strftime('%Y-%m-%d'),
                "end_date": (datetime.now() + timedelta(days=6)).strftime('%Y-%m-%d'),
                "data": {}
            },
            "planner": {
                "week1": {"start_date": "", "end_date": "", "data": {}},
                "week2": {"start_date": "", "end_date": "", "data": {}},
                "week3": {"start_date": "", "end_date": "", "data": {}},
                "week4": {"start_date": "", "end_date": "", "data": {}}
            }
        }
    else:
        # Determine current week (most recent Monday)
        today = datetime.now()
        current_monday = today - timedelta(days=today.weekday())
        
        print(f"\n📅 Today: {today.strftime('%Y-%m-%d')} ({today.strftime('%A')})")
        print(f"Current week starts: {current_monday.strftime('%Y-%m-%d')}")
        
        # Find which week contains current Monday
        current_week_data = None
        next_week_data = []
        
        for week_type, participants in week_data.items():
            if not participants:
                continue
            
            # Get date range for this week
            dates = set()
            for dates_dict in participants.values():
                dates.update(dates_dict.keys())
            
            if not dates:
                continue
                
            min_date = min(dates)
            max_date = max(dates)
            week_monday = get_monday_of_week(min_date)
            
            print(f"  {week_type}: {min_date} to {max_date} (Monday: {week_monday.strftime('%Y-%m-%d')})")
            
            # Check if this week overlaps with current week
            if week_monday <= current_monday <= week_monday + timedelta(days=6):
                current_week_data = {
                    "type": week_type,
                    "monday": week_monday,
                    "data": participants
                }
            elif week_monday > current_monday:
                next_week_data.append({
                    "type": week_type,
                    "monday": week_monday,
                    "data": participants
                })
        
        # Sort planning weeks by date
        next_week_data.sort(key=lambda x: x['monday'])
        
        # Build new structure
        new_data = {
            "roster": {
                "start_date": "",
                "end_date": "",
                "data": {}
            },
            "planner": {
                "week1": {"start_date": "", "end_date": "", "data": {}},
                "week2": {"start_date": "", "end_date": "", "data": {}},
                "week3": {"start_date": "", "end_date": "", "data": {}},
                "week4": {"start_date": "", "end_date": "", "data": {}}
            }
        }
        
        # Set roster (current week)
        if current_week_data:
            start, end = get_week_range(current_week_data['monday'])
            new_data["roster"] = {
                "start_date": start,
                "end_date": end,
                "data": current_week_data['data']
            }
            print(f"\n✅ Roster set to: {start} - {end} (from {current_week_data['type']})")
        else:
            # Use most recent week as roster
            if week_data.get('weekB'):
                dates = set()
                for dates_dict in week_data['weekB'].values():
                    dates.update(dates_dict.keys())
                if dates:
                    monday = get_monday_of_week(min(dates))
                    start, end = get_week_range(monday)
                    new_data["roster"] = {
                        "start_date": start,
                        "end_date": end,
                        "data": week_data['weekB']
                    }
                    print(f"\n✅ Roster set to Week B: {start} - {end}")
            elif week_data.get('weekA'):
                dates = set()
                for dates_dict in week_data['weekA'].values():
                    dates.update(dates_dict.keys())
                if dates:
                    monday = get_monday_of_week(min(dates))
                    start, end = get_week_range(monday)
                    new_data["roster"] = {
                        "start_date": start,
                        "end_date": end,
                        "data": week_data['weekA']
                    }
                    print(f"\n✅ Roster set to Week A: {start} - {end}")
        
        # Set planner weeks (up to 4 weeks ahead)
        for i, week in enumerate(next_week_data[:4]):
            week_key = f"week{i+1}"
            start, end = get_week_range(week['monday'])
            new_data["planner"][week_key] = {
                "start_date": start,
                "end_date": end,
                "data": week['data']
            }
            print(f"✅ Planner {week_key} set to: {start} - {end} (from {week['type']})")
    
    # Write new data
    print(f"\n💾 Writing new roster structure...")
    with open(roster_file, 'w') as f:
        json.dump(new_data, f, indent=2)
    
    print("\n✅ Migration complete!")
    print(f"   Backup saved to: {backup_file.name}")
    print(f"   New structure written to: roster_data.json")
    
    return True

if __name__ == '__main__':
    try:
        migrate_roster_data()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

