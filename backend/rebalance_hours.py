#!/usr/bin/env python3
"""
Rebalance worker hours:
- Reduce: Sanjay (40h), Mihir (40h), Mayu (42h)
- Increase: Happy (16h - needs most!), Rosie (32h)
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

print("🔄 REBALANCING WORKER HOURS\n")
print("Goal: Happy +14h, Rosie +8h, Reduce Sanjay/Mihir/Mayu\n")

fixes = []
happy_added = 0
rosie_added = 0

# Strategy: Replace Sanjay/Mihir/Mayu with Happy first (until ~30h), then Rosie

replacements = [
    # Priority for Happy (needs 14h more)
    ('JAM001', '2025-09-29', '14:00', '22:00', WORKERS['Sanjay'], WORKERS['Happy'], 'Happy'),
    ('JAM001', '2025-09-30', '14:00', '22:00', WORKERS['Mihir'], WORKERS['Happy'], 'Happy'),
    ('JAM001', '2025-10-04', '22:00', '06:00', WORKERS['Mihir'], WORKERS['Happy'], 'Happy'),  # Remove Mihir from Saturday night
    ('ACE001', '2025-10-04', '06:00', '14:00', WORKERS['Mayu'], WORKERS['Happy'], 'Happy'),  # Ace Saturday morning
    
    # For Rosie (needs 8h more)
    ('JAM001', '2025-09-29', '06:00', '14:00', WORKERS['Mayu'], WORKERS['Rosie'], 'Rosie'),  # Monday morning
    ('JAM001', '2025-10-02', '06:00', '14:00', WORKERS['Mayu'], WORKERS['Rosie'], 'Rosie'),  # Thursday morning
]

for p_code, date, start, end, remove_worker, add_worker, worker_name in replacements:
    if p_code in roster and date in roster[p_code]:
        for shift in roster[p_code][date]:
            if shift['startTime'] == start and shift['endTime'] == end:
                if remove_worker in shift.get('workers', []):
                    # Replace worker
                    shift['workers'] = [w if w != remove_worker else add_worker for w in shift['workers']]
                    duration = float(shift.get('duration', 0))
                    
                    if worker_name == 'Happy':
                        happy_added += duration
                    else:
                        rosie_added += duration
                    
                    fixes.append(f"✓ {p_code} {date} {start}-{end}: {worker_name} replaces worker")

# Additional: Give Happy Ace Saturday afternoon too
if 'ACE001' in roster and '2025-10-04' in roster['ACE001']:
    for shift in roster['ACE001']['2025-10-04']:
        if shift['startTime'] == '20:00' and shift['endTime'] == '22:00':
            if WORKERS['Mayu'] in shift.get('workers', []):
                shift['workers'] = [w if w != WORKERS['Mayu'] else WORKERS['Happy'] for w in shift['workers']]
                happy_added += 2
                fixes.append(f"✓ Ace Sat 8PM-10PM: Happy replaces Mayu")

for fix in fixes:
    print(fix)

print(f"\n📊 HOURS ADDED:")
print(f"  Happy: +{happy_added:.0f}h (target: +14h)")
print(f"  Rosie: +{rosie_added:.0f}h (target: +8h)")

print("\n💾 Saving...")
response = requests.post(f"{API_BASE}/roster/weekB", json=roster)
if response.status_code == 200:
    print(f"✅ Rebalanced {len(fixes)} shifts!")
else:
    print("❌ Failed to save")











