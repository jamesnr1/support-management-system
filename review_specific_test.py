#!/usr/bin/env python3
"""
Review-Specific Testing for Rostering System
Testing the exact requirements mentioned in the review request.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://shift-master-27.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def test_review_requirements():
    """Test the specific requirements from the review request"""
    print("🔍 Testing Review-Specific Requirements")
    print("=" * 60)
    
    results = []
    
    # 1. GET /api/participants (should return 5 participants)
    try:
        response = requests.get(f"{BASE_URL}/participants", timeout=10)
        if response.status_code == 200:
            participants = response.json()
            if len(participants) == 5:
                print("✅ GET /api/participants: Returns exactly 5 participants")
                results.append(True)
            else:
                print(f"❌ GET /api/participants: Expected 5 participants, got {len(participants)}")
                results.append(False)
        else:
            print(f"❌ GET /api/participants: HTTP {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"❌ GET /api/participants: {str(e)}")
        results.append(False)
    
    # 2. GET /api/workers (should return 8 workers)
    try:
        response = requests.get(f"{BASE_URL}/workers", timeout=10)
        if response.status_code == 200:
            workers = response.json()
            if len(workers) == 8:
                print("✅ GET /api/workers: Returns exactly 8 workers")
                results.append(True)
            else:
                print(f"❌ GET /api/workers: Expected 8 workers, got {len(workers)}")
                results.append(False)
        else:
            print(f"❌ GET /api/workers: HTTP {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"❌ GET /api/workers: {str(e)}")
        results.append(False)
    
    # 3. GET /api/locations (should return 2 locations)
    try:
        response = requests.get(f"{BASE_URL}/locations", timeout=10)
        if response.status_code == 200:
            locations = response.json()
            if len(locations) == 2:
                print("✅ GET /api/locations: Returns exactly 2 locations")
                results.append(True)
            else:
                print(f"❌ GET /api/locations: Expected 2 locations, got {len(locations)}")
                results.append(False)
        else:
            print(f"❌ GET /api/locations: HTTP {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"❌ GET /api/locations: {str(e)}")
        results.append(False)
    
    # 4. Test all roster week types
    week_types = ["weekA", "weekB", "nextA", "nextB"]
    for week_type in week_types:
        try:
            response = requests.get(f"{BASE_URL}/roster/{week_type}", timeout=10)
            if response.status_code == 200:
                print(f"✅ GET /api/roster/{week_type}: Accessible and returns data")
                results.append(True)
            else:
                print(f"❌ GET /api/roster/{week_type}: HTTP {response.status_code}")
                results.append(False)
        except Exception as e:
            print(f"❌ GET /api/roster/{week_type}: {str(e)}")
            results.append(False)
    
    # 5. Test Copy Template Flow with data that has 2+ participants with shifts
    print("\n🔄 Testing Copy Template Flow with 2+ participants...")
    
    # Set up weekA with 2+ participants
    week_a_test_data = {
        "shifts": {
            "monday": {
                "morning": {
                    "participants": ["LIB001", "ACE001", "GRA001"],  # 3 participants
                    "workers": ["GAU001", "VER001", "HAP001"],
                    "location": "Glandore",
                    "hours": 6,
                    "startTime": "09:00",
                    "endTime": "15:00"
                }
            },
            "tuesday": {
                "afternoon": {
                    "participants": ["JAM001", "MIL001"],  # 2 participants
                    "workers": ["SAN001", "KRU001"],
                    "location": "Plympton Park",
                    "hours": 4,
                    "startTime": "13:00",
                    "endTime": "17:00"
                }
            }
        },
        "updated_at": "2024-01-15T10:00:00Z"
    }
    
    # Set up weekB with 2+ participants
    week_b_test_data = {
        "shifts": {
            "wednesday": {
                "morning": {
                    "participants": ["LIB001", "ACE001"],  # 2 participants
                    "workers": ["CHA001", "MEE001"],
                    "location": "Glandore",
                    "hours": 5,
                    "startTime": "10:00",
                    "endTime": "15:00"
                }
            },
            "friday": {
                "afternoon": {
                    "participants": ["JAM001", "GRA001", "MIL001"],  # 3 participants
                    "workers": ["MIH001", "GAU001", "VER001"],
                    "location": "Plympton Park",
                    "hours": 6,
                    "startTime": "14:00",
                    "endTime": "20:00"
                }
            }
        },
        "updated_at": "2024-01-15T10:00:00Z"
    }
    
    try:
        # Setup weekA
        response = requests.post(f"{BASE_URL}/roster/weekA", json=week_a_test_data, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            print("✅ Setup weekA with 2+ participants: Success")
            results.append(True)
        else:
            print(f"❌ Setup weekA: HTTP {response.status_code}")
            results.append(False)
            
        # Setup weekB
        response = requests.post(f"{BASE_URL}/roster/weekB", json=week_b_test_data, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            print("✅ Setup weekB with 2+ participants: Success")
            results.append(True)
        else:
            print(f"❌ Setup weekB: HTTP {response.status_code}")
            results.append(False)
        
        # Verify weekA has 2+ participants
        response = requests.get(f"{BASE_URL}/roster/weekA", timeout=10)
        if response.status_code == 200:
            week_a_data = response.json()
            participant_count = 0
            if "shifts" in week_a_data:
                for day, day_shifts in week_a_data["shifts"].items():
                    for period, shift in day_shifts.items():
                        if "participants" in shift:
                            participant_count += len(shift["participants"])
            
            if participant_count >= 2:
                print(f"✅ WeekA has {participant_count} participant assignments (≥2)")
                results.append(True)
            else:
                print(f"❌ WeekA has only {participant_count} participant assignments (<2)")
                results.append(False)
        else:
            print(f"❌ Failed to verify weekA participants: HTTP {response.status_code}")
            results.append(False)
        
        # Verify weekB has 2+ participants
        response = requests.get(f"{BASE_URL}/roster/weekB", timeout=10)
        if response.status_code == 200:
            week_b_data = response.json()
            participant_count = 0
            if "shifts" in week_b_data:
                for day, day_shifts in week_b_data["shifts"].items():
                    for period, shift in day_shifts.items():
                        if "participants" in shift:
                            participant_count += len(shift["participants"])
            
            if participant_count >= 2:
                print(f"✅ WeekB has {participant_count} participant assignments (≥2)")
                results.append(True)
            else:
                print(f"❌ WeekB has only {participant_count} participant assignments (<2)")
                results.append(False)
        else:
            print(f"❌ Failed to verify weekB participants: HTTP {response.status_code}")
            results.append(False)
        
        # Test POST /api/roster/nextA (copy weekA data)
        response = requests.get(f"{BASE_URL}/roster/weekA", timeout=10)
        if response.status_code == 200:
            source_data = response.json()
            copy_data = source_data.copy()
            copy_data["template_source"] = "weekA"
            copy_data["copied_at"] = "2024-01-15T11:00:00Z"
            
            response = requests.post(f"{BASE_URL}/roster/nextA", json=copy_data, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                print("✅ POST /api/roster/nextA (copy weekA): Success")
                results.append(True)
                
                # Verify data integrity
                response = requests.get(f"{BASE_URL}/roster/nextA", timeout=10)
                if response.status_code == 200:
                    copied_data = response.json()
                    if "shifts" in copied_data and copied_data["shifts"] == source_data["shifts"]:
                        print("✅ Data integrity verification: nextA matches weekA")
                        results.append(True)
                    else:
                        print("❌ Data integrity verification: nextA doesn't match weekA")
                        results.append(False)
                else:
                    print(f"❌ Failed to verify nextA data: HTTP {response.status_code}")
                    results.append(False)
            else:
                print(f"❌ POST /api/roster/nextA: HTTP {response.status_code}")
                results.append(False)
        else:
            print(f"❌ Failed to get weekA for copying: HTTP {response.status_code}")
            results.append(False)
        
        # Test POST /api/roster/nextB (copy weekB data)
        response = requests.get(f"{BASE_URL}/roster/weekB", timeout=10)
        if response.status_code == 200:
            source_data = response.json()
            copy_data = source_data.copy()
            copy_data["template_source"] = "weekB"
            copy_data["copied_at"] = "2024-01-15T11:00:00Z"
            
            response = requests.post(f"{BASE_URL}/roster/nextB", json=copy_data, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                print("✅ POST /api/roster/nextB (copy weekB): Success")
                results.append(True)
                
                # Verify data integrity
                response = requests.get(f"{BASE_URL}/roster/nextB", timeout=10)
                if response.status_code == 200:
                    copied_data = response.json()
                    if "shifts" in copied_data and copied_data["shifts"] == source_data["shifts"]:
                        print("✅ Data integrity verification: nextB matches weekB")
                        results.append(True)
                    else:
                        print("❌ Data integrity verification: nextB doesn't match weekB")
                        results.append(False)
                else:
                    print(f"❌ Failed to verify nextB data: HTTP {response.status_code}")
                    results.append(False)
            else:
                print(f"❌ POST /api/roster/nextB: HTTP {response.status_code}")
                results.append(False)
        else:
            print(f"❌ Failed to get weekB for copying: HTTP {response.status_code}")
            results.append(False)
            
    except Exception as e:
        print(f"❌ Copy Template Flow test failed: {str(e)}")
        results.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 REVIEW REQUIREMENTS TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = sum(results)
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if all(results):
        print("\n✅ ALL REVIEW REQUIREMENTS SATISFIED")
        return True
    else:
        print("\n❌ SOME REVIEW REQUIREMENTS NOT MET")
        return False

def main():
    """Main test execution"""
    success = test_review_requirements()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()