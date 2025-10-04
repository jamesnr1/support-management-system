#!/usr/bin/env python3
"""
Fix Sandy and Rosie assignments:
- Sandy: ONLY Mon/Tue/Fri/Sun 6-8AM (Grace)
- Rosie: Tue/Wed/Thu 2-8PM (14:00-22:00)
"""

import requests

API_BASE = "http://localhost:8001/api"
roster = requests.get(f"{API_BASE}/roster/weekB").json()

SANDY = '135'
ROSIE = '126'

print("🔧 FIXING SANDY & ROSIE ASSIGNMENTS\n")

# 1. Remove Sandy from ALL shifts except Monday/Tuesday/Friday 6-8AM
print("1️⃣ Cleaning up Sandy's shifts...")
days_to_keep = {
    '2025-09-29': ('06:00', '08:00'),  # Monday
    '2025-09-30': ('06:00', '08:00'),  # Tuesday
    '2025-10-03': ('06:00', '08:00'),  # Friday
}

for p_code, dates in roster.items():
    for date, shifts in dates.items():
        for shift in shifts:
            if SANDY in shift.get('workers', []):
                # Keep only if it's Grace 6-8AM on Mon/Tue/Fri
                keep = (p_code == 'GRA001' and 
                       date in days_to_keep and 
                       shift['startTime'] == days_to_keep[date][0] and
                       shift['endTime'] == days_to_keep[date][1])
                
                if not keep:
                    shift['workers'].remove(SANDY)
                    print(f"  ✓ Removed Sandy from {p_code} {date} {shift['startTime']}-{shift['endTime']}")

# 2. Add Sandy to Sunday 6-8AM (Grace)
print("\n2️⃣ Adding Sandy to Sunday 6-8AM...")
sunday = '2025-10-05'
if 'GRA001' in roster and sunday in roster['GRA001']:
    for shift in roster['GRA001'][sunday]:
        if shift['startTime'] == '06:00' and shift['endTime'] == '08:00':
            if SANDY not in shift['workers']:
                shift['workers'].append(SANDY)
                print(f"  ✓ Added Sandy to Grace Sunday 6-8AM")

# 3. Remove Rosie from ALL shifts first
print("\n3️⃣ Cleaning up Rosie's shifts...")
for p_code, dates in roster.items():
    for date, shifts in dates.items():
        for shift in shifts:
            if ROSIE in shift.get('workers', []):
                shift['workers'].remove(ROSIE)
                print(f"  ✓ Removed Rosie from {p_code} {date} {shift['startTime']}-{shift['endTime']}")

# 4. Add Rosie to Tue/Wed/Thu 2-8PM
print("\n4️⃣ Adding Rosie to Tue/Wed/Thu 2-8PM...")
rosie_days = {
    '2025-09-30': 'Tuesday',
    '2025-10-01': 'Wednesday',
    '2025-10-02': 'Thursday',
}

for date, day_name in rosie_days.items():
    if 'JAM001' in roster and date in roster['JAM001']:
        found = False
        for shift in roster['JAM001'][date]:
            if shift['startTime'] == '14:00' and shift['endTime'] == '22:00':
                if ROSIE not in shift['workers']:
                    shift['workers'].append(ROSIE)
                    print(f"  ✓ Added Rosie to James {day_name} 2-8PM")
                    found = True
        if not found:
            print(f"  ⚠️ No 2-8PM shift found for James on {day_name}")

print("\n💾 Saving changes...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)

if response.status_code == 200:
    print("✅ Fixed Sandy and Rosie assignments!")
else:
    print(f"❌ Failed: {response.status_code}")

print("\n📋 VERIFICATION:")
print("\nSandy should have:")
print("  Mon/Tue/Fri/Sun 6-8AM ONLY")
print("\nRosie should have:")
print("  Tue/Wed/Thu 2-8PM")











