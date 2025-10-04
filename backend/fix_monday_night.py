#!/usr/bin/env python3
"""Fix Monday night understaffing"""
import requests

API_BASE = "http://localhost:8001/api"
roster = requests.get(f"{API_BASE}/roster/weekB").json()

WORKERS = {'MP': '133', 'Reena': '135'}

# Add MP to James Monday night
for shift in roster['JAM001']['2025-09-29']:
    if shift['startTime'] == '22:00':
        if WORKERS['MP'] not in shift['workers']:
            shift['workers'].append(WORKERS['MP'])
            print(f"✓ Added MP to James Monday 10PM-6AM")
            print(f"  Workers now: {len(shift['workers'])}/2")

requests.post(f"{API_BASE}/roster/weekB", json=roster)
print("✅ Fixed!")











