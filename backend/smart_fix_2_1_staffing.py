#!/usr/bin/env python3
"""
Smart fix for 2:1 support shifts with incorrect worker assignments.
This script will:
1. Identify 2:1 shifts with wrong number of workers
2. For understaffed shifts: find available workers and assign them
3. For overstaffed shifts: remove excess workers
4. Check for conflicts and availability
"""

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta

def load_roster_data():
    """Load roster data from JSON file"""
    try:
        with open('roster_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Error: roster_data.json not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing roster_data.json: {e}")
        sys.exit(1)

def get_all_workers_from_roster(roster_data):
    """Extract all worker IDs that appear in the roster"""
    workers = set()
    for week_type, participants in roster_data.items():
        for participant_code, dates in participants.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    workers.update(shift.get('workers', []))
    return sorted(list(workers))

def check_worker_conflicts(worker_id, target_date, target_start, target_end, roster_data, exclude_shift_id=None):
    """Check if a worker has conflicts at the given time"""
    conflicts = []
    
    def time_to_minutes(time_str):
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    
    def times_overlap(start1, end1, start2, end2):
        start1_min = time_to_minutes(start1)
        end1_min = time_to_minutes(end1)
        start2_min = time_to_minutes(start2)
        end2_min = time_to_minutes(end2)
        
        # Handle overnight shifts
        if end1_min < start1_min:
            end1_min += 24 * 60
        if end2_min < start2_min:
            end2_min += 24 * 60
        
        return start1_min < end2_min and start2_min < end1_min
    
    for week_type, participants in roster_data.items():
        for participant_code, dates in participants.items():
            if target_date in dates:
                for shift in dates[target_date]:
                    if exclude_shift_id and shift.get('id') == exclude_shift_id:
                        continue
                    
                    if worker_id in shift.get('workers', []):
                        if times_overlap(target_start, target_end, shift['startTime'], shift['endTime']):
                            conflicts.append({
                                'participant': participant_code,
                                'shift_number': shift.get('shiftNumber', 'N/A'),
                                'time': f"{shift['startTime']}-{shift['endTime']}"
                            })
    
    return conflicts

def find_available_worker_for_shift(target_date, target_start, target_end, roster_data, all_workers, exclude_shift_id=None, exclude_workers=None):
    """Find an available worker for the given shift time"""
    exclude_workers = exclude_workers or []
    
    # Try workers in order of ID (you could implement more sophisticated logic here)
    for worker_id in all_workers:
        if worker_id in exclude_workers:
            continue
        
        conflicts = check_worker_conflicts(worker_id, target_date, target_start, target_end, roster_data, exclude_shift_id)
        if not conflicts:
            return worker_id
    
    return None

def analyze_and_fix_2_1_staffing(roster_data, dry_run=True):
    """Analyze and fix 2:1 staffing issues"""
    issues = []
    stats = defaultdict(int)
    all_workers = get_all_workers_from_roster(roster_data)
    
    print(f"📋 Found {len(all_workers)} workers in roster: {', '.join(all_workers[:10])}{'...' if len(all_workers) > 10 else ''}")
    print()
    
    # First pass: identify issues
    for week_type, participants in roster_data.items():
        for participant_code, dates in participants.items():
            for date, shifts in dates.items():
                for shift in shifts:
                    ratio = shift.get('ratio', '1:1')
                    workers = shift.get('workers', [])
                    worker_count = len(workers)
                    
                    if ratio == '2:1':
                        stats['total_2_1_shifts'] += 1
                        
                        if worker_count == 1:
                            stats['understaffed_2_1'] += 1
                            issues.append({
                                'type': 'understaffed',
                                'week': week_type,
                                'participant': participant_code,
                                'date': date,
                                'shift': shift,
                                'needed_workers': 1
                            })
                        elif worker_count > 2:
                            stats['overstaffed_2_1'] += 1
                            issues.append({
                                'type': 'overstaffed',
                                'week': week_type,
                                'participant': participant_code,
                                'date': date,
                                'shift': shift,
                                'excess_workers': worker_count - 2
                            })
                        else:
                            stats['correctly_staffed_2_1'] += 1
    
    # Print analysis
    print("=" * 60)
    print("2:1 SUPPORT STAFFING ANALYSIS")
    print("=" * 60)
    print(f"📊 STATISTICS:")
    print(f"   Total 2:1 shifts: {stats['total_2_1_shifts']}")
    print(f"   ✅ Correctly staffed (2 workers): {stats['correctly_staffed_2_1']}")
    print(f"   ⚠️  Understaffed (1 worker): {stats['understaffed_2_1']}")
    print(f"   ⚠️  Overstaffed (3+ workers): {stats['overstaffed_2_1']}")
    print()
    
    if not issues:
        print("✅ No staffing issues found!")
        return roster_data, 0
    
    # Fix issues
    print(f"🔧 {'DRY RUN - ' if dry_run else ''}FIXING STAFFING ISSUES:")
    print("-" * 60)
    
    fixed_count = 0
    
    for issue in issues:
        shift = issue['shift']
        shift_number = shift.get('shiftNumber', 'N/A')
        time_range = f"{shift['startTime']}-{shift['endTime']}"
        
        if issue['type'] == 'understaffed':
            print(f"   🔧 {shift_number} ({time_range}): Finding worker for understaffed shift")
            
            # Find available worker
            available_worker = find_available_worker_for_shift(
                issue['date'], 
                shift['startTime'], 
                shift['endTime'], 
                roster_data,
                all_workers,
                exclude_shift_id=shift.get('id'),
                exclude_workers=shift['workers']
            )
            
            if available_worker:
                print(f"      ✅ Found available worker: {available_worker}")
                if not dry_run:
                    shift['workers'].append(available_worker)
                    fixed_count += 1
            else:
                print(f"      ❌ No available worker found for {shift_number}")
        
        elif issue['type'] == 'overstaffed':
            print(f"   🔧 {shift_number} ({time_range}): Removing {issue['excess_workers']} excess worker(s)")
            print(f"      Current workers: {shift['workers']}")
            
            if not dry_run:
                # Keep only the first 2 workers
                shift['workers'] = shift['workers'][:2]
                print(f"      ✅ Kept workers: {shift['workers']}")
                fixed_count += 1
            else:
                print(f"      Would keep: {shift['workers'][:2]}")
    
    if dry_run:
        print(f"📋 Would fix {len([i for i in issues if i['type'] == 'overstaffed'])} overstaffed and attempt to fix {len([i for i in issues if i['type'] == 'understaffed'])} understaffed shifts")
    else:
        print(f"✅ Fixed {fixed_count} staffing issues!")
    
    return roster_data, fixed_count

def main():
    # Check command line arguments
    dry_run = True
    if len(sys.argv) > 1 and sys.argv[1] == '--fix':
        dry_run = False
        print("⚠️  LIVE MODE: Changes will be applied to roster_data.json")
    else:
        print("📋 DRY RUN MODE: Use --fix to apply changes")
    
    print()
    
    # Load and analyze roster data
    roster_data = load_roster_data()
    roster_data, fixed_count = analyze_and_fix_2_1_staffing(roster_data, dry_run)
    
    # Save changes if not dry run and fixes were made
    if not dry_run and fixed_count > 0:
        # Create backup
        backup_filename = f"roster_data.json.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with open(backup_filename, 'w') as f:
            json.dump(roster_data, f, indent=2)
        print(f"💾 Backup saved as {backup_filename}")
        
        # Save fixed data
        with open('roster_data.json', 'w') as f:
            json.dump(roster_data, f, indent=2)
        print("💾 Fixed data saved to roster_data.json")
    
    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    main()
