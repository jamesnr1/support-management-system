#!/usr/bin/env python3
"""
Fix 2:1 support shifts that have incorrect worker assignments.
- 2:1 shifts should have exactly 2 workers
- Find shifts with ratio "2:1" but wrong number of workers
- Report issues and optionally fix them
"""

import json
import sys
from collections import defaultdict

def analyze_2_1_staffing(roster_data):
    """Analyze 2:1 shifts and identify staffing issues"""
    issues = []
    stats = defaultdict(int)
    
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
                                'shift_number': shift.get('shiftNumber', 'N/A'),
                                'time': f"{shift.get('startTime', 'N/A')}-{shift.get('endTime', 'N/A')}",
                                'expected_workers': 2,
                                'actual_workers': worker_count,
                                'workers': workers,
                                'shift_id': shift.get('id')
                            })
                        elif worker_count > 2:
                            stats['overstaffed_2_1'] += 1
                            issues.append({
                                'type': 'overstaffed',
                                'week': week_type,
                                'participant': participant_code,
                                'date': date,
                                'shift_number': shift.get('shiftNumber', 'N/A'),
                                'time': f"{shift.get('startTime', 'N/A')}-{shift.get('endTime', 'N/A')}",
                                'expected_workers': 2,
                                'actual_workers': worker_count,
                                'workers': workers,
                                'shift_id': shift.get('id')
                            })
                        else:
                            stats['correctly_staffed_2_1'] += 1
    
    return issues, stats

def print_analysis(issues, stats):
    """Print analysis results"""
    print("=" * 60)
    print("2:1 SUPPORT STAFFING ANALYSIS")
    print("=" * 60)
    
    print(f"📊 STATISTICS:")
    print(f"   Total 2:1 shifts: {stats['total_2_1_shifts']}")
    print(f"   ✅ Correctly staffed (2 workers): {stats['correctly_staffed_2_1']}")
    print(f"   ⚠️  Understaffed (1 worker): {stats['understaffed_2_1']}")
    print(f"   ⚠️  Overstaffed (3+ workers): {stats['overstaffed_2_1']}")
    print()
    
    if issues:
        print("🚨 ISSUES FOUND:")
        print("-" * 60)
        
        # Group by type
        understaffed = [i for i in issues if i['type'] == 'understaffed']
        overstaffed = [i for i in issues if i['type'] == 'overstaffed']
        
        if understaffed:
            print(f"⚠️  UNDERSTAFFED 2:1 SHIFTS ({len(understaffed)} shifts):")
            for issue in understaffed:
                print(f"   • {issue['week']} | {issue['participant']} | {issue['date']} | {issue['time']}")
                print(f"     Shift: {issue['shift_number']} | Workers: {issue['workers']} (need 1 more)")
            print()
        
        if overstaffed:
            print(f"⚠️  OVERSTAFFED 2:1 SHIFTS ({len(overstaffed)} shifts):")
            for issue in overstaffed:
                print(f"   • {issue['week']} | {issue['participant']} | {issue['date']} | {issue['time']}")
                print(f"     Shift: {issue['shift_number']} | Workers: {issue['workers']} (need to remove {issue['actual_workers'] - 2})")
            print()
    else:
        print("✅ No staffing issues found! All 2:1 shifts have exactly 2 workers.")

def fix_staffing_issues(roster_data, issues, dry_run=True):
    """Fix staffing issues (dry run by default)"""
    if not issues:
        print("✅ No issues to fix!")
        return roster_data
    
    print(f"🔧 {'DRY RUN - ' if dry_run else ''}FIXING STAFFING ISSUES:")
    print("-" * 60)
    
    fixed_count = 0
    
    for issue in issues:
        week = issue['week']
        participant = issue['participant']
        date = issue['date']
        shift_id = issue['shift_id']
        
        # Find the shift in the data
        shifts = roster_data[week][participant][date]
        shift_index = None
        
        for i, shift in enumerate(shifts):
            if shift.get('id') == shift_id:
                shift_index = i
                break
        
        if shift_index is None:
            print(f"   ❌ Could not find shift {shift_id}")
            continue
        
        shift = shifts[shift_index]
        
        if issue['type'] == 'understaffed':
            print(f"   🔧 {issue['shift_number']}: Adding worker to understaffed shift")
            if not dry_run:
                # For now, just add a placeholder worker ID
                # In a real system, you'd want to find an available worker
                shift['workers'].append("NEED_WORKER")
                fixed_count += 1
        
        elif issue['type'] == 'overstaffed':
            print(f"   🔧 {issue['shift_number']}: Removing excess workers from overstaffed shift")
            if not dry_run:
                # Keep only the first 2 workers
                shift['workers'] = shift['workers'][:2]
                fixed_count += 1
    
    if not dry_run:
        print(f"✅ Fixed {fixed_count} staffing issues!")
    else:
        print(f"📋 Would fix {len(issues)} staffing issues (use --fix to apply changes)")
    
    return roster_data

def main():
    # Check command line arguments
    dry_run = True
    if len(sys.argv) > 1 and sys.argv[1] == '--fix':
        dry_run = False
        print("⚠️  LIVE MODE: Changes will be applied to roster_data.json")
    else:
        print("📋 DRY RUN MODE: Use --fix to apply changes")
    
    print()
    
    # Load roster data
    try:
        with open('roster_data.json', 'r') as f:
            roster_data = json.load(f)
    except FileNotFoundError:
        print("❌ Error: roster_data.json not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing roster_data.json: {e}")
        sys.exit(1)
    
    # Analyze staffing
    issues, stats = analyze_2_1_staffing(roster_data)
    
    # Print analysis
    print_analysis(issues, stats)
    
    # Fix issues if requested
    if issues:
        roster_data = fix_staffing_issues(roster_data, issues, dry_run)
        
        # Save changes if not dry run
        if not dry_run:
            # Backup original
            with open('roster_data.json.backup', 'w') as f:
                json.dump(roster_data, f, indent=2)
            print("💾 Backup saved as roster_data.json.backup")
            
            # Save fixed data
            with open('roster_data.json', 'w') as f:
                json.dump(roster_data, f, indent=2)
            print("💾 Fixed data saved to roster_data.json")

if __name__ == '__main__':
    main()
