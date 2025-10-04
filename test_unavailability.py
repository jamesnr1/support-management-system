#!/usr/bin/env python3
"""Test script for unavailability system"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001/api"

def test_unavailability():
    # Test worker ID (Anika)
    worker_id = 117
    
    # Create test unavailability period (starting today for 7 days)
    today = datetime.now().date()
    from_date = today.isoformat()
    to_date = (today + timedelta(days=7)).isoformat()
    
    print(f"🧪 Testing unavailability for worker {worker_id}")
    print(f"📅 Period: {from_date} to {to_date}")
    
    # Step 1: Add unavailability
    print("\n1️⃣ Adding unavailability period...")
    payload = {
        "from_date": from_date,
        "to_date": to_date,
        "reason": "Holiday"
    }
    
    response = requests.post(f"{BASE_URL}/workers/{worker_id}/unavailability", json=payload)
    print(f"   Response status: {response.status_code}")
    print(f"   Response body: {response.json()}")
    
    if response.status_code != 200:
        print(f"❌ Failed to add unavailability: {response.text}")
        return False
    
    # Step 2: Verify it was saved
    print("\n2️⃣ Fetching unavailability periods...")
    response = requests.get(f"{BASE_URL}/workers/{worker_id}/unavailability")
    print(f"   Response status: {response.status_code}")
    
    if response.status_code == 200:
        periods = response.json()
        print(f"   Found {len(periods)} unavailability period(s)")
        
        for period in periods:
            print(f"   📋 Period: {period['from_date']} to {period['to_date']} - {period['reason']}")
            
        # Check if our period exists
        found = any(p['from_date'] == from_date and p['to_date'] == to_date for p in periods)
        if found:
            print("✅ Unavailability period was saved successfully!")
            return True
        else:
            print("❌ Unavailability period was not found in the database")
            return False
    else:
        print(f"❌ Failed to fetch unavailability: {response.text}")
        return False

if __name__ == "__main__":
    success = test_unavailability()
    exit(0 if success else 1)
