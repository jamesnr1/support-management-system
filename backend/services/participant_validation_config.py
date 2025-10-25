"""
Per-participant validation configuration for customized break times and rules
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import json
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class ParticipantValidationLevel(Enum):
    """Validation levels for individual participants"""
    STANDARD = "standard"
    RELAXED = "relaxed"
    STRICT = "strict"
    CUSTOM = "custom"

@dataclass
class ParticipantValidationConfig:
    """Validation configuration for a specific participant"""
    participant_id: str
    participant_name: str
    validation_level: ParticipantValidationLevel
    
    # Rest period configuration
    min_rest_hours: float = 8.0
    max_continuous_hours: float = 12.0
    max_daily_hours: float = 16.0
    max_weekly_hours: float = 40.0
    
    # Break requirements
    requires_meal_break: bool = True
    meal_break_duration: float = 0.5  # 30 minutes
    meal_break_after_hours: float = 5.0  # After 5 hours of work
    
    # Split shift configuration
    allow_split_shifts: bool = True
    min_split_shift_gap: float = 1.0
    max_split_shift_gap: float = 4.0
    
    # Special requirements
    requires_2_1_ratio: bool = False
    overnight_restriction: bool = False
    weekend_restriction: bool = False
    
    # Custom rules
    custom_rules: Dict[str, Any] = None
    notes: str = ""
    
    # Metadata
    created_at: str = ""
    updated_at: str = ""
    created_by: str = ""
    
    def __post_init__(self):
        if self.custom_rules is None:
            self.custom_rules = {}
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = datetime.now().isoformat()

class ParticipantValidationManager:
    """Manages per-participant validation configurations"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.configs: Dict[str, ParticipantValidationConfig] = {}
        self.config_file = config_file or "participant_validation_config.json"
        self._load_configs_from_file()
    
    def _load_configs_from_file(self):
        """Load participant configurations from file"""
        try:
            with open(self.config_file, 'r') as f:
                data = json.load(f)
            
            for config_data in data.get('configs', []):
                config = ParticipantValidationConfig(**config_data)
                self.configs[config.participant_id] = config
            
            logger.info(f"Loaded {len(self.configs)} participant validation configurations")
        except FileNotFoundError:
            logger.info(f"Config file {self.config_file} not found, starting with empty configs")
        except Exception as e:
            logger.error(f"Error loading participant configs: {e}")
    
    def save_configs_to_file(self):
        """Save participant configurations to file"""
        try:
            data = {
                'configs': [asdict(config) for config in self.configs.values()],
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.config_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            logger.info(f"Saved {len(self.configs)} participant configurations")
        except Exception as e:
            logger.error(f"Error saving participant configs: {e}")
    
    def get_config(self, participant_id: str) -> Optional[ParticipantValidationConfig]:
        """Get validation configuration for a participant"""
        return self.configs.get(participant_id)
    
    def get_or_create_config(self, participant_id: str, participant_name: str = "") -> ParticipantValidationConfig:
        """Get existing config or create default one"""
        config = self.get_config(participant_id)
        if config is None:
            config = self.create_default_config(participant_id, participant_name)
            self.add_config(config)
        return config
    
    def create_default_config(self, participant_id: str, participant_name: str = "") -> ParticipantValidationConfig:
        """Create a default validation configuration for a participant"""
        return ParticipantValidationConfig(
            participant_id=participant_id,
            participant_name=participant_name or f"Participant-{participant_id}",
            validation_level=ParticipantValidationLevel.STANDARD
        )
    
    def add_config(self, config: ParticipantValidationConfig) -> bool:
        """Add a new participant configuration"""
        if config.participant_id in self.configs:
            logger.warning(f"Config for participant {config.participant_id} already exists")
            return False
        
        config.created_at = datetime.now().isoformat()
        config.updated_at = datetime.now().isoformat()
        self.configs[config.participant_id] = config
        logger.info(f"Added validation config for participant {config.participant_id}")
        return True
    
    def update_config(self, config: ParticipantValidationConfig) -> bool:
        """Update an existing participant configuration"""
        if config.participant_id not in self.configs:
            logger.warning(f"Config for participant {config.participant_id} not found, adding instead")
            return self.add_config(config)
        
        config.updated_at = datetime.now().isoformat()
        self.configs[config.participant_id] = config
        logger.info(f"Updated validation config for participant {config.participant_id}")
        return True
    
    def delete_config(self, participant_id: str) -> bool:
        """Delete a participant configuration"""
        if participant_id not in self.configs:
            logger.warning(f"Config for participant {participant_id} not found")
            return False
        
        config = self.configs.pop(participant_id)
        logger.info(f"Deleted validation config for participant {participant_id}")
        return True
    
    def apply_validation_level(self, participant_id: str, level: ParticipantValidationLevel) -> bool:
        """Apply a predefined validation level to a participant"""
        config = self.get_or_create_config(participant_id)
        
        if level == ParticipantValidationLevel.RELAXED:
            config.min_rest_hours = 4.0
            config.max_continuous_hours = 16.0
            config.max_daily_hours = 20.0
            config.max_weekly_hours = 50.0
            config.allow_split_shifts = True
            config.min_split_shift_gap = 0.5
            config.requires_meal_break = False
        
        elif level == ParticipantValidationLevel.STRICT:
            config.min_rest_hours = 12.0
            config.max_continuous_hours = 10.0
            config.max_daily_hours = 12.0
            config.max_weekly_hours = 35.0
            config.allow_split_shifts = False
            config.min_split_shift_gap = 2.0
            config.requires_meal_break = True
            config.meal_break_duration = 1.0
            config.meal_break_after_hours = 4.0
        
        else:  # STANDARD
            config.min_rest_hours = 8.0
            config.max_continuous_hours = 12.0
            config.max_daily_hours = 16.0
            config.max_weekly_hours = 40.0
            config.allow_split_shifts = True
            config.min_split_shift_gap = 1.0
            config.requires_meal_break = True
            config.meal_break_duration = 0.5
            config.meal_break_after_hours = 5.0
        
        config.validation_level = level
        return self.update_config(config)
    
    def get_participant_validation_rules(self, participant_id: str) -> Dict[str, Any]:
        """Get validation rules for a specific participant"""
        config = self.get_or_create_config(participant_id)
        
        return {
            'participant_id': participant_id,
            'participant_name': config.participant_name,
            'validation_level': config.validation_level.value,
            'rest_periods': {
                'min_rest_hours': config.min_rest_hours,
                'max_continuous_hours': config.max_continuous_hours,
                'max_daily_hours': config.max_daily_hours,
                'max_weekly_hours': config.max_weekly_hours
            },
            'break_requirements': {
                'requires_meal_break': config.requires_meal_break,
                'meal_break_duration': config.meal_break_duration,
                'meal_break_after_hours': config.meal_break_after_hours
            },
            'split_shifts': {
                'allowed': config.allow_split_shifts,
                'min_gap_hours': config.min_split_shift_gap,
                'max_gap_hours': config.max_split_shift_gap
            },
            'special_requirements': {
                'requires_2_1_ratio': config.requires_2_1_ratio,
                'overnight_restriction': config.overnight_restriction,
                'weekend_restriction': config.weekend_restriction
            },
            'custom_rules': config.custom_rules,
            'notes': config.notes
        }
    
    def validate_participant_shift(self, participant_id: str, shift_data: Dict[str, Any], 
                                 worker_schedule: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate a shift for a specific participant using their custom rules"""
        config = self.get_or_create_config(participant_id)
        validation_results = []
        
        # Check rest periods
        if worker_schedule:
            last_shift = worker_schedule[-1]
            rest_hours = self._calculate_rest_hours(last_shift, shift_data)
            
            if rest_hours < config.min_rest_hours:
                validation_results.append({
                    'type': 'error',
                    'field': 'rest_period',
                    'message': f"Insufficient rest: {rest_hours:.1f}h (minimum: {config.min_rest_hours}h)",
                    'participant_id': participant_id,
                    'severity': 'error'
                })
        
        # Check continuous hours
        total_continuous_hours = self._calculate_continuous_hours(worker_schedule, shift_data)
        if total_continuous_hours > config.max_continuous_hours:
            validation_results.append({
                'type': 'warning',
                'field': 'continuous_hours',
                'message': f"Excessive continuous work: {total_continuous_hours:.1f}h (max: {config.max_continuous_hours}h)",
                'participant_id': participant_id,
                'severity': 'warning'
            })
        
        # Check daily hours
        daily_hours = self._calculate_daily_hours(worker_schedule, shift_data)
        if daily_hours > config.max_daily_hours:
            validation_results.append({
                'type': 'error',
                'field': 'daily_hours',
                'message': f"Daily limit exceeded: {daily_hours:.1f}h (max: {config.max_daily_hours}h)",
                'participant_id': participant_id,
                'severity': 'error'
            })
        
        # Check meal break requirements
        if config.requires_meal_break:
            shift_duration = shift_data.get('duration', 0)
            if shift_duration > config.meal_break_after_hours:
                if not self._has_meal_break(worker_schedule, shift_data, config.meal_break_duration):
                    validation_results.append({
                        'type': 'warning',
                        'field': 'meal_break',
                        'message': f"Meal break required for shifts over {config.meal_break_after_hours}h",
                        'participant_id': participant_id,
                        'severity': 'warning'
                    })
        
        # Check split shift restrictions
        if not config.allow_split_shifts and self._is_split_shift(worker_schedule, shift_data):
            validation_results.append({
                'type': 'error',
                'field': 'split_shifts',
                'message': "Split shifts not allowed for this participant",
                'participant_id': participant_id,
                'severity': 'error'
            })
        
        # Check special requirements
        if config.requires_2_1_ratio and shift_data.get('ratio') != '2:1':
            validation_results.append({
                'type': 'error',
                'field': 'ratio',
                'message': "2:1 ratio required for this participant",
                'participant_id': participant_id,
                'severity': 'error'
            })
        
        # Check overnight restrictions
        if config.overnight_restriction and self._is_overnight_shift(shift_data):
            validation_results.append({
                'type': 'error',
                'field': 'overnight',
                'message': "Overnight shifts not allowed for this participant",
                'participant_id': participant_id,
                'severity': 'error'
            })
        
        # Check weekend restrictions
        if config.weekend_restriction and self._is_weekend_shift(shift_data):
            validation_results.append({
                'type': 'error',
                'field': 'weekend',
                'message': "Weekend shifts not allowed for this participant",
                'participant_id': participant_id,
                'severity': 'error'
            })
        
        return validation_results
    
    def _calculate_rest_hours(self, last_shift: Dict[str, Any], current_shift: Dict[str, Any]) -> float:
        """Calculate rest hours between shifts"""
        # Implementation would depend on shift data structure
        # This is a simplified version
        return 8.0  # Placeholder
    
    def _calculate_continuous_hours(self, worker_schedule: List[Dict[str, Any]], 
                                  current_shift: Dict[str, Any]) -> float:
        """Calculate total continuous work hours"""
        # Implementation would calculate continuous hours
        return 0.0  # Placeholder
    
    def _calculate_daily_hours(self, worker_schedule: List[Dict[str, Any]], 
                             current_shift: Dict[str, Any]) -> float:
        """Calculate total hours for the day"""
        # Implementation would calculate daily hours
        return 0.0  # Placeholder
    
    def _has_meal_break(self, worker_schedule: List[Dict[str, Any]], 
                       current_shift: Dict[str, Any], required_duration: float) -> bool:
        """Check if meal break is scheduled"""
        # Implementation would check for meal breaks
        return True  # Placeholder
    
    def _is_split_shift(self, worker_schedule: List[Dict[str, Any]], 
                       current_shift: Dict[str, Any]) -> bool:
        """Check if this is a split shift"""
        return current_shift.get('is_split_shift', False)
    
    def _is_overnight_shift(self, shift_data: Dict[str, Any]) -> bool:
        """Check if this is an overnight shift"""
        start_hour = int(shift_data.get('startTime', '00:00').split(':')[0])
        end_hour = int(shift_data.get('endTime', '00:00').split(':')[0])
        return start_hour >= 22 or end_hour <= 6 or start_hour > end_hour
    
    def _is_weekend_shift(self, shift_data: Dict[str, Any]) -> bool:
        """Check if this is a weekend shift"""
        # Implementation would check the date
        return False  # Placeholder
    
    def get_all_configs(self) -> List[ParticipantValidationConfig]:
        """Get all participant configurations"""
        return list(self.configs.values())
    
    def search_configs(self, query: str) -> List[ParticipantValidationConfig]:
        """Search configurations by participant name or ID"""
        query_lower = query.lower()
        return [
            config for config in self.configs.values()
            if (query_lower in config.participant_id.lower() or 
                query_lower in config.participant_name.lower())
        ]


# Global participant validation manager instance
_participant_validation_manager = None

def get_participant_validation_manager() -> ParticipantValidationManager:
    """Get the global participant validation manager instance"""
    global _participant_validation_manager
    if _participant_validation_manager is None:
        _participant_validation_manager = ParticipantValidationManager()
    return _participant_validation_manager
