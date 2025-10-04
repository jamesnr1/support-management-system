#!/usr/bin/env python3
"""
Comprehensive Week B fixes:
1. Fix James Sunday 2PM-10PM ratio from 3:1 to 2:1
2. Fill gaps in understaffed shifts
3. Give Rosie and Happy more hours
"""

import requests
import json

API_BASE = "http://localhost:8001/api"

# Worker IDs
WORKERS = {
    'Rosie': '126',
    'Happy': '125',
    'Mihir': '130',
    'Mayu': '129',
    'Arti': '118',
    'Sapana': '137',
    'MP': '133',
    'Hamza': '134'
}

def fix_roster():
    print("🔧 COMPREHENSIVE WEEK B FIXES\n")
    
    # Get current roster
    response = requests.get(f"{API_BASE}/roster/weekB")
    roster = response.json()
    
    fixes = []
    
    # Fix James Sunday 2PM-10PM: Change ratio from 3:1 to 2:1, add Rosie + Happy
    if 'JAM001' in roster and '2025-10-05' in roster['JAM001']:
        for shift in roster['JAM001']['2025-10-05']:
            if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
                shift['ratio'] = '2:1'  # Fix ratio
                shift['workers'] = [WORKERS['Happy'], WORKERS['Rosie']]  # Add Happy + Rosie
                fixes.append("✓ James Sunday 2PM-10PM: Changed 3:1→2:1, assigned Happy + Rosie")
    
    # Fix James Monday 10PM-6AM: Add second worker (currently only Rita)
    if 'JAM001' in roster and '2025-09-29' in roster['JAM001']:
        for shift in roster['JAM001']['2025-09-29']:
            if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
                if len(shift.get('workers', [])) < 2:
                    shift['workers'].append(WORKERS['Hamza'])  # Add Hamza
                    fixes.append("✓ James Monday 10PM-6AM: Added Hamza (with Rita)")
    
    # Fix James Friday 10PM-6AM: Add second worker
    if 'JAM001' in roster and '2025-10-03' in roster['JAM001']:
        for shift in roster['JAM001']['2025-10-03']:
            if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
                if len(shift.get('workers', [])) < 2:
                    shift['workers'].append(WORKERS['Sapana'])  # Add Sapana
                    fixes.append("✓ James Friday 10PM-6AM: Added Sapana (with Rita)")
    
    # Give Rosie Thursday 2PM-10PM (replace Arti)
    if 'JAM001' in roster and '2025-10-02' in roster['JAM001']:
        for shift in roster['JAM001']['2025-10-02']:
            if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
                # Replace Arti with Rosie
                shift['workers'] = [w if w != WORKERS['Arti'] else WORKERS['Rosie'] for w in shift['workers']]
                fixes.append("✓ James Thursday 2PM-10PM: Replaced Arti with Rosie")
    
    # Give Rosie Friday 2PM-10PM (add alongside others or replace)
    if 'JAM001' in roster and '2025-10-03' in roster['JAM001']:
        for shift in roster['JAM001']['2025-10-03']:
            if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
                # Replace MP with Rosie
                shift['workers'] = [w if w != WORKERS['MP'] else WORKERS['Rosie'] for w in shift['workers']]
                fixes.append("✓ James Friday 2PM-10PM: Replaced MP with Rosie")
    
    # Print fixes
    print("FIXES TO APPLY:\n")
    for fix in fixes:
        print(fix)
    
    # Save
    print("\n💾 Saving fixes...")
    response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
    if response.status_code == 200:
        print(f"✅ Week B updated with {len(fixes)} fixes!")
        return True
    else:
        print(f"❌ Failed to save: {response.status_code}")
        return False

if __name__ == "__main__":
    fix_roster()











