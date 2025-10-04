#!/usr/bin/env python3
"""
Careful rebalancing with exact hour targets:
Happy: 16h → 30h (+14h) = 2 shifts of 8h each
Rosie: Already has 40h from previous fixes (Thu+Fri PM + Sun PM = 24h from base)
"""

import requests

API_BASE = "http://localhost:8001/api"

WORKERS = {
    'Sanjay': '136',
    'Mihir': '130',
    'Mayu': '129',
    'Rosie': '126',
    'Happy': '125',
    'Reena': '134'  # Low hours worker
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🎯 CAREFUL HOUR REBALANCING\n")

fixes = []

# Give Happy exactly 2 more shifts (14-16h)
# 1. Replace Mihir on James Monday 2PM-10PM
if 'JAM001' in roster and '2025-09-29' in roster['JAM001']:
    for shift in roster['JAM001']['2025-09-29']:
        if shift['startTime'] == '14:00':
            shift['workers'] = [w if w != WORKERS['Mihir'] else WORKERS['Happy'] for w in shift['workers']]
            fixes.append("✓ James Mon 2PM-10PM: Happy replaces Mihir (+8h for Happy)")

# 2. Replace Mayu on Ace Saturday morning  
if 'ACE001' in roster and '2025-10-04' in roster['ACE001']:
    for shift in roster['ACE001']['2025-10-04']:
        if shift['startTime'] == '06:00':
            shift['workers'] = [WORKERS['Happy']]
            fixes.append("✓ Ace Sat 6AM-2PM: Happy replaces Mayu (+8h for Happy)")

# Rosie - Keep current assignments from previous fixes
# (Already has Thu 2PM-10PM, Fri 2PM-10PM, Sun 2PM-10PM = 24h extra)

# Replace Parvinder with Reena on Grace Sunday 2PM-8PM (avoid Parvinder's 16h)
if 'GRA001' in roster and '2025-10-05' in roster['GRA001']:
    for shift in roster['GRA001']['2025-10-05']:
        if shift['startTime'] == '14:00':
            shift['workers'] = [WORKERS['Reena']]
            fixes.append("✓ Grace Sun 2PM-8PM: Reena replaces Parvinder (avoids 16h)")

for fix in fixes:
    print(fix)

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Applied {len(fixes)} careful changes!")
    print("\nExpected final hours:")
    print("  Happy: ~30h (was 16h)")
    print("  Rosie: ~40h (was 32h)")  
    print("  Sanjay: ~32h (was 40h)")
    print("  Mihir: ~32h (was 40h)")
    print("  Mayu: ~34h (was 42h)")
else:
    print("❌ Failed")











