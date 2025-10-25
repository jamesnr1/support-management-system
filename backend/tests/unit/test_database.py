"""Unit tests for database module"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, date, time
from database import SupabaseDatabase

class TestSupabaseDatabase:
    """Test cases for SupabaseDatabase class"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.mock_client = Mock()
        self.db = SupabaseDatabase()
        self.db.client = self.mock_client
    
    def test_get_availability_rules_success(self):
        """Test successful retrieval of availability rules"""
        # Arrange
        worker_id = 1
        expected_rules = [
            {
                'id': 1,
                'worker_id': worker_id,
                'weekday': 1,
                'from_time': '09:00',
                'to_time': '17:00',
                'is_full_day': False,
                'wraps_midnight': False
            }
        ]
        self.mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = expected_rules
        
        # Act
        result = self.db.get_availability_rules(worker_id)
        
        # Assert
        assert result == expected_rules
        self.mock_client.table.assert_called_once_with('availability_rule')
    
    def test_get_availability_rules_batch_success(self):
        """Test successful batch retrieval of availability rules"""
        # Arrange
        worker_ids = [1, 2, 3]
        expected_rules = [
            {'id': 1, 'worker_id': 1, 'weekday': 1, 'from_time': '09:00', 'to_time': '17:00'},
            {'id': 2, 'worker_id': 2, 'weekday': 2, 'from_time': '10:00', 'to_time': '18:00'},
            {'id': 3, 'worker_id': 1, 'weekday': 3, 'from_time': '08:00', 'to_time': '16:00'}
        ]
        self.mock_client.table.return_value.select.return_value.in_.return_value.execute.return_value.data = expected_rules
        
        # Act
        result = self.db.get_availability_rules_batch(worker_ids)
        
        # Assert
        expected_grouped = {
            1: [expected_rules[0], expected_rules[2]],
            2: [expected_rules[1]]
        }
        assert result == expected_grouped
    
    def test_save_availability_rules_success(self):
        """Test successful saving of availability rules"""
        # Arrange
        worker_id = 1
        rules = [
            {
                'weekday': 1,
                'from_time': '09:00',
                'to_time': '17:00',
                'is_full_day': False,
                'wraps_midnight': False
            }
        ]
        self.mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = Mock()
        self.mock_client.table.return_value.insert.return_value.execute.return_value = Mock()
        
        # Act
        result = self.db.save_availability_rules(worker_id, rules)
        
        # Assert
        assert result is True
        # Verify delete was called first
        self.mock_client.table.assert_any_call('availability_rule')
        # Verify insert was called
        assert self.mock_client.table.call_count >= 2
    
    def test_get_support_workers_success(self):
        """Test successful retrieval of support workers"""
        # Arrange
        expected_workers = [
            {
                'id': 1,
                'full_name': 'John Doe',
                'code': 'JD001',
                'status': 'Active',
                'phone': '1234567890',
                'telegram': 123456789
            }
        ]
        self.mock_client.table.return_value.select.return_value.neq.return_value.is_.return_value.order.return_value.execute.return_value.data = expected_workers
        self.mock_client.table.return_value.select.return_value.lte.return_value.gte.return_value.execute.return_value.data = []
        
        # Act
        result = self.db.get_support_workers()
        
        # Assert
        assert result == expected_workers
    
    def test_get_unavailability_periods_success(self):
        """Test successful retrieval of unavailability periods"""
        # Arrange
        worker_id = 1
        expected_periods = [
            {
                'id': 1,
                'worker_id': worker_id,
                'from_date': '2024-01-01',
                'to_date': '2024-01-07',
                'reason': 'Annual Leave'
            }
        ]
        self.mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = expected_periods
        
        # Act
        result = self.db.get_unavailability_periods(worker_id)
        
        # Assert
        assert result == expected_periods
    
    def test_database_error_handling(self):
        """Test database error handling"""
        # Arrange
        self.mock_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        # Act
        result = self.db.get_availability_rules(1)
        
        # Assert
        assert result == []
    
    def test_calculate_worker_hours(self):
        """Test worker hours calculation"""
        # Arrange
        worker_id = 1
        roster_data = {
            'P001': {
                '2024-01-01': [
                    {
                        'workers': [worker_id],
                        'startTime': '09:00',
                        'endTime': '17:00',
                        'isFullDay': False
                    }
                ]
            }
        }
        
        # Act
        hours = self.db.calculate_worker_hours(worker_id, roster_data)
        
        # Assert
        assert hours == 8.0  # 8 hours for 9-5 shift
    
    def test_calculate_worker_hours_full_day(self):
        """Test worker hours calculation for full day shifts"""
        # Arrange
        worker_id = 1
        roster_data = {
            'P001': {
                '2024-01-01': [
                    {
                        'workers': [worker_id],
                        'isFullDay': True
                    }
                ]
            }
        }
        
        # Act
        hours = self.db.calculate_worker_hours(worker_id, roster_data)
        
        # Assert
        assert hours == 8.0  # 8 hours for full day shift
