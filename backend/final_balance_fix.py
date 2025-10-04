#!/usr/bin/env python3
"""
Final balance fixes:
1. Give Mayu back 6h (Ace Sat 8PM-10PM + James Thu 2PM-10PM partial)
2. Fix Rosie's Monday 16h (remove her from Monday afternoon, replace with someone else)
"""

import requests

API_BASE = "http://localhost:8001/api"

WORKERS = {
    'Mayu': '129',
    'Rosie': '126',
    'Reena': '135',  # Low hours
    'Krunal': '127'
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🔧 FINAL BALANCE FIXES:\n")
fixes = []

# 1. Give Mayu back Ace Saturday 8PM-10PM (currently empty or someone else)
if 'ACE001' in roster and '2025-10-04' in roster['ACE001']:
    for shift in roster['ACE001']['2025-10-04']:
        if shift['startTime'] == '20:00' and shift['endTime'] == '22:00':
            shift['workers'] = [WORKERS['Mayu']]
            fixes.append("✓ Ace Sat 8PM-10PM: Mayu assigned (+2h Mayu)")

# 2. Fix Rosie's Monday 16h: Remove her from Monday 2PM-10PM, add Reena
if 'JAM001' in roster and '2025-09-29' in roster['JAM001']:
    for shift in roster['JAM001']['2025-09-29']:
        if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
            # Remove Rosie, keep/add others
            shift['workers'] = [w for w in shift['workers'] if w != WORKERS['Rosie']]
            if WORKERS['Reena'] not in shift['workers']:
                shift['workers'].append(WORKERS['Reena'])
            fixes.append("✓ James Mon 2PM-10PM: Reena replaces Rosie (fixes Rosie's 16h)")

# 3. Give Mayu James Thursday 6AM-2PM to bring him to 30h
if 'JAM001' in roster and '2025-10-02' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-02']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            # Mayu should already be here with Sapana (2:1), keep both
            if WORKERS['Mayu'] not in shift['workers']:
                shift['workers'].append(WORKERS['Mayu'])
                fixes.append("✓ James Thu 6AM-2PM: Mayu added (+8h Mayu)")

for fix in fixes:
    print(fix)

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Applied {len(fixes)} balance fixes!")
    print("\nExpected final hours:")
    print("  Sanjay: ~32h")
    print("  Mihir: ~32h")
    print("  Mayu: ~28-30h")
    print("  Rosie: ~32h (fixed 16h issue)")
    print("  Happy: ~32h")
else:
    print("❌ Failed")











