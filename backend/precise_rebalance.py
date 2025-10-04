#!/usr/bin/env python3
"""
Precise hour rebalancing:
- Happy: +16h (2 full shifts)
- Rosie: +8h (1 shift)
- Reduce from Sanjay/Mihir/Mayu
"""

import requests

API_BASE = "http://localhost:8001/api"

WORKERS = {
    'Sanjay': '136',
    'Mihir': '130',
    'Mayu': '129',
    'Rosie': '126',
    'Happy': '125'
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🎯 PRECISE REBALANCING:\n")
fixes = []

# HAPPY +16h (take 2 shifts from Sanjay/Mihir)
# 1. James Wednesday 2PM-10PM: Sanjay → Happy
if 'JAM001' in roster and '2025-10-01' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-01']:
        if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
            if WORKERS['Sanjay'] in shift['workers']:
                shift['workers'] = [w if w != WORKERS['Sanjay'] else WORKERS['Happy'] for w in shift['workers']]
                fixes.append("✓ James Wed 2PM-10PM: Happy replaces Sanjay (+8h Happy)")

# 2. Ace Saturday 6AM-2PM: Mayu → Happy
if 'ACE001' in roster and '2025-10-04' in roster['ACE001']:
    for shift in roster['ACE001']['2025-10-04']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            if WORKERS['Mayu'] in shift['workers']:
                shift['workers'] = [WORKERS['Happy']]
                fixes.append("✓ Ace Sat 6AM-2PM: Happy replaces Mayu (+8h Happy)")

# ROSIE +8h (take 1 shift from Mayu)
# 3. James Monday 6AM-2PM: Mayu → Rosie
if 'JAM001' in roster and '2025-09-29' in roster['JAM001']:
    for shift in roster['JAM001']['2025-09-29']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            if WORKERS['Mayu'] in shift['workers']:
                shift['workers'] = [w if w != WORKERS['Mayu'] else WORKERS['Rosie'] for w in shift['workers']]
                fixes.append("✓ James Mon 6AM-2PM: Rosie replaces Mayu (+8h Rosie)")

for fix in fixes:
    print(fix)

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Applied {len(fixes)} changes!")
else:
    print("❌ Failed to save")











