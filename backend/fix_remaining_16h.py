#!/usr/bin/env python3
"""
Fix remaining 16+ hour issues:
1. Arti has James Thu 6AM-2PM + 2PM-10PM → Remove from afternoon
2. Worker 132 has James Fri 6AM-2PM + 10PM-6AM → Remove from one shift
"""

import requests

API_BASE = "http://localhost:8001/api"

# Get worker names
workers_resp = requests.get(f"{API_BASE}/workers").json()
workers_map = {w['id']: w['full_name'] for w in workers_resp}

print("Worker ID mapping:")
for wid in ['118', '129', '130', '131', '132', '137', '127', '138', '135']:
    print(f"  {wid}: {workers_map.get(wid, 'Unknown')}")

WORKERS = {
    'Arti': '118',
    'Mayu': '129',
    'Mihir': '130',
    'MP': '133',
    'Hamza': '134',  # Corrected ID
    'Reena': '135',
    'Rosie': '126',
    'Happy': '125'
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("\n🔧 FIXING REMAINING 16+ HOUR SHIFTS:\n")

fixes = []

# 1. Remove Arti from James Thursday 2PM-10PM (she's already 6AM-2PM)
# Replace with Rosie
if 'JAM001' in roster and '2025-10-02' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-02']:
        if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
            if WORKERS['Arti'] in shift['workers']:
                shift['workers'] = [w if w != WORKERS['Arti'] else WORKERS['Rosie'] for w in shift['workers']]
                fixes.append("✓ James Thu 2PM-10PM: Rosie replaces Arti (Arti now 8h)")

# 2. Check worker 132 (find correct ID) and remove from one Friday shift
# First, get the actual worker 132
worker_132_name = workers_map.get('132', 'Unknown')
print(f"\nWorker 132 is: {worker_132_name}")

# Remove worker 132 from James Friday 10PM-6AM, keep on 6AM-2PM
if 'JAM001' in roster and '2025-10-03' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-03']:
        if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
            if '132' in shift['workers']:
                # Replace with Happy (he has room for more hours)
                shift['workers'] = [w if w != '132' else WORKERS['Happy'] for w in shift['workers']]
                fixes.append(f"✓ James Fri 10PM-6AM: Happy replaces {worker_132_name}")

for fix in fixes:
    print(fix)

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"\n✅ Fixed {len(fixes)} remaining 16h shifts!")
else:
    print("❌ Failed")











