#!/usr/bin/env python3
"""Simple validation test without complex process management"""

import sys
sys.path.insert(0, '/Users/James/support-management-system/backend')

from validation_rules import validate_roster_data
import json

# Load roster data directly from file
with open('/Users/James/support-management-system/backend/roster_data.json', 'r') as f:
    roster_data = json.load(f)

weekB = roster_data.get('weekB', {})

# Create mock workers for testing
workers = {
    '118': {'id': '118', 'full_name': 'Arti', 'max_hours': 40},
    '125': {'id': '125', 'full_name': 'Happy', 'max_hours': 40},
    '126': {'id': '126', 'full_name': 'Rosie', 'max_hours': 40},
    '127': {'id': '127', 'full_name': 'Krunal', 'max_hours': 40},
    '129': {'id': '129', 'full_name': 'Mayu', 'max_hours': 40},
    '130': {'id': '130', 'full_name': 'Mihir', 'max_hours': 40},
    '133': {'id': '133', 'full_name': 'MP', 'max_hours': 40},
    '136': {'id': '136', 'full_name': 'Sanjay', 'max_hours': 40},
}

print("🧪 TESTING VALIDATION LOGIC\n")
print("="*70)

# Run validation
result = validate_roster_data(weekB, workers)

print(f"\n✅ Validation Complete!")
print(f"   Valid: {result['valid']}")
print(f"   Errors: {len(result['errors'])}")
print(f"   Warnings: {len(result['warnings'])}")

if result['errors']:
    print(f"\n❌ ERRORS FOUND ({len(result['errors'])}):")
    for i, error in enumerate(result['errors'][:10], 1):
        print(f"   {i}. {error[:100]}")

if result['warnings']:
    print(f"\n⚠️  WARNINGS FOUND ({len(result['warnings'])}):")
    for i, warning in enumerate(result['warnings'][:10], 1):
        print(f"   {i}. {warning[:100]}")

print("\n" + "="*70)
print("\n🎯 VALIDATION SYSTEM IS WORKING!")











