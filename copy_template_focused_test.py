#!/usr/bin/env python3
"""
Focused Copy Template Testing for Rostering System
Comprehensive testing of the Copy Template functionality as requested in the review.
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "https://shift-master-27.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class CopyTemplateFocusedTester:
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
    
    def test_copy_template_comprehensive(self):
        """Comprehensive Copy Template functionality test"""
        
        # Step 1: Set up rich test data for weekA with multiple participants and shifts
        week_a_data = {
            "shifts": {
                "monday": {
                    "morning": {
                        "participants": ["LIB001", "ACE001"],
                        "workers": ["GAU001", "VER001", "HAP001"],
                        "location": "Glandore",
                        "hours": 6,
                        "startTime": "09:00",
                        "endTime": "15:00",
                        "supportType": "Self-Care",
                        "ratio": "2:1"
                    },
                    "afternoon": {
                        "participants": ["JAM001"],
                        "workers": ["SAN001", "KRU001"],
                        "location": "Plympton Park", 
                        "hours": 4,
                        "startTime": "13:00",
                        "endTime": "17:00",
                        "supportType": "Community Access",
                        "ratio": "1:1"
                    }
                },
                "tuesday": {
                    "morning": {
                        "participants": ["GRA001", "MIL001"],
                        "workers": ["CHA001", "MEE001", "MIH001"],
                        "location": "Glandore",
                        "hours": 5,
                        "startTime": "10:00",
                        "endTime": "15:00",
                        "supportType": "Personal Care",
                        "ratio": "2:1"
                    }
                },
                "wednesday": {
                    "afternoon": {
                        "participants": ["LIB001"],
                        "workers": ["GAU001", "VER001"],
                        "location": "Plympton Park",
                        "hours": 3,
                        "startTime": "14:00",
                        "endTime": "17:00",
                        "supportType": "ADL Support",
                        "ratio": "2:1"
                    }
                }
            },
            "template_source": "weekA",
            "updated_at": "2024-01-15T10:00:00Z",
            "metadata": {
                "total_participants": 5,
                "total_shifts": 4,
                "total_hours": 18
            }
        }
        
        # Step 2: Set up rich test data for weekB
        week_b_data = {
            "shifts": {
                "thursday": {
                    "morning": {
                        "participants": ["ACE001", "GRA001"],
                        "workers": ["HAP001", "SAN001", "KRU001"],
                        "location": "Glandore",
                        "hours": 7,
                        "startTime": "08:00",
                        "endTime": "15:00",
                        "supportType": "Community Support",
                        "ratio": "2:1"
                    }
                },
                "friday": {
                    "morning": {
                        "participants": ["MIL001"],
                        "workers": ["MIH001", "GAU001"],
                        "location": "Glandore",
                        "hours": 4,
                        "startTime": "09:00",
                        "endTime": "13:00",
                        "supportType": "Manual Handling",
                        "ratio": "1:1"
                    },
                    "afternoon": {
                        "participants": ["JAM001", "LIB001"],
                        "workers": ["VER001", "CHA001", "MEE001"],
                        "location": "Plympton Park",
                        "hours": 6,
                        "startTime": "13:00",
                        "endTime": "19:00",
                        "supportType": "Community Access",
                        "ratio": "2:1"
                    }
                }
            },
            "template_source": "weekB",
            "updated_at": "2024-01-15T10:00:00Z",
            "metadata": {
                "total_participants": 4,
                "total_shifts": 3,
                "total_hours": 17
            }
        }
        
        try:
            # Step 3: Set up weekA data
            print("Setting up weekA with comprehensive test data...")
            response = requests.post(
                f"{self.base_url}/roster/weekA",
                json=week_a_data,
                headers=self.headers,
                timeout=10
            )
            if response.status_code != 200:
                self.log_test("Setup WeekA Data", False, f"Failed to set up weekA: HTTP {response.status_code}", response.text)
                return False
            
            # Step 4: Set up weekB data
            print("Setting up weekB with comprehensive test data...")
            response = requests.post(
                f"{self.base_url}/roster/weekB",
                json=week_b_data,
                headers=self.headers,
                timeout=10
            )
            if response.status_code != 200:
                self.log_test("Setup WeekB Data", False, f"Failed to set up weekB: HTTP {response.status_code}", response.text)
                return False
            
            # Step 5: Verify weekA data is properly stored
            print("Verifying weekA data storage...")
            response = requests.get(f"{self.base_url}/roster/weekA", timeout=10)
            if response.status_code == 200:
                stored_week_a = response.json()
                if "shifts" in stored_week_a and len(stored_week_a["shifts"]) == 3:
                    self.log_test("Verify WeekA Storage", True, f"WeekA properly stored with {len(stored_week_a['shifts'])} days of shifts")
                else:
                    self.log_test("Verify WeekA Storage", False, "WeekA data not properly stored", str(stored_week_a))
                    return False
            else:
                self.log_test("Verify WeekA Storage", False, f"Failed to retrieve weekA: HTTP {response.status_code}", response.text)
                return False
            
            # Step 6: Verify weekB data is properly stored
            print("Verifying weekB data storage...")
            response = requests.get(f"{self.base_url}/roster/weekB", timeout=10)
            if response.status_code == 200:
                stored_week_b = response.json()
                if "shifts" in stored_week_b and len(stored_week_b["shifts"]) == 2:
                    self.log_test("Verify WeekB Storage", True, f"WeekB properly stored with {len(stored_week_b['shifts'])} days of shifts")
                else:
                    self.log_test("Verify WeekB Storage", False, "WeekB data not properly stored", str(stored_week_b))
                    return False
            else:
                self.log_test("Verify WeekB Storage", False, f"Failed to retrieve weekB: HTTP {response.status_code}", response.text)
                return False
            
            # Step 7: Test Copy WeekA to NextA
            print("Testing Copy WeekA to NextA...")
            copy_data_a = stored_week_a.copy()
            copy_data_a["template_source"] = "weekA"
            copy_data_a["copied_at"] = "2024-01-15T11:00:00Z"
            copy_data_a["copy_operation"] = "weekA_to_nextA"
            
            response = requests.post(
                f"{self.base_url}/roster/nextA",
                json=copy_data_a,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                # Verify the copy worked with detailed comparison
                response = requests.get(f"{self.base_url}/roster/nextA", timeout=10)
                if response.status_code == 200:
                    copied_data_a = response.json()
                    
                    # Detailed verification
                    if self.verify_copy_integrity(stored_week_a, copied_data_a, "weekA", "nextA"):
                        self.log_test("Copy WeekA to NextA", True, "Successfully copied weekA to nextA with full data integrity")
                    else:
                        return False
                else:
                    self.log_test("Copy WeekA to NextA", False, "Failed to retrieve copied nextA data", response.text)
                    return False
            else:
                self.log_test("Copy WeekA to NextA", False, f"Copy operation failed: HTTP {response.status_code}", response.text)
                return False
            
            # Step 8: Test Copy WeekB to NextB
            print("Testing Copy WeekB to NextB...")
            copy_data_b = stored_week_b.copy()
            copy_data_b["template_source"] = "weekB"
            copy_data_b["copied_at"] = "2024-01-15T11:00:00Z"
            copy_data_b["copy_operation"] = "weekB_to_nextB"
            
            response = requests.post(
                f"{self.base_url}/roster/nextB",
                json=copy_data_b,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                # Verify the copy worked with detailed comparison
                response = requests.get(f"{self.base_url}/roster/nextB", timeout=10)
                if response.status_code == 200:
                    copied_data_b = response.json()
                    
                    # Detailed verification
                    if self.verify_copy_integrity(stored_week_b, copied_data_b, "weekB", "nextB"):
                        self.log_test("Copy WeekB to NextB", True, "Successfully copied weekB to nextB with full data integrity")
                        return True
                    else:
                        return False
                else:
                    self.log_test("Copy WeekB to NextB", False, "Failed to retrieve copied nextB data", response.text)
                    return False
            else:
                self.log_test("Copy WeekB to NextB", False, f"Copy operation failed: HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Copy Template Comprehensive Test", False, "Test execution failed", str(e))
            return False
    
    def verify_copy_integrity(self, source_data: Dict, copied_data: Dict, source_name: str, target_name: str) -> bool:
        """Verify that copied data maintains full integrity"""
        
        # Check shifts structure
        if "shifts" not in source_data or "shifts" not in copied_data:
            self.log_test(f"Copy Integrity {source_name}→{target_name}", False, "Missing shifts structure in source or copied data")
            return False
        
        source_shifts = source_data["shifts"]
        copied_shifts = copied_data["shifts"]
        
        # Check number of days
        if len(source_shifts) != len(copied_shifts):
            self.log_test(f"Copy Integrity {source_name}→{target_name}", False, 
                         f"Day count mismatch: source={len(source_shifts)}, copied={len(copied_shifts)}")
            return False
        
        # Check each day and shift
        for day, day_shifts in source_shifts.items():
            if day not in copied_shifts:
                self.log_test(f"Copy Integrity {source_name}→{target_name}", False, f"Missing day '{day}' in copied data")
                return False
            
            copied_day_shifts = copied_shifts[day]
            
            # Check each shift period (morning, afternoon, etc.)
            for period, shift_data in day_shifts.items():
                if period not in copied_day_shifts:
                    self.log_test(f"Copy Integrity {source_name}→{target_name}", False, 
                                 f"Missing shift period '{period}' for day '{day}' in copied data")
                    return False
                
                copied_shift_data = copied_day_shifts[period]
                
                # Check critical shift attributes
                critical_attributes = ["participants", "workers", "location", "hours"]
                for attr in critical_attributes:
                    if attr in shift_data:
                        if attr not in copied_shift_data:
                            self.log_test(f"Copy Integrity {source_name}→{target_name}", False, 
                                         f"Missing attribute '{attr}' in copied shift {day}/{period}")
                            return False
                        
                        if shift_data[attr] != copied_shift_data[attr]:
                            self.log_test(f"Copy Integrity {source_name}→{target_name}", False, 
                                         f"Attribute mismatch '{attr}' in {day}/{period}: source={shift_data[attr]}, copied={copied_shift_data[attr]}")
                            return False
        
        # Check metadata if present
        if "metadata" in source_data and "metadata" in copied_data:
            source_meta = source_data["metadata"]
            copied_meta = copied_data["metadata"]
            
            for key, value in source_meta.items():
                if key in copied_meta and copied_meta[key] != value:
                    self.log_test(f"Copy Integrity {source_name}→{target_name}", False, 
                                 f"Metadata mismatch '{key}': source={value}, copied={copied_meta[key]}")
                    return False
        
        self.log_test(f"Copy Integrity {source_name}→{target_name}", True, 
                     f"Full data integrity verified: {len(source_shifts)} days, all attributes match")
        return True
    
    def test_data_persistence_after_copy(self):
        """Test that copied data persists correctly across multiple requests"""
        try:
            # Get nextA data multiple times to ensure persistence
            responses = []
            for i in range(3):
                response = requests.get(f"{self.base_url}/roster/nextA", timeout=10)
                if response.status_code == 200:
                    responses.append(response.json())
                else:
                    self.log_test("Data Persistence After Copy", False, f"Failed to get nextA data on attempt {i+1}", response.text)
                    return False
            
            # Verify all responses are identical
            first_response = responses[0]
            for i, response in enumerate(responses[1:], 2):
                if response != first_response:
                    self.log_test("Data Persistence After Copy", False, f"Data inconsistency detected on attempt {i}")
                    return False
            
            self.log_test("Data Persistence After Copy", True, "Copied data persists consistently across multiple requests")
            return True
            
        except Exception as e:
            self.log_test("Data Persistence After Copy", False, "Persistence test failed", str(e))
            return False
    
    def run_focused_tests(self):
        """Run focused Copy Template tests"""
        print("🎯 Starting Focused Copy Template Tests")
        print("=" * 60)
        
        # Run comprehensive copy template test
        copy_success = self.test_copy_template_comprehensive()
        
        # Test data persistence
        persistence_success = self.test_data_persistence_after_copy()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 FOCUSED TEST SUMMARY")
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
        
        if copy_success and persistence_success:
            print("\n✅ COPY TEMPLATE FUNCTIONALITY FULLY VERIFIED")
            return True
        else:
            print("\n❌ COPY TEMPLATE FUNCTIONALITY HAS ISSUES")
            return False

def main():
    """Main test execution"""
    tester = CopyTemplateFocusedTester()
    success = tester.run_focused_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()