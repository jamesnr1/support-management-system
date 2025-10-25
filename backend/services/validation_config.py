"""
Validation configuration management
"""
from typing import Dict, Any, Optional
from enum import Enum
import os
import json
import logging

logger = logging.getLogger(__name__)

class ValidationLevel(Enum):
    """Validation strictness levels"""
    RELAXED = "relaxed"
    STANDARD = "standard"
    STRICT = "strict"
    CUSTOM = "custom"

class ValidationConfig:
    """
    Manages validation configuration with different presets and custom settings
    """
    
    # Predefined configuration presets
    PRESETS = {
        ValidationLevel.RELAXED: {
            'min_rest_hours': 4,
            'max_continuous_hours': 16,
            'max_daily_hours': 20,
            'max_weekly_hours': 50,
            'allow_split_shifts': True,
            'min_split_shift_gap': 0.5,
            'strict_rest_validation': False,
            'overnight_staffing_required': False,
            'warn_on_short_rest': True,
            'warn_on_long_shifts': True,
        },
        
        ValidationLevel.STANDARD: {
            'min_rest_hours': 8,
            'max_continuous_hours': 12,
            'max_daily_hours': 16,
            'max_weekly_hours': 40,
            'allow_split_shifts': True,
            'min_split_shift_gap': 1,
            'strict_rest_validation': False,
            'overnight_staffing_required': True,
            'warn_on_short_rest': True,
            'warn_on_long_shifts': True,
        },
        
        ValidationLevel.STRICT: {
            'min_rest_hours': 12,
            'max_continuous_hours': 10,
            'max_daily_hours': 12,
            'max_weekly_hours': 35,
            'allow_split_shifts': False,
            'min_split_shift_gap': 2,
            'strict_rest_validation': True,
            'overnight_staffing_required': True,
            'warn_on_short_rest': True,
            'warn_on_long_shifts': True,
        }
    }
    
    def __init__(self, level: ValidationLevel = ValidationLevel.STANDARD, 
                 custom_config: Optional[Dict[str, Any]] = None):
        self.level = level
        self.config = self._load_config(level, custom_config)
        self._load_from_environment()
    
    def _load_config(self, level: ValidationLevel, custom_config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Load configuration based on level and custom settings"""
        if level == ValidationLevel.CUSTOM and custom_config:
            return custom_config
        
        base_config = self.PRESETS.get(level, self.PRESETS[ValidationLevel.STANDARD]).copy()
        
        if custom_config:
            base_config.update(custom_config)
        
        return base_config
    
    def _load_from_environment(self):
        """Load configuration overrides from environment variables"""
        env_mappings = {
            'VALIDATION_MIN_REST_HOURS': 'min_rest_hours',
            'VALIDATION_MAX_CONTINUOUS_HOURS': 'max_continuous_hours',
            'VALIDATION_MAX_DAILY_HOURS': 'max_daily_hours',
            'VALIDATION_MAX_WEEKLY_HOURS': 'max_weekly_hours',
            'VALIDATION_ALLOW_SPLIT_SHIFTS': 'allow_split_shifts',
            'VALIDATION_MIN_SPLIT_GAP': 'min_split_shift_gap',
            'VALIDATION_STRICT_REST': 'strict_rest_validation',
            'VALIDATION_OVERNIGHT_STAFFING': 'overnight_staffing_required',
        }
        
        for env_var, config_key in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                # Convert string values to appropriate types
                if config_key in ['allow_split_shifts', 'strict_rest_validation', 'overnight_staffing_required']:
                    self.config[config_key] = value.lower() in ('true', '1', 'yes', 'on')
                elif config_key in ['min_rest_hours', 'max_continuous_hours', 'max_daily_hours', 
                                  'max_weekly_hours', 'min_split_shift_gap']:
                    try:
                        self.config[config_key] = float(value)
                    except ValueError:
                        logger.warning(f"Invalid value for {env_var}: {value}")
                else:
                    self.config[config_key] = value
                
                logger.info(f"Loaded {config_key} from environment: {self.config[config_key]}")
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return self.config.copy()
    
    def update_config(self, updates: Dict[str, Any]):
        """Update configuration with new values"""
        self.config.update(updates)
        logger.info(f"Configuration updated: {updates}")
    
    def set_level(self, level: ValidationLevel, custom_config: Optional[Dict[str, Any]] = None):
        """Change validation level"""
        self.level = level
        self.config = self._load_config(level, custom_config)
        self._load_from_environment()
        logger.info(f"Validation level changed to: {level.value}")
    
    def get_validation_rules_summary(self) -> Dict[str, Any]:
        """Get a human-readable summary of validation rules"""
        return {
            'level': self.level.value,
            'rest_periods': {
                'minimum_rest_hours': self.config['min_rest_hours'],
                'strict_validation': self.config['strict_rest_validation']
            },
            'work_limits': {
                'max_continuous_hours': self.config['max_continuous_hours'],
                'max_daily_hours': self.config['max_daily_hours'],
                'max_weekly_hours': self.config['max_weekly_hours']
            },
            'split_shifts': {
                'allowed': self.config['allow_split_shifts'],
                'minimum_gap_hours': self.config['min_split_shift_gap']
            },
            'overnight_shifts': {
                'staffing_required': self.config['overnight_staffing_required']
            }
        }
    
    def validate_config(self) -> Dict[str, Any]:
        """Validate the current configuration for consistency"""
        errors = []
        warnings = []
        
        # Check for logical inconsistencies
        if self.config['min_rest_hours'] > self.config['max_continuous_hours']:
            errors.append("Minimum rest hours cannot be greater than maximum continuous hours")
        
        if self.config['max_daily_hours'] > self.config['max_weekly_hours']:
            errors.append("Maximum daily hours cannot be greater than maximum weekly hours")
        
        if self.config['min_split_shift_gap'] < 0:
            errors.append("Minimum split shift gap cannot be negative")
        
        if not self.config['allow_split_shifts'] and self.config['min_split_shift_gap'] > 0:
            warnings.append("Split shifts are disabled but minimum gap is set")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    def save_to_file(self, filepath: str):
        """Save configuration to file"""
        config_data = {
            'level': self.level.value,
            'config': self.config,
            'timestamp': str(datetime.now())
        }
        
        with open(filepath, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        logger.info(f"Configuration saved to {filepath}")
    
    def load_from_file(self, filepath: str):
        """Load configuration from file"""
        try:
            with open(filepath, 'r') as f:
                config_data = json.load(f)
            
            self.level = ValidationLevel(config_data.get('level', ValidationLevel.STANDARD.value))
            self.config = config_data.get('config', {})
            self._load_from_environment()
            
            logger.info(f"Configuration loaded from {filepath}")
        except Exception as e:
            logger.error(f"Failed to load configuration from {filepath}: {e}")
            raise


# Global configuration instance
_global_config = None

def get_validation_config() -> ValidationConfig:
    """Get the global validation configuration instance"""
    global _global_config
    if _global_config is None:
        _global_config = ValidationConfig()
    return _global_config

def set_validation_level(level: ValidationLevel, custom_config: Optional[Dict[str, Any]] = None):
    """Set the global validation level"""
    config = get_validation_config()
    config.set_level(level, custom_config)

def get_validation_rules() -> Dict[str, Any]:
    """Get current validation rules"""
    config = get_validation_config()
    return config.get_config()
