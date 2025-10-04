#!/usr/bin/env python3
"""
Focused Backend Testing for User-Reported Broken Functionality
Tests the specific issues the user reported:
1. DELETE WORKER FUNCTION - delete button not working
2. COPY TEMPLATE FUNCTION - copy template not working
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Configuration
BASE_URL = "http://localhost:8001/api"
HEADERS = {"Content-Type": "application/json"}

class FocusedTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: str = ""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_delete_worker_functionality(self):
        """Test DELETE worker functionality - the user says delete button isn't working"""
        print("\n🔍 TESTING DELETE WORKER FUNCTIONALITY")
        print("=" * 50)
        
        try:
            # Step 1: GET /api/workers to see current workers
            print("Step 1: Getting current workers...")
            response = requests.get(f"{self.base_url}/workers", timeout=10)
            if response.status_code != 200:
                self.log_test("Delete Worker - Get Initial Workers", False, f"Failed to get workers: HTTP {response.status_code}", response.text)
                return False
            
            initial_workers = response.json()
            if not initial_workers or len(initial_workers) == 0:
                self.log_test("Delete Worker - Get Initial Workers", False, "No workers found to test deletion")
                return False
            
            print(f"Found {len(initial_workers)} workers initially")
            active_workers = [w for w in initial_workers if w.get('status') == 'Active']
            print(f"Active workers: {len(active_workers)}")
            
            if len(active_workers) == 0:
                self.log_test("Delete Worker - Get Initial Workers", False, "No active workers found to test deletion")
                return False
            
            # Pick the first active worker for deletion test
            test_worker = active_workers[0]
            worker_id = test_worker.get('id') or test_worker.get('code')
            worker_name = test_worker.get('full_name', 'Unknown')
            
            print(f"Selected worker for deletion test: {worker_name} (ID: {worker_id})")
            self.log_test("Delete Worker - Get Initial Workers", True, f"Found {len(initial_workers)} workers, selected {worker_name} for deletion test")
            
            # Step 2: DELETE /api/workers/{worker_id} for the specific worker
            print(f"Step 2: Deleting worker {worker_id}...")
            delete_response = requests.delete(f"{self.base_url}/workers/{worker_id}", timeout=10)
            
            if delete_response.status_code == 200:
                delete_result = delete_response.json()
                print(f"Delete response: {delete_result}")
                self.log_test("Delete Worker - Delete Operation", True, f"Delete API returned success for worker {worker_id}")
            else:
                self.log_test("Delete Worker - Delete Operation", False, f"Delete failed: HTTP {delete_response.status_code}", delete_response.text)
                return False
            
            # Step 3: GET /api/workers again to confirm the worker is gone or inactive
            print("Step 3: Verifying worker deletion...")
            verification_response = requests.get(f"{self.base_url}/workers", timeout=10)
            if verification_response.status_code != 200:
                self.log_test("Delete Worker - Verify Deletion", False, f"Failed to get workers for verification: HTTP {verification_response.status_code}", verification_response.text)
                return False
            
            final_workers = verification_response.json()
            print(f"Found {len(final_workers)} workers after deletion")
            
            # Check if worker is gone or marked as inactive
            deleted_worker = None
            for worker in final_workers:
                if (worker.get('id') == worker_id or worker.get('code') == worker_id):
                    deleted_worker = worker
                    break
            
            if deleted_worker is None:
                # Worker completely removed
                self.log_test("Delete Worker - Verify Deletion", True, f"Worker {worker_id} completely removed from system")
                print(f"✅ Worker {worker_name} completely removed")
                return True
            elif deleted_worker.get('status') == 'Inactive':
                # Worker marked as inactive
                self.log_test("Delete Worker - Verify Deletion", True, f"Worker {worker_id} marked as Inactive")
                print(f"✅ Worker {worker_name} marked as Inactive")
                return True
            else:
                # Worker still active - deletion failed
                self.log_test("Delete Worker - Verify Deletion", False, f"Worker {worker_id} still active after deletion", f"Worker status: {deleted_worker.get('status')}")
                print(f"❌ Worker {worker_name} still active with status: {deleted_worker.get('status')}")
                return False
                
        except Exception as e:
            self.log_test("Delete Worker - Exception", False, "Delete worker test failed with exception", str(e))
            return False
    
    def test_copy_template_functionality(self):
        """Test COPY template functionality - the user says copy template isn't working"""
        print("\n🔍 TESTING COPY TEMPLATE FUNCTIONALITY")
        print("=" * 50)
        
        try:
            # Step 1: GET /api/roster/weekA to see what data exists
            print("Step 1: Getting weekA data...")
            week_a_response = requests.get(f"{self.base_url}/roster/weekA", timeout=10)
            if week_a_response.status_code != 200:
                self.log_test("Copy Template - Get WeekA", False, f"Failed to get weekA: HTTP {week_a_response.status_code}", week_a_response.text)
                return False
            
            week_a_data = week_a_response.json()
            print(f"WeekA data: {json.dumps(week_a_data, indent=2)}")
            
            # If weekA is empty, add some test data
            if not week_a_data or not week_a_data.get('shifts'):
                print("WeekA is empty, adding test data...")
                test_week_a = {
                    "shifts": {
                        "monday": {
                            "morning": {
                                "participants": ["LIB001", "ACE001"],
                                "workers": ["GAU001", "VER001"],
                                "location": "Glandore",
                                "hours": 6,
                                "startTime": "09:00",
                                "endTime": "15:00"
                            }
                        },
                        "tuesday": {
                            "afternoon": {
                                "participants": ["JAM001"],
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
                
                setup_response = requests.post(f"{self.base_url}/roster/weekA", json=test_week_a, headers=self.headers, timeout=10)
                if setup_response.status_code == 200:
                    week_a_data = test_week_a
                    print("✅ Added test data to weekA")
                else:
                    self.log_test("Copy Template - Setup WeekA", False, "Failed to add test data to weekA", setup_response.text)
                    return False
            
            self.log_test("Copy Template - Get WeekA", True, f"Retrieved weekA data with {len(week_a_data.get('shifts', {}))} days")
            
            # Step 2: GET /api/roster/weekB to see what data exists
            print("Step 2: Getting weekB data...")
            week_b_response = requests.get(f"{self.base_url}/roster/weekB", timeout=10)
            if week_b_response.status_code != 200:
                self.log_test("Copy Template - Get WeekB", False, f"Failed to get weekB: HTTP {week_b_response.status_code}", week_b_response.text)
                return False
            
            week_b_data = week_b_response.json()
            print(f"WeekB data: {json.dumps(week_b_data, indent=2)}")
            
            # If weekB is empty, add some test data
            if not week_b_data or not week_b_data.get('shifts'):
                print("WeekB is empty, adding test data...")
                test_week_b = {
                    "shifts": {
                        "wednesday": {
                            "morning": {
                                "participants": ["MIL001", "GRA001"],
                                "workers": ["MIH001", "CHA001"],
                                "location": "Glandore",
                                "hours": 5,
                                "startTime": "08:00",
                                "endTime": "13:00"
                            }
                        },
                        "thursday": {
                            "afternoon": {
                                "participants": ["LIB001"],
                                "workers": ["HAP001", "MEE001"],
                                "location": "Plympton Park",
                                "hours": 6,
                                "startTime": "12:00",
                                "endTime": "18:00"
                            }
                        }
                    },
                    "updated_at": "2024-01-15T10:00:00Z"
                }
                
                setup_response = requests.post(f"{self.base_url}/roster/weekB", json=test_week_b, headers=self.headers, timeout=10)
                if setup_response.status_code == 200:
                    week_b_data = test_week_b
                    print("✅ Added test data to weekB")
                else:
                    self.log_test("Copy Template - Setup WeekB", False, "Failed to add test data to weekB", setup_response.text)
                    return False
            
            self.log_test("Copy Template - Get WeekB", True, f"Retrieved weekB data with {len(week_b_data.get('shifts', {}))} days")
            
            # Step 3: POST the weekA data to /api/roster/nextA
            print("Step 3: Copying weekA to nextA...")
            copy_a_data = week_a_data.copy()
            copy_a_data["template_source"] = "weekA"
            copy_a_data["copied_at"] = "2024-01-15T11:00:00Z"
            
            copy_a_response = requests.post(f"{self.base_url}/roster/nextA", json=copy_a_data, headers=self.headers, timeout=10)
            if copy_a_response.status_code != 200:
                self.log_test("Copy Template - Copy WeekA to NextA", False, f"Failed to copy weekA to nextA: HTTP {copy_a_response.status_code}", copy_a_response.text)
                return False
            
            print("✅ Successfully posted weekA data to nextA")
            self.log_test("Copy Template - Copy WeekA to NextA", True, "Successfully copied weekA data to nextA")
            
            # Step 4: POST the weekB data to /api/roster/nextB
            print("Step 4: Copying weekB to nextB...")
            copy_b_data = week_b_data.copy()
            copy_b_data["template_source"] = "weekB"
            copy_b_data["copied_at"] = "2024-01-15T11:00:00Z"
            
            copy_b_response = requests.post(f"{self.base_url}/roster/nextB", json=copy_b_data, headers=self.headers, timeout=10)
            if copy_b_response.status_code != 200:
                self.log_test("Copy Template - Copy WeekB to NextB", False, f"Failed to copy weekB to nextB: HTTP {copy_b_response.status_code}", copy_b_response.text)
                return False
            
            print("✅ Successfully posted weekB data to nextB")
            self.log_test("Copy Template - Copy WeekB to NextB", True, "Successfully copied weekB data to nextB")
            
            # Step 5: GET /api/roster/nextA and /api/roster/nextB to confirm the data was copied
            print("Step 5: Verifying copied data...")
            
            # Verify nextA
            next_a_response = requests.get(f"{self.base_url}/roster/nextA", timeout=10)
            if next_a_response.status_code != 200:
                self.log_test("Copy Template - Verify NextA", False, f"Failed to get nextA for verification: HTTP {next_a_response.status_code}", next_a_response.text)
                return False
            
            next_a_data = next_a_response.json()
            print(f"NextA data: {json.dumps(next_a_data, indent=2)}")
            
            # Compare shifts data
            original_shifts_a = week_a_data.get('shifts', {})
            copied_shifts_a = next_a_data.get('shifts', {})
            
            if original_shifts_a == copied_shifts_a:
                print("✅ NextA data matches weekA data perfectly")
                self.log_test("Copy Template - Verify NextA Data", True, "NextA data matches weekA data perfectly")
            else:
                print("❌ NextA data does not match weekA data")
                print(f"Original weekA shifts: {original_shifts_a}")
                print(f"Copied nextA shifts: {copied_shifts_a}")
                self.log_test("Copy Template - Verify NextA Data", False, "NextA data does not match weekA data", f"Original: {original_shifts_a}, Copied: {copied_shifts_a}")
                return False
            
            # Verify nextB
            next_b_response = requests.get(f"{self.base_url}/roster/nextB", timeout=10)
            if next_b_response.status_code != 200:
                self.log_test("Copy Template - Verify NextB", False, f"Failed to get nextB for verification: HTTP {next_b_response.status_code}", next_b_response.text)
                return False
            
            next_b_data = next_b_response.json()
            print(f"NextB data: {json.dumps(next_b_data, indent=2)}")
            
            # Compare shifts data
            original_shifts_b = week_b_data.get('shifts', {})
            copied_shifts_b = next_b_data.get('shifts', {})
            
            if original_shifts_b == copied_shifts_b:
                print("✅ NextB data matches weekB data perfectly")
                self.log_test("Copy Template - Verify NextB Data", True, "NextB data matches weekB data perfectly")
                return True
            else:
                print("❌ NextB data does not match weekB data")
                print(f"Original weekB shifts: {original_shifts_b}")
                print(f"Copied nextB shifts: {copied_shifts_b}")
                self.log_test("Copy Template - Verify NextB Data", False, "NextB data does not match weekB data", f"Original: {original_shifts_b}, Copied: {copied_shifts_b}")
                return False
                
        except Exception as e:
            self.log_test("Copy Template - Exception", False, "Copy template test failed with exception", str(e))
            return False
    
    def run_focused_tests(self):
        """Run the focused tests for user-reported issues"""
        print("🎯 FOCUSED TESTING FOR USER-REPORTED BROKEN FUNCTIONALITY")
        print("=" * 70)
        print("Testing the specific issues the user reported:")
        print("1. DELETE WORKER FUNCTION - delete button not working")
        print("2. COPY TEMPLATE FUNCTION - copy template not working")
        print("=" * 70)
        
        # Test 1: Delete Worker Functionality
        delete_worker_ok = self.test_delete_worker_functionality()
        
        # Test 2: Copy Template Functionality  
        copy_template_ok = self.test_copy_template_functionality()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 FOCUSED TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n🎯 USER-REPORTED ISSUE STATUS:")
        print(f"1. DELETE WORKER FUNCTION: {'✅ WORKING' if delete_worker_ok else '❌ BROKEN'}")
        print(f"2. COPY TEMPLATE FUNCTION: {'✅ WORKING' if copy_template_ok else '❌ BROKEN'}")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        # Overall assessment
        if delete_worker_ok and copy_template_ok:
            print("\n✅ BOTH USER-REPORTED ISSUES ARE WORKING AT BACKEND LEVEL")
            print("If user still reports issues, the problem is likely in the frontend.")
            return True
        else:
            print("\n❌ BACKEND ISSUES FOUND - These need to be fixed before frontend testing")
            return False

def main():
    """Main test execution"""
    tester = FocusedTester()
    success = tester.run_focused_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()