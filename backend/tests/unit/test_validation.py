"""Unit tests for validation logic"""
import pytest
from datetime import datetime, date, time
from validation_rules import validate_shift, validate_worker_availability, validate_roster_data

class TestValidationRules:
    """Test cases for validation rules"""
    
    def test_validate_shift_valid_data(self):
        """Test validation of valid shift data"""
        # Arrange
        shift_data = {
            'workers': [1, 2],
            'startTime': '09:00',
            'endTime': '17:00',
            'isFullDay': False,
            'location': 1
        }
        
        # Act
        is_valid, errors = validate_shift(shift_data)
        
        # Assert
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_shift_missing_workers(self):
        """Test validation of shift with missing workers"""
        # Arrange
        shift_data = {
            'startTime': '09:00',
            'endTime': '17:00',
            'isFullDay': False,
            'location': 1
        }
        
        # Act
        is_valid, errors = validate_shift(shift_data)
        
        # Assert
        assert is_valid is False
        assert 'workers' in errors
    
    def test_validate_shift_invalid_time_range(self):
        """Test validation of shift with invalid time range"""
        # Arrange
        shift_data = {
            'workers': [1],
            'startTime': '17:00',
            'endTime': '09:00',  # End before start
            'isFullDay': False,
            'location': 1
        }
        
        # Act
        is_valid, errors = validate_shift(shift_data)
        
        # Assert
        assert is_valid is False
        assert 'time_range' in errors
    
    def test_validate_shift_full_day_ignores_times(self):
        """Test that full day shifts ignore time validation"""
        # Arrange
        shift_data = {
            'workers': [1],
            'startTime': '17:00',
            'endTime': '09:00',  # Invalid times
            'isFullDay': True,
            'location': 1
        }
        
        # Act
        is_valid, errors = validate_shift(shift_data)
        
        # Assert
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_worker_availability_valid(self):
        """Test validation of valid worker availability"""
        # Arrange
        availability_data = [
            {
                'weekday': 1,
                'from_time': '09:00',
                'to_time': '17:00',
                'is_full_day': False
            }
        ]
        
        # Act
        is_valid, errors = validate_worker_availability(availability_data)
        
        # Assert
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_worker_availability_invalid_weekday(self):
        """Test validation of availability with invalid weekday"""
        # Arrange
        availability_data = [
            {
                'weekday': 8,  # Invalid weekday
                'from_time': '09:00',
                'to_time': '17:00',
                'is_full_day': False
            }
        ]
        
        # Act
        is_valid, errors = validate_worker_availability(availability_data)
        
        # Assert
        assert is_valid is False
        assert 'weekday' in errors
    
    def test_validate_roster_data_valid(self):
        """Test validation of valid roster data"""
        # Arrange
        roster_data = {
            'P001': {
                '2024-01-01': [
                    {
                        'workers': [1, 2],
                        'startTime': '09:00',
                        'endTime': '17:00',
                        'isFullDay': False,
                        'location': 1
                    }
                ]
            }
        }
        
        # Act
        is_valid, errors = validate_roster_data(roster_data)
        
        # Assert
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_roster_data_duplicate_workers(self):
        """Test validation of roster with duplicate workers"""
        # Arrange
        roster_data = {
            'P001': {
                '2024-01-01': [
                    {
                        'workers': [1, 2],
                        'startTime': '09:00',
                        'endTime': '17:00',
                        'isFullDay': False,
                        'location': 1
                    },
                    {
                        'workers': [1],  # Worker 1 already assigned
                        'startTime': '18:00',
                        'endTime': '22:00',
                        'isFullDay': False,
                        'location': 1
                    }
                ]
            }
        }
        
        # Act
        is_valid, errors = validate_roster_data(roster_data)
        
        # Assert
        assert is_valid is False
        assert 'duplicate_workers' in errors
    
    def test_validate_shift_minimum_workers(self):
        """Test validation of shift with minimum worker requirement"""
        # Arrange
        shift_data = {
            'workers': [],  # No workers
            'startTime': '09:00',
            'endTime': '17:00',
            'isFullDay': False,
            'location': 1
        }
        
        # Act
        is_valid, errors = validate_shift(shift_data)
        
        # Assert
        assert is_valid is False
        assert 'minimum_workers' in errors
    
    def test_validate_shift_maximum_workers(self):
        """Test validation of shift with maximum worker limit"""
        # Arrange
        shift_data = {
            'workers': [1, 2, 3, 4, 5, 6],  # Too many workers
            'startTime': '09:00',
            'endTime': '17:00',
            'isFullDay': False,
            'location': 1
        }
        
        # Act
        is_valid, errors = validate_shift(shift_data)
        
        # Assert
        assert is_valid is False
        assert 'maximum_workers' in errors
