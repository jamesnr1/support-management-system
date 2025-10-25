"""
Shift templates for pre-validating common shift patterns
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json
import logging
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class ShiftTemplateType(Enum):
    """Types of shift templates"""
    STANDARD_DAY = "standard_day"
    SPLIT_SHIFT = "split_shift"
    OVERTIME = "overtime"
    OVERNIGHT = "overnight"
    WEEKEND = "weekend"
    EMERGENCY = "emergency"
    CUSTOM = "custom"

class ValidationSeverity(Enum):
    """Severity levels for validation results"""
    ERROR = "error"           # Hard failure - must be fixed
    WARNING = "warning"       # Business rule violation - should be reviewed
    INFO = "info"            # Informational - for awareness
    SUCCESS = "success"      # Validation passed

@dataclass
class ShiftTemplate:
    """Shift template definition"""
    id: str
    name: str
    description: str
    template_type: ShiftTemplateType
    start_time: str
    end_time: str
    duration: float
    ratio: str
    funding_category: str
    is_split_shift: bool = False
    requires_approval: bool = False
    max_workers: Optional[int] = None
    min_workers: Optional[int] = None
    participant_requirements: Optional[Dict[str, Any]] = None
    validation_rules: Optional[Dict[str, Any]] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.participant_requirements is None:
            self.participant_requirements = {}
        if self.validation_rules is None:
            self.validation_rules = {}

@dataclass
class ValidationResult:
    """Validation result for a shift template"""
    template_id: str
    severity: ValidationSeverity
    message: str
    field: Optional[str] = None
    suggested_fix: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ShiftTemplateManager:
    """Manages shift templates and their validation"""
    
    def __init__(self, templates_file: Optional[str] = None):
        self.templates: Dict[str, ShiftTemplate] = {}
        self.templates_file = templates_file or "shift_templates.json"
        self._load_default_templates()
        self._load_templates_from_file()
    
    def _load_default_templates(self):
        """Load default shift templates"""
        default_templates = [
            ShiftTemplate(
                id="standard_day_1",
                name="Standard Day Shift",
                description="Regular 8-hour day shift (9 AM - 5 PM)",
                template_type=ShiftTemplateType.STANDARD_DAY,
                start_time="09:00",
                end_time="17:00",
                duration=8.0,
                ratio="1:1",
                funding_category="core",
                tags=["day", "standard", "core"]
            ),
            ShiftTemplate(
                id="standard_day_2",
                name="Extended Day Shift",
                description="Extended 10-hour day shift (8 AM - 6 PM)",
                template_type=ShiftTemplateType.STANDARD_DAY,
                start_time="08:00",
                end_time="18:00",
                duration=10.0,
                ratio="1:1",
                funding_category="core",
                validation_rules={"max_duration": 10.0, "requires_break": True},
                tags=["day", "extended", "core"]
            ),
            ShiftTemplate(
                id="split_shift_1",
                name="Split Shift - Morning/Evening",
                description="Split shift with morning and evening components",
                template_type=ShiftTemplateType.SPLIT_SHIFT,
                start_time="09:00",
                end_time="21:00",
                duration=8.0,
                ratio="1:1",
                funding_category="core",
                is_split_shift=True,
                validation_rules={"split_gap_min": 2.0, "split_gap_max": 4.0},
                tags=["split", "morning", "evening"]
            ),
            ShiftTemplate(
                id="overnight_1",
                name="Overnight Shift",
                description="Overnight shift (10 PM - 6 AM)",
                template_type=ShiftTemplateType.OVERNIGHT,
                start_time="22:00",
                end_time="06:00",
                duration=8.0,
                ratio="2:1",
                funding_category="core",
                validation_rules={"requires_2_1_ratio": True, "overnight_staffing": True},
                tags=["overnight", "2:1", "core"]
            ),
            ShiftTemplate(
                id="weekend_1",
                name="Weekend Shift",
                description="Weekend day shift with premium rates",
                template_type=ShiftTemplateType.WEEKEND,
                start_time="09:00",
                end_time="17:00",
                duration=8.0,
                ratio="1:1",
                funding_category="capacity",
                validation_rules={"weekend_only": True, "premium_rate": True},
                tags=["weekend", "premium", "capacity"]
            ),
            ShiftTemplate(
                id="emergency_1",
                name="Emergency Response",
                description="Emergency response shift with flexible timing",
                template_type=ShiftTemplateType.EMERGENCY,
                start_time="00:00",
                end_time="23:59",
                duration=4.0,
                ratio="1:1",
                funding_category="emergency",
                requires_approval=True,
                validation_rules={"flexible_timing": True, "requires_approval": True},
                tags=["emergency", "flexible", "approval"]
            )
        ]
        
        for template in default_templates:
            self.templates[template.id] = template
        
        logger.info(f"Loaded {len(default_templates)} default shift templates")
    
    def _load_templates_from_file(self):
        """Load custom templates from file"""
        try:
            with open(self.templates_file, 'r') as f:
                data = json.load(f)
            
            for template_data in data.get('templates', []):
                template = ShiftTemplate(**template_data)
                self.templates[template.id] = template
            
            logger.info(f"Loaded {len(data.get('templates', []))} custom templates from {self.templates_file}")
        except FileNotFoundError:
            logger.info(f"Templates file {self.templates_file} not found, using defaults only")
        except Exception as e:
            logger.error(f"Error loading templates from file: {e}")
    
    def save_templates_to_file(self):
        """Save templates to file"""
        try:
            data = {
                'templates': [asdict(template) for template in self.templates.values()],
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.templates_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            logger.info(f"Saved {len(self.templates)} templates to {self.templates_file}")
        except Exception as e:
            logger.error(f"Error saving templates to file: {e}")
    
    def get_template(self, template_id: str) -> Optional[ShiftTemplate]:
        """Get a specific template by ID"""
        return self.templates.get(template_id)
    
    def get_templates_by_type(self, template_type: ShiftTemplateType) -> List[ShiftTemplate]:
        """Get templates by type"""
        return [t for t in self.templates.values() if t.template_type == template_type]
    
    def get_templates_by_tags(self, tags: List[str]) -> List[ShiftTemplate]:
        """Get templates that match any of the specified tags"""
        return [t for t in self.templates.values() if any(tag in t.tags for tag in tags)]
    
    def add_template(self, template: ShiftTemplate) -> bool:
        """Add a new template"""
        if template.id in self.templates:
            logger.warning(f"Template {template.id} already exists, updating instead")
            return False
        
        self.templates[template.id] = template
        logger.info(f"Added template {template.id}: {template.name}")
        return True
    
    def update_template(self, template: ShiftTemplate) -> bool:
        """Update an existing template"""
        if template.id not in self.templates:
            logger.warning(f"Template {template.id} not found, adding instead")
            return self.add_template(template)
        
        self.templates[template.id] = template
        logger.info(f"Updated template {template.id}: {template.name}")
        return True
    
    def delete_template(self, template_id: str) -> bool:
        """Delete a template"""
        if template_id not in self.templates:
            logger.warning(f"Template {template_id} not found")
            return False
        
        template = self.templates.pop(template_id)
        logger.info(f"Deleted template {template_id}: {template.name}")
        return True
    
    def validate_shift_against_template(self, shift_data: Dict[str, Any], template: ShiftTemplate) -> List[ValidationResult]:
        """Validate a shift against a template"""
        results = []
        
        # Check basic structure
        if not shift_data.get('startTime') or not shift_data.get('endTime'):
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.ERROR,
                message="Shift must have start and end times",
                field="timing"
            ))
            return results
        
        # Check timing
        start_time = shift_data['startTime']
        end_time = shift_data['endTime']
        
        if start_time != template.start_time:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.WARNING,
                message=f"Start time {start_time} differs from template {template.start_time}",
                field="startTime",
                suggested_fix=f"Consider using {template.start_time} for consistency"
            ))
        
        if end_time != template.end_time:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.WARNING,
                message=f"End time {end_time} differs from template {template.end_time}",
                field="endTime",
                suggested_fix=f"Consider using {template.end_time} for consistency"
            ))
        
        # Check duration
        actual_duration = shift_data.get('duration', 0)
        if abs(actual_duration - template.duration) > 0.5:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.WARNING,
                message=f"Duration {actual_duration}h differs from template {template.duration}h",
                field="duration",
                suggested_fix=f"Consider using {template.duration}h duration"
            ))
        
        # Check ratio
        actual_ratio = shift_data.get('ratio', '1:1')
        if actual_ratio != template.ratio:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.ERROR,
                message=f"Ratio {actual_ratio} differs from template {template.ratio}",
                field="ratio",
                suggested_fix=f"Use {template.ratio} ratio as per template"
            ))
        
        # Check funding category
        actual_funding = shift_data.get('funding_category', 'default')
        if actual_funding != template.funding_category:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.WARNING,
                message=f"Funding category {actual_funding} differs from template {template.funding_category}",
                field="funding_category",
                suggested_fix=f"Consider using {template.funding_category} funding category"
            ))
        
        # Check worker count
        workers = shift_data.get('workers', [])
        if template.min_workers and len(workers) < template.min_workers:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.ERROR,
                message=f"Minimum {template.min_workers} workers required, got {len(workers)}",
                field="workers",
                suggested_fix=f"Add {template.min_workers - len(workers)} more workers"
            ))
        
        if template.max_workers and len(workers) > template.max_workers:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.WARNING,
                message=f"Maximum {template.max_workers} workers allowed, got {len(workers)}",
                field="workers",
                suggested_fix=f"Remove {len(workers) - template.max_workers} workers"
            ))
        
        # Check custom validation rules
        for rule_name, rule_value in template.validation_rules.items():
            if rule_name == "max_duration" and actual_duration > rule_value:
                results.append(ValidationResult(
                    template_id=template.id,
                    severity=ValidationSeverity.ERROR,
                    message=f"Duration {actual_duration}h exceeds maximum {rule_value}h",
                    field="duration",
                    suggested_fix=f"Reduce duration to {rule_value}h or less"
                ))
            
            elif rule_name == "requires_2_1_ratio" and actual_ratio != "2:1":
                results.append(ValidationResult(
                    template_id=template.id,
                    severity=ValidationSeverity.ERROR,
                    message="This template requires 2:1 ratio",
                    field="ratio",
                    suggested_fix="Change ratio to 2:1"
                ))
            
            elif rule_name == "requires_approval" and not shift_data.get('approved'):
                results.append(ValidationResult(
                    template_id=template.id,
                    severity=ValidationSeverity.WARNING,
                    message="This shift type requires approval",
                    field="approval",
                    suggested_fix="Submit for approval before scheduling"
                ))
        
        # If no issues found, add success result
        if not results:
            results.append(ValidationResult(
                template_id=template.id,
                severity=ValidationSeverity.SUCCESS,
                message=f"Shift matches template '{template.name}' perfectly"
            ))
        
        return results
    
    def suggest_template(self, shift_data: Dict[str, Any]) -> Optional[ShiftTemplate]:
        """Suggest the best matching template for a shift"""
        best_match = None
        best_score = 0
        
        for template in self.templates.values():
            score = self._calculate_template_match_score(shift_data, template)
            if score > best_score:
                best_score = score
                best_match = template
        
        # Only suggest if match score is above threshold
        return best_match if best_score > 0.7 else None
    
    def _calculate_template_match_score(self, shift_data: Dict[str, Any], template: ShiftTemplate) -> float:
        """Calculate how well a shift matches a template (0-1 score)"""
        score = 0.0
        total_checks = 0
        
        # Check timing (40% weight)
        if shift_data.get('startTime') == template.start_time:
            score += 0.2
        if shift_data.get('endTime') == template.end_time:
            score += 0.2
        total_checks += 0.4
        
        # Check duration (20% weight)
        actual_duration = shift_data.get('duration', 0)
        if abs(actual_duration - template.duration) <= 0.5:
            score += 0.2
        total_checks += 0.2
        
        # Check ratio (20% weight)
        if shift_data.get('ratio') == template.ratio:
            score += 0.2
        total_checks += 0.2
        
        # Check funding category (10% weight)
        if shift_data.get('funding_category') == template.funding_category:
            score += 0.1
        total_checks += 0.1
        
        # Check tags (10% weight)
        shift_tags = shift_data.get('tags', [])
        if any(tag in shift_tags for tag in template.tags):
            score += 0.1
        total_checks += 0.1
        
        return score / total_checks if total_checks > 0 else 0.0
    
    def get_all_templates(self) -> List[ShiftTemplate]:
        """Get all templates"""
        return list(self.templates.values())
    
    def search_templates(self, query: str) -> List[ShiftTemplate]:
        """Search templates by name or description"""
        query_lower = query.lower()
        return [
            template for template in self.templates.values()
            if (query_lower in template.name.lower() or 
                query_lower in template.description.lower() or
                any(query_lower in tag.lower() for tag in template.tags))
        ]


# Global template manager instance
_template_manager = None

def get_template_manager() -> ShiftTemplateManager:
    """Get the global template manager instance"""
    global _template_manager
    if _template_manager is None:
        _template_manager = ShiftTemplateManager()
    return _template_manager
