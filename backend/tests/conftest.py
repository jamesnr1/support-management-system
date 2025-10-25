"""Pytest configuration and fixtures"""
import pytest
from unittest.mock import Mock
from fastapi.testclient import TestClient
from main import app
from database import SupabaseDatabase

@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)

@pytest.fixture
def mock_db():
    """Mock database fixture"""
    return Mock(spec=SupabaseDatabase)

@pytest.fixture
def sample_worker():
    """Sample worker data fixture"""
    return {
        'id': 1,
        'full_name': 'John Doe',
        'code': 'JD001',
        'status': 'Active',
        'phone': '1234567890',
        'telegram': 123456789,
        'created_at': '2024-01-01T00:00:00Z',
        'updated_at': '2024-01-01T00:00:00Z'
    }

@pytest.fixture
def sample_participant():
    """Sample participant data fixture"""
    return {
        'id': 1,
        'name': 'Participant 1',
        'code': 'P001',
        'support_ratio': '1:1',
        'created_at': '2024-01-01T00:00:00Z',
        'updated_at': '2024-01-01T00:00:00Z'
    }

@pytest.fixture
def sample_availability_rule():
    """Sample availability rule fixture"""
    return {
        'id': 1,
        'worker_id': 1,
        'weekday': 1,
        'from_time': '09:00',
        'to_time': '17:00',
        'is_full_day': False,
        'wraps_midnight': False
    }

@pytest.fixture
def sample_unavailability_period():
    """Sample unavailability period fixture"""
    return {
        'id': 1,
        'worker_id': 1,
        'from_date': '2024-01-01',
        'to_date': '2024-01-07',
        'reason': 'Annual Leave',
        'created_at': '2024-01-01T00:00:00Z',
        'updated_at': '2024-01-01T00:00:00Z'
    }

@pytest.fixture
def sample_shift_data():
    """Sample shift data fixture"""
    return {
        'workers': [1, 2],
        'startTime': '09:00',
        'endTime': '17:00',
        'isFullDay': False,
        'location': 1,
        'notes': 'Test shift'
    }

@pytest.fixture
def sample_roster_data():
    """Sample roster data fixture"""
    return {
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