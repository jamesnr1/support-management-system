#!/usr/bin/env python3
"""
Backend API Testing for Rostering System
Tests all core functionality including CRUD operations, roster management, and new features.
"""

import requests
import json
import sys
from typing import Dict, Any, List
import uuid

# Configuration
BASE_URL = "https://staffhub-62.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class RosteringSystemTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.sample_roster_data = {}
        
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
    
    def test_health_check(self):
        """Test basic API health check"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "status" in data:
                    self.log_test("Health Check", True, "API is running and responsive")
                    return True
                else:
                    self.log_test("Health Check", False, "API response missing expected fields", str(data))
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Health Check", False, "Connection failed", str(e))
            return False
    
    def test_get_participants(self):
        """Test GET /api/participants endpoint"""
        try:
            response = requests.get(f"{self.base_url}/participants", timeout=10)
            if response.status_code == 200:
                participants = response.json()
                if isinstance(participants, list) and len(participants) > 0:
                    # Check if participants have required fields
                    sample_participant = participants[0]
                    required_fields = ["code", "full_name", "location"]
                    missing_fields = [field for field in required_fields if field not in sample_participant]
                    
                    if not missing_fields:
                        self.log_test("Get Participants", True, f"Retrieved {len(participants)} participants successfully")
                        return True
                    else:
                        self.log_test("Get Participants", False, f"Missing required fields: {missing_fields}", str(sample_participant))
                        return False
                else:
                    self.log_test("Get Participants", False, "No participants returned or invalid format", str(participants))
                    return False
            else:
                self.log_test("Get Participants", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Participants", False, "Request failed", str(e))
            return False
    
    def test_get_workers(self):
        """Test GET /api/workers endpoint"""
        try:
            response = requests.get(f"{self.base_url}/workers", timeout=10)
            if response.status_code == 200:
                workers = response.json()
                if isinstance(workers, list) and len(workers) > 0:
                    # Check if workers have required fields
                    sample_worker = workers[0]
                    required_fields = ["code", "full_name", "email", "status"]
                    missing_fields = [field for field in required_fields if field not in sample_worker]
                    
                    if not missing_fields:
                        self.log_test("Get Workers", True, f"Retrieved {len(workers)} workers successfully")
                        return True
                    else:
                        self.log_test("Get Workers", False, f"Missing required fields: {missing_fields}", str(sample_worker))
                        return False
                else:
                    self.log_test("Get Workers", False, "No workers returned or invalid format", str(workers))
                    return False
            else:
                self.log_test("Get Workers", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Workers", False, "Request failed", str(e))
            return False
    
    def test_get_locations(self):
        """Test GET /api/locations endpoint"""
        try:
            response = requests.get(f"{self.base_url}/locations", timeout=10)
            if response.status_code == 200:
                locations = response.json()
                if isinstance(locations, list) and len(locations) > 0:
                    # Check if locations have required fields
                    sample_location = locations[0]
                    required_fields = ["name"]
                    missing_fields = [field for field in required_fields if field not in sample_location]
                    
                    if not missing_fields:
                        self.log_test("Get Locations", True, f"Retrieved {len(locations)} locations successfully")
                        return True
                    else:
                        self.log_test("Get Locations", False, f"Missing required fields: {missing_fields}", str(sample_location))
                        return False
                else:
                    self.log_test("Get Locations", False, "No locations returned or invalid format", str(locations))
                    return False
            else:
                self.log_test("Get Locations", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Locations", False, "Request failed", str(e))
            return False
    
    def test_roster_operations(self):
        """Test roster CRUD operations for all week types"""
        week_types = ["weekA", "weekB", "nextA", "nextB"]
        all_success = True
        
        for week_type in week_types:
            # Test GET roster (should return empty initially)
            try:
                response = requests.get(f"{self.base_url}/roster/{week_type}", timeout=10)
                if response.status_code == 200:
                    roster_data = response.json()
                    self.log_test(f"Get Roster {week_type}", True, f"Retrieved roster data for {week_type}")
                else:
                    self.log_test(f"Get Roster {week_type}", False, f"HTTP {response.status_code}", response.text)
                    all_success = False
                    continue
            except Exception as e:
                self.log_test(f"Get Roster {week_type}", False, "Request failed", str(e))
                all_success = False
                continue
            
            # Test POST roster (update with sample data)
            sample_data = {
                "shifts": {
                    "monday": {
                        "morning": {
                            "participants": ["LIB001"],
                            "workers": ["GAU001", "VER001"],
                            "location": "Glandore",
                            "hours": 4
                        }
                    }
                },
                "updated_at": "2024-01-15T10:00:00Z"
            }
            
            try:
                response = requests.post(
                    f"{self.base_url}/roster/{week_type}", 
                    json=sample_data,
                    headers=self.headers,
                    timeout=10
                )
                if response.status_code == 200:
                    result = response.json()
                    if "message" in result:
                        self.log_test(f"Update Roster {week_type}", True, f"Successfully updated roster for {week_type}")
                        # Store sample data for copy functionality testing
                        self.sample_roster_data[week_type] = sample_data
                    else:
                        self.log_test(f"Update Roster {week_type}", False, "Invalid response format", str(result))
                        all_success = False
                else:
                    self.log_test(f"Update Roster {week_type}", False, f"HTTP {response.status_code}", response.text)
                    all_success = False
            except Exception as e:
                self.log_test(f"Update Roster {week_type}", False, "Request failed", str(e))
                all_success = False
        
        return all_success
    
    def test_copy_to_template_functionality(self):
        """Test Copy to Template functionality - copying Week A/B to Next A/B"""
        # First, ensure we have data in weekA and weekB
        week_a_data = {
            "shifts": {
                "monday": {
                    "morning": {
                        "participants": ["LIB001", "ACE001"],
                        "workers": ["GAU001", "VER001", "HAP001"],
                        "location": "Glandore",
                        "hours": 6
                    },
                    "afternoon": {
                        "participants": ["JAM001"],
                        "workers": ["SAN001", "KRU001"],
                        "location": "Plympton Park", 
                        "hours": 4
                    }
                },
                "tuesday": {
                    "morning": {
                        "participants": ["GRA001"],
                        "workers": ["CHA001", "MEE001"],
                        "location": "Glandore",
                        "hours": 5
                    }
                }
            },
            "template_source": "weekA",
            "updated_at": "2024-01-15T10:00:00Z"
        }
        
        week_b_data = {
            "shifts": {
                "wednesday": {
                    "morning": {
                        "participants": ["MIL001"],
                        "workers": ["MIH001", "GAU001"],
                        "location": "Glandore",
                        "hours": 4
                    }
                },
                "thursday": {
                    "afternoon": {
                        "participants": ["LIB001", "JAM001"],
                        "workers": ["VER001", "HAP001", "SAN001"],
                        "location": "Plympton Park",
                        "hours": 6
                    }
                }
            },
            "template_source": "weekB",
            "updated_at": "2024-01-15T10:00:00Z"
        }
        
        # Set up source data
        try:
            # Update weekA
            response = requests.post(
                f"{self.base_url}/roster/weekA",
                json=week_a_data,
                headers=self.headers,
                timeout=10
            )
            if response.status_code != 200:
                self.log_test("Copy to Template Setup", False, "Failed to set up weekA data", response.text)
                return False
            
            # Update weekB
            response = requests.post(
                f"{self.base_url}/roster/weekB",
                json=week_b_data,
                headers=self.headers,
                timeout=10
            )
            if response.status_code != 200:
                self.log_test("Copy to Template Setup", False, "Failed to set up weekB data", response.text)
                return False
            
        except Exception as e:
            self.log_test("Copy to Template Setup", False, "Failed to set up test data", str(e))
            return False
        
        # Test copying weekA to nextA
        try:
            # Get weekA data
            response = requests.get(f"{self.base_url}/roster/weekA", timeout=10)
            if response.status_code == 200:
                source_data = response.json()
                
                # Copy to nextA (simulate the copy functionality)
                copy_data = source_data.copy()
                copy_data["template_source"] = "weekA"
                copy_data["copied_at"] = "2024-01-15T11:00:00Z"
                
                response = requests.post(
                    f"{self.base_url}/roster/nextA",
                    json=copy_data,
                    headers=self.headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    # Verify the copy worked
                    response = requests.get(f"{self.base_url}/roster/nextA", timeout=10)
                    if response.status_code == 200:
                        copied_data = response.json()
                        if "shifts" in copied_data and copied_data["shifts"] == source_data["shifts"]:
                            self.log_test("Copy WeekA to NextA", True, "Successfully copied weekA data to nextA")
                        else:
                            self.log_test("Copy WeekA to NextA", False, "Copied data doesn't match source", f"Source: {source_data}, Copied: {copied_data}")
                            return False
                    else:
                        self.log_test("Copy WeekA to NextA", False, "Failed to verify copied data", response.text)
                        return False
                else:
                    self.log_test("Copy WeekA to NextA", False, f"Copy operation failed: HTTP {response.status_code}", response.text)
                    return False
            else:
                self.log_test("Copy WeekA to NextA", False, "Failed to get source data", response.text)
                return False
        except Exception as e:
            self.log_test("Copy WeekA to NextA", False, "Copy operation failed", str(e))
            return False
        
        # Test copying weekB to nextB
        try:
            # Get weekB data
            response = requests.get(f"{self.base_url}/roster/weekB", timeout=10)
            if response.status_code == 200:
                source_data = response.json()
                
                # Copy to nextB
                copy_data = source_data.copy()
                copy_data["template_source"] = "weekB"
                copy_data["copied_at"] = "2024-01-15T11:00:00Z"
                
                response = requests.post(
                    f"{self.base_url}/roster/nextB",
                    json=copy_data,
                    headers=self.headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    # Verify the copy worked
                    response = requests.get(f"{self.base_url}/roster/nextB", timeout=10)
                    if response.status_code == 200:
                        copied_data = response.json()
                        if "shifts" in copied_data and copied_data["shifts"] == source_data["shifts"]:
                            self.log_test("Copy WeekB to NextB", True, "Successfully copied weekB data to nextB")
                            return True
                        else:
                            self.log_test("Copy WeekB to NextB", False, "Copied data doesn't match source", f"Source: {source_data}, Copied: {copied_data}")
                            return False
                    else:
                        self.log_test("Copy WeekB to NextB", False, "Failed to verify copied data", response.text)
                        return False
                else:
                    self.log_test("Copy WeekB to NextB", False, f"Copy operation failed: HTTP {response.status_code}", response.text)
                    return False
            else:
                self.log_test("Copy WeekB to NextB", False, "Failed to get source data", response.text)
                return False
        except Exception as e:
            self.log_test("Copy WeekB to NextB", False, "Copy operation failed", str(e))
            return False
    
    def test_export_functionality(self):
        """Test Export functionality - retrieving all roster data for export"""
        try:
            all_roster_data = {}
            week_types = ["weekA", "weekB", "nextA", "nextB"]
            
            # Get all roster data
            for week_type in week_types:
                response = requests.get(f"{self.base_url}/roster/{week_type}", timeout=10)
                if response.status_code == 200:
                    all_roster_data[week_type] = response.json()
                else:
                    self.log_test("Export Functionality", False, f"Failed to get {week_type} data: HTTP {response.status_code}", response.text)
                    return False
            
            # Get supporting data
            participants_response = requests.get(f"{self.base_url}/participants", timeout=10)
            workers_response = requests.get(f"{self.base_url}/workers", timeout=10)
            locations_response = requests.get(f"{self.base_url}/locations", timeout=10)
            
            if all(r.status_code == 200 for r in [participants_response, workers_response, locations_response]):
                export_data = {
                    "rosters": all_roster_data,
                    "participants": participants_response.json(),
                    "workers": workers_response.json(),
                    "locations": locations_response.json(),
                    "exported_at": "2024-01-15T12:00:00Z"
                }
                
                # Verify export data structure
                required_keys = ["rosters", "participants", "workers", "locations"]
                missing_keys = [key for key in required_keys if key not in export_data]
                
                if not missing_keys:
                    # Check if we have data in each section
                    has_data = all(
                        len(export_data[key]) > 0 if isinstance(export_data[key], (list, dict)) else True
                        for key in required_keys
                    )
                    
                    if has_data:
                        self.log_test("Export Functionality", True, f"Successfully compiled export data with {len(export_data['rosters'])} roster weeks")
                        return True
                    else:
                        self.log_test("Export Functionality", False, "Export data structure is empty", str(export_data))
                        return False
                else:
                    self.log_test("Export Functionality", False, f"Missing required export keys: {missing_keys}", str(export_data))
                    return False
            else:
                failed_requests = []
                if participants_response.status_code != 200:
                    failed_requests.append(f"participants: {participants_response.status_code}")
                if workers_response.status_code != 200:
                    failed_requests.append(f"workers: {workers_response.status_code}")
                if locations_response.status_code != 200:
                    failed_requests.append(f"locations: {locations_response.status_code}")
                
                self.log_test("Export Functionality", False, f"Failed to get supporting data: {', '.join(failed_requests)}")
                return False
                
        except Exception as e:
            self.log_test("Export Functionality", False, "Export operation failed", str(e))
            return False
    
    def test_data_consistency(self):
        """Test data consistency across operations"""
        try:
            # Test that data persists across requests
            test_data = {
                "shifts": {
                    "friday": {
                        "morning": {
                            "participants": ["LIB001"],
                            "workers": ["GAU001"],
                            "location": "Glandore",
                            "hours": 3
                        }
                    }
                },
                "consistency_test": True,
                "updated_at": "2024-01-15T13:00:00Z"
            }
            
            # Store data
            response = requests.post(
                f"{self.base_url}/roster/weekA",
                json=test_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                # Retrieve data
                response = requests.get(f"{self.base_url}/roster/weekA", timeout=10)
                if response.status_code == 200:
                    retrieved_data = response.json()
                    if "consistency_test" in retrieved_data and retrieved_data["consistency_test"]:
                        self.log_test("Data Consistency", True, "Data persists correctly across requests")
                        return True
                    else:
                        self.log_test("Data Consistency", False, "Retrieved data doesn't match stored data", f"Stored: {test_data}, Retrieved: {retrieved_data}")
                        return False
                else:
                    self.log_test("Data Consistency", False, f"Failed to retrieve data: HTTP {response.status_code}", response.text)
                    return False
            else:
                self.log_test("Data Consistency", False, f"Failed to store data: HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Data Consistency", False, "Consistency test failed", str(e))
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Rostering System Backend Tests")
        print("=" * 60)
        
        # Core API tests
        health_ok = self.test_health_check()
        if not health_ok:
            print("\n❌ Health check failed - stopping tests")
            return False
        
        participants_ok = self.test_get_participants()
        workers_ok = self.test_get_workers()
        locations_ok = self.test_get_locations()
        
        # Roster operations
        roster_ops_ok = self.test_roster_operations()
        
        # New functionality tests
        copy_template_ok = self.test_copy_to_template_functionality()
        export_ok = self.test_export_functionality()
        consistency_ok = self.test_data_consistency()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        # Overall assessment
        critical_tests = [health_ok, participants_ok, workers_ok, locations_ok, roster_ops_ok]
        feature_tests = [copy_template_ok, export_ok, consistency_ok]
        
        if all(critical_tests):
            if all(feature_tests):
                print("\n✅ ALL TESTS PASSED - Backend is fully functional")
                return True
            else:
                print("\n⚠️  CORE FUNCTIONALITY WORKING - Some new features have issues")
                return False
        else:
            print("\n❌ CRITICAL ISSUES FOUND - Core functionality is broken")
            return False

def main():
    """Main test execution"""
    tester = RosteringSystemTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()