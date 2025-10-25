"""Tests for validation service"""
import pytest
from services.validation_service import ValidationService

def test_validate_new_shift_success(mock_db, sample_shift):
    """Test successful shift validation"""
    # Setup mock data
    mock_db.get_support_workers.return_value = [
        {'id': 'worker-1', 'full_name': 'John Doe', 'status': 'Active'}
    ]
    mock_db.get_participants.return_value = [
        {'id': 'participant-1', 'code': 'P001', 'full_name': 'Jane Smith'}
    ]
    
    validator = ValidationService(mock_db)
    result = validator.validate_new_shift(sample_shift)
    
    assert result['valid'] is True
    assert len(result['errors']) == 0

def test_validate_new_shift_missing_required_fields(mock_db):
    """Test shift validation with missing required fields"""
    validator = ValidationService(mock_db)
    result = validator.validate_new_shift({})
    
    assert result['valid'] is False
    assert 'Missing required field' in str(result['errors'])

def test_validate_new_shift_invalid_worker(mock_db, sample_shift):
    """Test shift validation with invalid worker"""
    # Setup mock data with no workers
    mock_db.get_support_workers.return_value = []
    mock_db.get_participants.return_value = [
        {'id': 'participant-1', 'code': 'P001', 'full_name': 'Jane Smith'}
    ]
    
    validator = ValidationService(mock_db)
    result = validator.validate_new_shift(sample_shift)
    
    assert result['valid'] is False
    assert 'Worker worker-1 not found' in str(result['errors'])

def test_validate_new_shift_invalid_participant(mock_db, sample_shift):
    """Test shift validation with invalid participant"""
    # Setup mock data with no participants
    mock_db.get_support_workers.return_value = [
        {'id': 'worker-1', 'full_name': 'John Doe', 'status': 'Active'}
    ]
    mock_db.get_participants.return_value = []
    
    validator = ValidationService(mock_db)
    result = validator.validate_new_shift(sample_shift)
    
    assert result['valid'] is False
    assert 'Participant participant-1 not found' in str(result['errors'])

def test_validate_new_shift_invalid_time_format(mock_db, sample_shift):
    """Test shift validation with invalid time format"""
    # Setup mock data
    mock_db.get_support_workers.return_value = [
        {'id': 'worker-1', 'full_name': 'John Doe', 'status': 'Active'}
    ]
    mock_db.get_participants.return_value = [
        {'id': 'participant-1', 'code': 'P001', 'full_name': 'Jane Smith'}
    ]
    
    # Modify shift with invalid time
    invalid_shift = sample_shift.copy()
    invalid_shift['start_time'] = 'invalid-time'
    
    validator = ValidationService(mock_db)
    result = validator.validate_new_shift(invalid_shift)
    
    assert result['valid'] is False
    assert 'Invalid time format' in str(result['errors'])

def test_validate_new_shift_end_before_start(mock_db, sample_shift):
    """Test shift validation with end time before start time"""
    # Setup mock data
    mock_db.get_support_workers.return_value = [
        {'id': 'worker-1', 'full_name': 'John Doe', 'status': 'Active'}
    ]
    mock_db.get_participants.return_value = [
        {'id': 'participant-1', 'code': 'P001', 'full_name': 'Jane Smith'}
    ]
    
    # Modify shift with end time before start time
    invalid_shift = sample_shift.copy()
    invalid_shift['start_time'] = '17:00'
    invalid_shift['end_time'] = '09:00'
    
    validator = ValidationService(mock_db)
    result = validator.validate_new_shift(invalid_shift)
    
    assert result['valid'] is False
    assert 'End time must be after start time' in str(result['errors'])

def test_validate_new_shift_too_long(mock_db, sample_shift):
    """Test shift validation with shift too long"""
    # Setup mock data
    mock_db.get_support_workers.return_value = [
        {'id': 'worker-1', 'full_name': 'John Doe', 'status': 'Active'}
    ]
    mock_db.get_participants.return_value = [
        {'id': 'participant-1', 'code': 'P001', 'full_name': 'Jane Smith'}
    ]
    
    # Modify shift with very long duration
    invalid_shift = sample_shift.copy()
    invalid_shift['start_time'] = '00:00'
    invalid_shift['end_time'] = '15:00'  # 15 hours
    
    validator = ValidationService(mock_db)
    result = validator.validate_new_shift(invalid_shift)
    
    assert result['valid'] is False
    assert 'Shift duration cannot exceed 12 hours' in str(result['errors'])

def test_validate_roster_data_success(mock_db, sample_roster_data):
    """Test successful roster validation"""
    # Setup mock data
    mock_db.get_support_workers.return_value = [
        {'id': 'worker-1', 'full_name': 'John Doe', 'status': 'Active'}
    ]
    mock_db.get_participants.return_value = [
        {'id': 'participant-1', 'code': 'P001', 'full_name': 'Jane Smith'}
    ]
    
    validator = ValidationService(mock_db)
    result = validator.validate_roster_data(sample_roster_data)
    
    assert result['valid'] is True
    assert len(result['errors']) == 0

def test_validate_roster_data_empty(mock_db):
    """Test roster validation with empty data"""
    validator = ValidationService(mock_db)
    result = validator.validate_roster_data({})
    
    assert result['valid'] is False
    assert 'Roster data is empty' in str(result['errors'])
