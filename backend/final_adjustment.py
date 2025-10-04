#!/usr/bin/env python3
"""
Final adjustments:
- Give Rosie +8h (replace Mayu on James Tuesday 10PM-6AM)
- Reduce Sanjay -8h (replace on James Sunday 10PM-6AM)
"""

import requests

API_BASE = "http://localhost:8001/api"

WORKERS = {
    'Sanjay': '136',
    'Mayu': '129',
    'Rosie': '126'
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🔧 FINAL ADJUSTMENTS:\n")
fixes = []

# 1. Give Rosie +8h: James Tuesday 10PM-6AM (Mayu → Rosie)
if 'JAM001' in roster and '2025-09-30' in roster['JAM001']:
    for shift in roster['JAM001']['2025-09-30']:
        if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
            if WORKERS['Mayu'] in shift['workers']:
                shift['workers'] = [w if w != WORKERS['Mayu'] else WORKERS['Rosie'] for w in shift['workers']]
                fixes.append("✓ James Tue 10PM-6AM: Rosie replaces Mayu (+8h Rosie)")

# 2. Reduce Sanjay -8h: Remove from James Monday 10PM-6AM
if 'JAM001' in roster and '2025-09-29' in roster['JAM001']:
    for shift in roster['JAM001']['2025-09-29']:
        if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
            if WORKERS['Sanjay'] in shift['workers']:
                # Keep the other worker (not Sanjay)
                shift['workers'] = [w for w in shift['workers'] if w != WORKERS['Sanjay']]
                fixes.append("✓ James Mon 10PM-6AM: Removed Sanjay (-8h Sanjay)")

for fix in fixes:
    print(fix)

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Applied {len(fixes)} final adjustments!")
    print("\nExpected final hours:")
    print("  Sanjay: ~32h")
    print("  Mihir: ~32h")
    print("  Mayu: ~34h")
    print("  Rosie: ~40h")
    print("  Happy: ~32h")
else:
    print("❌ Failed")











