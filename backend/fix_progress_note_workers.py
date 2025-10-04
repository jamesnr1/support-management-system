#!/usr/bin/env python3
"""
Fix worker assignments to match who actually did the work (progress notes)
"""

import requests

API_BASE = "http://localhost:8001/api"

WORKERS = {
    'Mayur': '129',
    'Sapana': '137',
    'Sanjay': '136',
    'Arti': '118',
    'Hamza': '134',
    'Parvinder': '139',
    'Avani': '119',
    'Krunal': '127',
    'Happy': '125',
    'Rosie': '126',
    'Mihir': '130',
    'MP': '133'
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🔧 FIXING WORKERS WHO DID ACTUAL WORK:\n")

fixes = []

# Fix 1: James Tuesday 10PM-6AM → Mayur did it (not Sapana)
if 'JAM001' in roster and '2025-09-30' in roster['JAM001']:
    for shift in roster['JAM001']['2025-09-30']:
        if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
            # Replace Sapana with Mayur
            shift['workers'] = [w if w != WORKERS['Sapana'] else WORKERS['Mayur'] for w in shift['workers']]
            if WORKERS['Mayur'] not in shift['workers']:
                shift['workers'].append(WORKERS['Mayur'])
            fixes.append("✓ James Tue 10PM-6AM: Mayur did the work (replaced Sapana)")

# Fix 2: James Wednesday 6AM-2PM → Sanjay did it (not Arti)
if 'JAM001' in roster and '2025-10-01' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-01']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            # Keep Sanjay, add/keep Hamza (2:1)
            shift['workers'] = [WORKERS['Sanjay'], WORKERS['Hamza']]
            fixes.append("✓ James Wed 6AM-2PM: Sanjay did the work (replaced Arti)")

# Fix 3: Grace Tuesday 8PM-10PM → Parvinder did it (not Avani)
if 'GRA001' in roster and '2025-09-30' in roster['GRA001']:
    for shift in roster['GRA001']['2025-09-30']:
        if shift['startTime'] == '20:00' and shift['endTime'] == '22:00':
            shift['workers'] = [WORKERS['Parvinder']]
            fixes.append("✓ Grace Tue 8PM-10PM: Parvinder did the work (replaced Avani)")

# Fix 4: James Sunday 2PM-10PM → Fix ratio from 3:1 to 2:1
if 'JAM001' in roster and '2025-10-05' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-05']:
        if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
            shift['ratio'] = '2:1'
            # Keep Happy + Rosie (only 2)
            shift['workers'] = [WORKERS['Happy'], WORKERS['Rosie']][:2]
            fixes.append("✓ James Sun 2PM-10PM: Fixed ratio 3:1→2:1, kept Happy+Rosie")

for fix in fixes:
    print(fix)

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Fixed {len(fixes)} worker assignments to match actual work!")
else:
    print("❌ Failed to save")

