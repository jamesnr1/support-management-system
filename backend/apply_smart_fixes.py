#!/usr/bin/env python3
"""
Apply smart staffing fixes
"""

import requests

API_BASE = "http://localhost:8001/api"

WORKERS = {
    'Arti': '118',
    'Parvinder': '139',
    'Mihir': '130',
    'Rosie': '126',
    'Happy': '125'
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🔧 APPLYING SMART FIXES:\n")

fixes = []

# 1. Ace Sunday 6AM-2PM → Add Arti
if 'ACE001' in roster and '2025-10-05' in roster['ACE001']:
    for shift in roster['ACE001']['2025-10-05']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            shift['workers'] = [WORKERS['Arti']]
            fixes.append("✓ Ace Sunday 6AM-2PM: Assigned Arti")

# 2. Grace Sunday 6AM-2PM → Add Parvinder  
if 'GRA001' in roster and '2025-10-05' in roster['GRA001']:
    for shift in roster['GRA001']['2025-10-05']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            shift['workers'] = [WORKERS['Parvinder']]
            fixes.append("✓ Grace Sunday 6AM-2PM: Assigned Parvinder")

# 3. James Saturday 10PM-6AM → Add Mihir
if 'JAM001' in roster and '2025-10-04' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-04']:
        if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
            if len(shift.get('workers', [])) < 2:
                shift['workers'].append(WORKERS['Mihir'])
                fixes.append("✓ James Saturday 10PM-6AM: Added Mihir")

# 4. James Sunday 6AM-2PM → Remove Rosie (to avoid her 16h shift), keep other worker
if 'JAM001' in roster and '2025-10-05' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-05']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            if WORKERS['Rosie'] in shift.get('workers', []):
                shift['workers'] = [w for w in shift['workers'] if w != WORKERS['Rosie']]
                # Make sure there are still 2 workers
                if len(shift['workers']) < 2:
                    shift['workers'].append(WORKERS['Mihir'])
                fixes.append("✓ James Sunday 6AM-2PM: Removed Rosie (avoiding 16h), kept/added Mihir")

# 5. James Sunday 2PM-10PM → Keep Happy + Rosie (already done earlier)
# This is already fixed from previous script

for fix in fixes:
    print(fix)

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Applied {len(fixes)} smart fixes!")
else:
    print("❌ Failed to save")











