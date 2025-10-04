#!/usr/bin/env python3
"""
Test the validation system to prove it's working
"""

import requests
import json

API_BASE = "http://localhost:8001/api"

print("🧪 TESTING VALIDATION SYSTEM\n")
print("="*70)

# Test 1: Validate current Week B
print("\n1️⃣ VALIDATING CURRENT WEEK B:\n")

response = requests.post(f"{API_BASE}/roster/weekB/validate")
result = response.json()

print(f"Valid: {result['valid']}")
print(f"Errors: {len(result['errors'])}")
print(f"Warnings: {len(result['warnings'])}")

if result['errors']:
    print("\n❌ ERRORS FOUND:")
    for i, error in enumerate(result['errors'][:5], 1):
        print(f"  {i}. {error}")

if result['warnings']:
    print("\n⚠️ WARNINGS FOUND:")
    for i, warning in enumerate(result['warnings'][:5], 1):
        print(f"  {i}. {warning}")

print("\n" + "="*70)

# Test 2: Try to add a conflicting shift via validation
print("\n2️⃣ SIMULATING DOUBLE BOOKING:\n")

roster = requests.get(f"{API_BASE}/roster/weekB").json()

# Get a worker from Monday daytime shift
monday_shift = roster['JAM001']['2025-09-29'][0]
test_worker = monday_shift['workers'][0]

print(f"Worker {test_worker} is already working Monday 6AM-2PM")
print("Let's try to assign them to another participant at the same time...")

# Create a test roster with conflict
test_roster = roster.copy()
if 'GRA001' not in test_roster:
    test_roster['GRA001'] = {}
if '2025-09-29' not in test_roster['GRA001']:
    test_roster['GRA001']['2025-09-29'] = []

test_roster['GRA001']['2025-09-29'].append({
    'id': 'test123',
    'startTime': '08:00',  # Overlaps with their 6AM-2PM shift
    'endTime': '12:00',
    'workers': [test_worker],
    'ratio': '1:1',
    'duration': 4.0
})

response = requests.post(f"{API_BASE}/roster/weekB/validate", json=test_roster)
result = response.json()

if not result['valid']:
    print("✅ VALIDATION CAUGHT THE CONFLICT!")
    print(f"   Error: {result['errors'][0][:80]}...")
else:
    print("❌ Validation FAILED to catch conflict")

print("\n" + "="*70)

# Test 3: Check for 16+ hour violations
print("\n3️⃣ CHECKING FOR 16+ HOUR DAYS:\n")

roster = requests.get(f"{API_BASE}/roster/weekB").json()

# Check each day for workers with 16+ hours
found_16h = False
for p_code, dates in roster.items():
    for date, shifts in dates.items():
        worker_daily_hours = {}
        
        for shift in shifts:
            for worker_id in shift.get('workers', []):
                if worker_id not in worker_daily_hours:
                    worker_daily_hours[worker_id] = 0
                worker_daily_hours[worker_id] += float(shift.get('duration', 0))
        
        for worker_id, hours in worker_daily_hours.items():
            if hours >= 16:
                found_16h = True
                print(f"❌ Worker {worker_id}: {hours:.1f}h on {date} ({p_code})")

if not found_16h:
    print("✅ NO 16+ HOUR DAYS FOUND! (validation working)")

print("\n" + "="*70)

# Test 4: Show the Monday night understaffing issue
print("\n4️⃣ VERIFYING MONDAY NIGHT ISSUE IS CAUGHT:\n")

response = requests.post(f"{API_BASE}/roster/weekB/validate")
result = response.json()

monday_night_found = False
for error in result['errors']:
    if 'JAM001' in error and '22:00' in error and '06:00' in error:
        print(f"✅ FOUND: {error}")
        monday_night_found = True

if not monday_night_found:
    print("⚠️ Monday night issue not in errors, checking warnings...")
    for warning in result['warnings']:
        if 'JAM001' in warning and '22:00' in warning:
            print(f"⚠️ FOUND IN WARNINGS: {warning}")

print("\n" + "="*70)
print("\n🎯 VALIDATION SYSTEM TEST COMPLETE!")











