"""Tests for roster service"""
import pytest
from datetime import datetime, timedelta
from services.roster_service import RosterService
from services.validation_service import ValidationService

def test_get_week_roster(mock_db, sample_shift):
    """Test getting roster for a specific week"""
    # Setup mock data
    mock_db.get_shifts_by_date_range.return_value = [sample_shift]
    
    service = RosterService(mock_db)
    week_start = datetime(2025, 10, 20)  # Monday
    
    result = service.get_week_roster(week_start)
    
    assert 'week_start' in result
    assert 'week_end' in result
    assert 'roster' in result
    assert 'statistics' in result
    assert result['statistics']['total_hours'] == 8.0
    assert result['statistics']['total_shifts'] == 1

def test_create_shift_success(mock_db, sample_shift):
    """Test successful shift creation"""
    # Setup mock data
    mock_db.create_shift.return_value = sample_shift
    
    # Mock validation service
    with pytest.Mock() as mock_validator:
        mock_validator.validate_new_shift.return_value = {'valid': True, 'errors': []}
        
        service = RosterService(mock_db)
        service.validator = mock_validator
        
        result = service.create_shift(sample_shift)
        
        assert result == sample_shift
        mock_db.create_shift.assert_called_once_with(sample_shift)

def test_create_shift_validation_fails(mock_db, sample_shift):
    """Test shift creation with validation failure"""
    # Mock validation service to return validation error
    with pytest.Mock() as mock_validator:
        mock_validator.validate_new_shift.return_value = {
            'valid': False, 
            'errors': ['Invalid worker ID']
        }
        
        service = RosterService(mock_db)
        service.validator = mock_validator
        
        with pytest.raises(ValueError, match="Validation failed"):
            service.create_shift(sample_shift)

def test_update_shift_success(mock_db, sample_shift):
    """Test successful shift update"""
    # Setup mock data
    mock_db.get_shift.return_value = sample_shift
    mock_db.update_shift.return_value = sample_shift
    
    # Mock validation service
    with pytest.Mock() as mock_validator:
        mock_validator.validate_shift_update.return_value = {'valid': True, 'errors': []}
        
        service = RosterService(mock_db)
        service.validator = mock_validator
        
        updates = {'start_time': '10:00'}
        result = service.update_shift('shift-1', updates)
        
        assert result == sample_shift
        mock_db.update_shift.assert_called_once_with('shift-1', updates)

def test_update_shift_not_found(mock_db):
    """Test updating non-existent shift"""
    # Setup mock data
    mock_db.get_shift.return_value = None
    
    service = RosterService(mock_db)
    
    with pytest.raises(ValueError, match="Shift shift-1 not found"):
        service.update_shift('shift-1', {'start_time': '10:00'})

def test_update_shift_locked(mock_db, sample_shift):
    """Test updating locked shift"""
    # Setup mock data with locked shift
    locked_shift = sample_shift.copy()
    locked_shift['locked'] = True
    mock_db.get_shift.return_value = locked_shift
    
    service = RosterService(mock_db)
    
    with pytest.raises(ValueError, match="is locked"):
        service.update_shift('shift-1', {'start_time': '10:00'})

def test_calculate_week_stats(mock_db):
    """Test week statistics calculation"""
    shifts = [
        {'duration': 8.0, 'workers': ['w1']},
        {'duration': 6.0, 'workers': ['w1', 'w2']},
        {'duration': 4.0, 'workers': ['w2']},
    ]
    
    service = RosterService(mock_db)
    stats = service._calculate_week_stats(shifts)
    
    assert stats['total_hours'] == 18.0
    assert stats['total_shifts'] == 3
    assert stats['unique_workers'] == 2
    assert stats['worker_hours']['w1'] == 14.0  # 8 + 6
    assert stats['worker_hours']['w2'] == 10.0  # 6 + 4

def test_group_shifts_by_participant_and_date(mock_db):
    """Test grouping shifts by participant and date"""
    shifts = [
        {
            'participant_id': 'p1',
            'shift_date': '2025-10-25',
            'start_time': '09:00',
            'duration': 8.0
        },
        {
            'participant_id': 'p1',
            'shift_date': '2025-10-25',
            'start_time': '18:00',
            'duration': 4.0
        },
        {
            'participant_id': 'p2',
            'shift_date': '2025-10-25',
            'start_time': '10:00',
            'duration': 6.0
        }
    ]
    
    service = RosterService(mock_db)
    grouped = service._group_shifts_by_participant_and_date(shifts)
    
    assert 'p1' in grouped
    assert 'p2' in grouped
    assert '2025-10-25' in grouped['p1']
    assert '2025-10-25' in grouped['p2']
    assert len(grouped['p1']['2025-10-25']) == 2
    assert len(grouped['p2']['2025-10-25']) == 1
