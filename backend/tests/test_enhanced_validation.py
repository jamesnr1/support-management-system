"""
Tests for enhanced validation service
"""
import pytest
from datetime import datetime, timedelta
from services.enhanced_validation_service import EnhancedValidationService
from services.validation_config import ValidationConfig, ValidationLevel


class TestEnhancedValidationService:
    """Test cases for enhanced validation service"""
    
    @pytest.fixture
    def sample_workers(self):
        """Sample worker data for testing"""
        return {
            "1": {"full_name": "John Doe", "max_hours": 40},
            "2": {"full_name": "Jane Smith", "max_hours": 35},
            "3": {"full_name": "Bob Wilson", "max_hours": 45}
        }
    
    @pytest.fixture
    def sample_roster_data(self):
        """Sample roster data for testing"""
        return {
            "data": {
                "P001": {
                    "2024-01-15": [
                        {
                            "id": "shift1",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1",
                            "funding_category": "core"
                        },
                        {
                            "id": "shift2",
                            "startTime": "17:00",
                            "endTime": "21:00",
                            "duration": 4.0,
                            "workers": ["1"],
                            "ratio": "1:1",
                            "funding_category": "capacity",
                            "is_split_shift": True
                        }
                    ]
                }
            }
        }
    
    def test_worker_conflicts_different_participants(self, sample_workers):
        """Test conflict detection for different participants"""
        roster_data = {
            "data": {
                "P001": {
                    "2024-01-15": [
                        {
                            "id": "shift1",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                },
                "P002": {
                    "2024-01-15": [
                        {
                            "id": "shift2",
                            "startTime": "16:00",
                            "endTime": "20:00",
                            "duration": 4.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                }
            }
        }
        
        validator = EnhancedValidationService(sample_workers)
        result = validator.validate_roster_data(roster_data)
        
        assert not result['valid']
        assert len(result['errors']) > 0
        assert any("CONFLICT" in error for error in result['errors'])
    
    def test_valid_split_shift_same_participant(self, sample_workers):
        """Test valid split shift for same participant"""
        roster_data = {
            "data": {
                "P001": {
                    "2024-01-15": [
                        {
                            "id": "shift1",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1",
                            "funding_category": "core"
                        },
                        {
                            "id": "shift2",
                            "startTime": "17:00",
                            "endTime": "21:00",
                            "duration": 4.0,
                            "workers": ["1"],
                            "ratio": "1:1",
                            "funding_category": "capacity",
                            "is_split_shift": True
                        }
                    ]
                }
            }
        }
        
        validator = EnhancedValidationService(sample_workers)
        result = validator.validate_roster_data(roster_data)
        
        assert result['valid']
        assert len(result['errors']) == 0
        assert any("SPLIT SHIFT" in info for info in result['info'])
    
    def test_invalid_overlapping_shifts(self, sample_workers):
        """Test invalid overlapping shifts for same participant"""
        roster_data = {
            "data": {
                "P001": {
                    "2024-01-15": [
                        {
                            "id": "shift1",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        },
                        {
                            "id": "shift2",
                            "startTime": "16:00",
                            "endTime": "20:00",
                            "duration": 4.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                }
            }
        }
        
        validator = EnhancedValidationService(sample_workers)
        result = validator.validate_roster_data(roster_data)
        
        assert not result['valid']
        assert len(result['errors']) > 0
        assert any("INVALID" in error for error in result['errors'])
    
    def test_rest_period_validation(self, sample_workers):
        """Test rest period validation"""
        roster_data = {
            "data": {
                "P001": {
                    "2024-01-15": [
                        {
                            "id": "shift1",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                },
                "P002": {
                    "2024-01-16": [
                        {
                            "id": "shift2",
                            "startTime": "01:00",
                            "endTime": "09:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                }
            }
        }
        
        # Test with strict validation
        config = {"strict_rest_validation": True, "min_rest_hours": 12}
        validator = EnhancedValidationService(sample_workers, config)
        result = validator.validate_roster_data(roster_data)
        
        assert not result['valid']
        assert any("INSUFFICIENT REST" in error for error in result['errors'])
        
        # Test with relaxed validation
        config = {"strict_rest_validation": False, "min_rest_hours": 12}
        validator = EnhancedValidationService(sample_workers, config)
        result = validator.validate_roster_data(roster_data)
        
        assert result['valid']
        assert any("SHORT REST" in warning for warning in result['warnings'])
    
    def test_weekly_hours_validation(self, sample_workers):
        """Test weekly hours validation"""
        roster_data = {
            "data": {
                "P001": {
                    "2024-01-15": [
                        {
                            "id": "shift1",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                },
                "P002": {
                    "2024-01-16": [
                        {
                            "id": "shift2",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                },
                "P003": {
                    "2024-01-17": [
                        {
                            "id": "shift3",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                },
                "P004": {
                    "2024-01-18": [
                        {
                            "id": "shift4",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                },
                "P005": {
                    "2024-01-19": [
                        {
                            "id": "shift5",
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "1:1"
                        }
                    ]
                }
            }
        }
        
        validator = EnhancedValidationService(sample_workers)
        result = validator.validate_roster_data(roster_data)
        
        assert not result['valid']
        assert any("WEEKLY LIMIT EXCEEDED" in error for error in result['errors'])
    
    def test_overnight_staffing_validation(self, sample_workers):
        """Test overnight staffing validation"""
        roster_data = {
            "data": {
                "P001": {
                    "2024-01-15": [
                        {
                            "id": "shift1",
                            "startTime": "22:00",
                            "endTime": "06:00",
                            "duration": 8.0,
                            "workers": ["1"],
                            "ratio": "2:1"
                        }
                    ]
                }
            }
        }
        
        validator = EnhancedValidationService(sample_workers)
        result = validator.validate_roster_data(roster_data)
        
        assert result['valid']  # Should be valid but with warning
        assert any("OVERNIGHT UNDERSTAFFED" in warning for warning in result['warnings'])


class TestValidationConfig:
    """Test cases for validation configuration"""
    
    def test_default_config(self):
        """Test default configuration"""
        config = ValidationConfig()
        rules = config.get_config()
        
        assert rules['min_rest_hours'] == 8
        assert rules['max_continuous_hours'] == 12
        assert rules['allow_split_shifts'] is True
    
    def test_preset_configs(self):
        """Test different preset configurations"""
        # Test relaxed preset
        relaxed_config = ValidationConfig(ValidationLevel.RELAXED)
        relaxed_rules = relaxed_config.get_config()
        assert relaxed_rules['min_rest_hours'] == 4
        assert relaxed_rules['max_weekly_hours'] == 50
        
        # Test strict preset
        strict_config = ValidationConfig(ValidationLevel.STRICT)
        strict_rules = strict_config.get_config()
        assert strict_rules['min_rest_hours'] == 12
        assert strict_rules['allow_split_shifts'] is False
    
    def test_custom_config(self):
        """Test custom configuration"""
        custom_rules = {
            'min_rest_hours': 6,
            'max_weekly_hours': 45,
            'allow_split_shifts': False
        }
        
        config = ValidationConfig(ValidationLevel.CUSTOM, custom_rules)
        rules = config.get_config()
        
        assert rules['min_rest_hours'] == 6
        assert rules['max_weekly_hours'] == 45
        assert rules['allow_split_shifts'] is False
    
    def test_config_validation(self):
        """Test configuration validation"""
        # Test valid configuration
        config = ValidationConfig()
        validation_result = config.validate_config()
        assert validation_result['valid']
        
        # Test invalid configuration
        invalid_config = ValidationConfig(ValidationLevel.CUSTOM, {
            'min_rest_hours': 20,
            'max_continuous_hours': 10
        })
        validation_result = invalid_config.validate_config()
        assert not validation_result['valid']
        assert len(validation_result['errors']) > 0
    
    def test_config_updates(self):
        """Test configuration updates"""
        config = ValidationConfig()
        
        # Update configuration
        config.update_config({'min_rest_hours': 10})
        rules = config.get_config()
        assert rules['min_rest_hours'] == 10
        
        # Verify other settings unchanged
        assert rules['max_continuous_hours'] == 12


if __name__ == "__main__":
    pytest.main([__file__])
