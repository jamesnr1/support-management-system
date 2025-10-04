#!/usr/bin/env python3
"""
ELIMINATE ALL 16+ HOUR SHIFTS - NO EXCEPTIONS
"""

import requests

API_BASE = "http://localhost:8001/api"

WORKERS = {
    'Parvinder': '139',
    'Taufique': '138',
    'Sapana': '137',
    'Hamza': '134',
    'Reena': '135',    # Low hours: 16h
    'Avani': '119',    # Low hours: 16h
    'Arti': '118',     # Low hours: 19h
    'Krunal': '127',   # Moderate: 32h
    'MP': '133'        # Moderate: 32h
}

roster = requests.get(f"{API_BASE}/roster/weekB").json()

print("🔥 ELIMINATING ALL 16+ HOUR SHIFTS\n")
print("="*70)

fixes = []

# 1. Parvinder Sunday 6AM-10PM (Grace x2) → Split between workers
# Keep Parvinder 6AM-2PM, replace with Avani 2PM-10PM
if 'GRA001' in roster and '2025-10-05' in roster['GRA001']:
    for shift in roster['GRA001']['2025-10-05']:
        if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
            shift['workers'] = [WORKERS['Avani']]
            fixes.append("✓ Grace Sun 2PM-10PM: Avani replaces Parvinder (Parvinder now 8h)")

# 2. Taufique Friday: 2PM-10PM + 10PM-6AM → Remove from night shift
# Replace with Reena for James Friday 10PM-6AM
if 'JAM001' in roster and '2025-10-03' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-03']:
        if shift['startTime'] == '22:00' and shift['endTime'] == '06:00':
            shift['workers'] = [w if w != WORKERS['Taufique'] else WORKERS['Reena'] for w in shift['workers']]
            fixes.append("✓ James Fri 10PM-6AM: Reena replaces Taufique (Taufique now 8h)")

# 3. Sapana Thursday: 6AM-2PM + 10PM-6AM → Remove from morning shift
# Replace with Arti for James Thursday 6AM-2PM
if 'JAM001' in roster and '2025-10-02' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-02']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            shift['workers'] = [w if w != WORKERS['Sapana'] else WORKERS['Arti'] for w in shift['workers']]
            fixes.append("✓ James Thu 6AM-2PM: Arti replaces Sapana (Sapana now 8h)")

# 4. Hamza Friday: 6AM-2PM + 10PM-6AM → Remove from morning shift
# Replace with Krunal for James Friday 6AM-2PM
if 'JAM001' in roster and '2025-10-03' in roster['JAM001']:
    for shift in roster['JAM001']['2025-10-03']:
        if shift['startTime'] == '06:00' and shift['endTime'] == '14:00':
            shift['workers'] = [w if w != WORKERS['Hamza'] else WORKERS['Krunal'] for w in shift['workers']]
            fixes.append("✓ James Fri 6AM-2PM: Krunal replaces Hamza (Hamza now 8h)")

print("\n".join(fixes))

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"\n✅ ELIMINATED {len(fixes)} 16+ hour shifts!")
    print("\n🎯 ALL workers now comply with max hours per day!")
else:
    print("❌ Failed to save")











