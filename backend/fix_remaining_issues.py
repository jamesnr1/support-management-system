#!/usr/bin/env python3
"""
Fix the 3 remaining scheduling issues
"""

import requests
import json

API_BASE = "http://localhost:8001/api"

# Worker IDs
AVANI = '119'
HAPPY = '125'
MAYU = '129'

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🔧 FIXING REMAINING 3 ISSUES:\n")

fixes = []

# Issue 1: Avani - Remove from Sunday 6AM-2PM (Grace)
if 'GRA001' in roster and '2025-10-05' in roster['GRA001']:
    for shift in roster['GRA001']['2025-10-05']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            if AVANI in shift['workers']:
                shift['workers'] = [w for w in shift['workers'] if w != AVANI]
                fixes.append("✓ Removed Avani from Grace Sunday 6AM-2PM")

# Issue 2: Happy - Remove from Ace Sunday 6AM-2PM (keep James afternoon for hours)
if 'ACE001' in roster and '2025-10-05' in roster['ACE001']:
    for shift in roster['ACE001']['2025-10-05']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            if HAPPY in shift['workers']:
                shift['workers'] = [w for w in shift['workers'] if w != HAPPY]
                fixes.append("✓ Removed Happy from Ace Sunday 6AM-2PM (keeps James 2PM-10PM for hours)")

# Issue 3: Mayu - Remove from Saturday night 10PM-6AM
if 'JAM001' in roster and '2025-10-04' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-04']:
        if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
            if MAYU in shift['workers']:
                shift['workers'] = [w for w in shift['workers'] if w != MAYU]
                fixes.append("✓ Removed Mayu from James Saturday 10PM-6AM (was doing continuous Fri-Sun)")

for fix in fixes:
    print(fix)

# Save
print("\n💾 Saving fixes...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Fixed {len(fixes)} remaining issues!")
else:
    print(f"❌ Failed to save")

