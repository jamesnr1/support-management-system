"""
Smart validation system that distinguishes between hard failures and business rule warnings
"""
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ValidationSeverity(Enum):
    """Validation severity levels"""
    CRITICAL = "critical"     # System-breaking errors
    ERROR = "error"           # Hard failures - must be fixed
    WARNING = "warning"       # Business rule violations - should be reviewed
    INFO = "info"            # Informational - for awareness
    SUCCESS = "success"      # Validation passed

class ValidationCategory(Enum):
    """Categories of validation rules"""
    COMPLIANCE = "compliance"     # Legal/regulatory requirements
    SAFETY = "safety"            # Worker safety requirements
    BUSINESS = "business"        # Business rule violations
    EFFICIENCY = "efficiency"    # Operational efficiency
    QUALITY = "quality"         # Service quality standards
    CUSTOM = "custom"           # Custom organization rules

@dataclass
class SmartValidationResult:
    """Smart validation result with severity and category"""
    rule_id: str
    category: ValidationCategory
    severity: ValidationSeverity
    message: str
    field: Optional[str] = None
    suggested_fix: Optional[str] = None
    impact_score: float = 0.0  # 0-1 scale of business impact
    can_override: bool = False
    requires_approval: bool = False
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'rule_id': self.rule_id,
            'category': self.category.value,
            'severity': self.severity.value,
            'message': self.message,
            'field': self.field,
            'suggested_fix': self.suggested_fix,
            'impact_score': self.impact_score,
            'can_override': self.can_override,
            'requires_approval': self.requires_approval,
            'metadata': self.metadata or {}
        }

class SmartValidationRule:
    """Definition of a smart validation rule"""
    
    def __init__(self, rule_id: str, category: ValidationCategory, 
                 severity: ValidationSeverity, message: str,
                 can_override: bool = False, requires_approval: bool = False,
                 impact_score: float = 0.5):
        self.rule_id = rule_id
        self.category = category
        self.severity = severity
        self.message = message
        self.can_override = can_override
        self.requires_approval = requires_approval
        self.impact_score = impact_score
        self.created_at = datetime.now()
    
    def create_result(self, field: str = None, suggested_fix: str = None, 
                     metadata: Dict[str, Any] = None) -> SmartValidationResult:
        """Create a validation result for this rule"""
        return SmartValidationResult(
            rule_id=self.rule_id,
            category=self.category,
            severity=self.severity,
            message=self.message,
            field=field,
            suggested_fix=suggested_fix,
            impact_score=self.impact_score,
            can_override=self.can_override,
            requires_approval=self.requires_approval,
            metadata=metadata
        )

class SmartValidationEngine:
    """Smart validation engine with configurable rules and severity levels"""
    
    def __init__(self):
        self.rules: Dict[str, SmartValidationRule] = {}
        self._initialize_default_rules()
    
    def _initialize_default_rules(self):
        """Initialize default validation rules with smart severity classification"""
        
        # CRITICAL RULES - System breaking
        self.add_rule(SmartValidationRule(
            rule_id="double_booking",
            category=ValidationCategory.SAFETY,
            severity=ValidationSeverity.CRITICAL,
            message="Worker is double-booked for different participants",
            can_override=False,
            requires_approval=True,
            impact_score=1.0
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="overlapping_shifts",
            category=ValidationCategory.SAFETY,
            severity=ValidationSeverity.CRITICAL,
            message="Worker has overlapping shifts",
            can_override=False,
            requires_approval=True,
            impact_score=1.0
        ))
        
        # ERROR RULES - Hard failures
        self.add_rule(SmartValidationRule(
            rule_id="insufficient_rest_critical",
            category=ValidationCategory.SAFETY,
            severity=ValidationSeverity.ERROR,
            message="Insufficient rest period between shifts (safety critical)",
            can_override=True,
            requires_approval=True,
            impact_score=0.9
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="weekly_limit_exceeded",
            category=ValidationCategory.COMPLIANCE,
            severity=ValidationSeverity.ERROR,
            message="Weekly hour limit exceeded",
            can_override=True,
            requires_approval=True,
            impact_score=0.8
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="daily_limit_exceeded",
            category=ValidationCategory.COMPLIANCE,
            severity=ValidationSeverity.ERROR,
            message="Daily hour limit exceeded",
            can_override=True,
            requires_approval=True,
            impact_score=0.8
        ))
        
        # WARNING RULES - Business rule violations
        self.add_rule(SmartValidationRule(
            rule_id="insufficient_rest_warning",
            category=ValidationCategory.EFFICIENCY,
            severity=ValidationSeverity.WARNING,
            message="Short rest period between shifts (may impact performance)",
            can_override=True,
            requires_approval=False,
            impact_score=0.4
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="split_shift_gap",
            category=ValidationCategory.BUSINESS,
            severity=ValidationSeverity.WARNING,
            message="Split shift gap is outside recommended range",
            can_override=True,
            requires_approval=False,
            impact_score=0.3
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="overnight_understaffed",
            category=ValidationCategory.SAFETY,
            severity=ValidationSeverity.WARNING,
            message="Overnight shift may be understaffed",
            can_override=True,
            requires_approval=False,
            impact_score=0.6
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="continuous_hours_high",
            category=ValidationCategory.EFFICIENCY,
            severity=ValidationSeverity.WARNING,
            message="High continuous work hours may impact quality",
            can_override=True,
            requires_approval=False,
            impact_score=0.5
        ))
        
        # INFO RULES - Informational
        self.add_rule(SmartValidationRule(
            rule_id="split_shift_detected",
            category=ValidationCategory.INFO,
            severity=ValidationSeverity.INFO,
            message="Split shift detected (verify this is intentional)",
            can_override=False,
            requires_approval=False,
            impact_score=0.1
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="funding_category_change",
            category=ValidationCategory.BUSINESS,
            severity=ValidationSeverity.INFO,
            message="Funding category differs from template",
            can_override=False,
            requires_approval=False,
            impact_score=0.2
        ))
        
        self.add_rule(SmartValidationRule(
            rule_id="weekend_shift",
            category=ValidationCategory.BUSINESS,
            severity=ValidationSeverity.INFO,
            message="Weekend shift scheduled",
            can_override=False,
            requires_approval=False,
            impact_score=0.1
        ))
        
        logger.info(f"Initialized {len(self.rules)} smart validation rules")
    
    def add_rule(self, rule: SmartValidationRule):
        """Add a custom validation rule"""
        self.rules[rule.rule_id] = rule
        logger.info(f"Added validation rule: {rule.rule_id}")
    
    def remove_rule(self, rule_id: str) -> bool:
        """Remove a validation rule"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            logger.info(f"Removed validation rule: {rule_id}")
            return True
        return False
    
    def get_rule(self, rule_id: str) -> Optional[SmartValidationRule]:
        """Get a validation rule by ID"""
        return self.rules.get(rule_id)
    
    def validate_shift(self, shift_data: Dict[str, Any], worker_schedule: List[Dict[str, Any]], 
                      participant_config: Optional[Dict[str, Any]] = None) -> List[SmartValidationResult]:
        """Validate a shift using smart rules"""
        results = []
        
        # Check for double booking
        if self._has_double_booking(shift_data, worker_schedule):
            results.append(self.rules["double_booking"].create_result(
                field="workers",
                suggested_fix="Remove conflicting worker or reschedule shift"
            ))
        
        # Check for overlapping shifts
        if self._has_overlapping_shifts(shift_data, worker_schedule):
            results.append(self.rules["overlapping_shifts"].create_result(
                field="timing",
                suggested_fix="Adjust shift times to avoid overlap"
            ))
        
        # Check rest periods with smart severity
        rest_hours = self._calculate_rest_hours(shift_data, worker_schedule)
        if rest_hours < 4:  # Critical threshold
            results.append(self.rules["insufficient_rest_critical"].create_result(
                field="rest_period",
                suggested_fix=f"Add {4 - rest_hours:.1f} hours rest between shifts",
                metadata={"rest_hours": rest_hours, "minimum_required": 4}
            ))
        elif rest_hours < 8:  # Warning threshold
            results.append(self.rules["insufficient_rest_warning"].create_result(
                field="rest_period",
                suggested_fix=f"Consider adding {8 - rest_hours:.1f} hours rest",
                metadata={"rest_hours": rest_hours, "recommended": 8}
            ))
        
        # Check weekly limits
        weekly_hours = self._calculate_weekly_hours(worker_schedule, shift_data)
        max_weekly = participant_config.get('max_weekly_hours', 40) if participant_config else 40
        if weekly_hours > max_weekly:
            results.append(self.rules["weekly_limit_exceeded"].create_result(
                field="weekly_hours",
                suggested_fix=f"Reduce weekly hours by {weekly_hours - max_weekly:.1f}h",
                metadata={"current_hours": weekly_hours, "limit": max_weekly}
            ))
        
        # Check daily limits
        daily_hours = self._calculate_daily_hours(worker_schedule, shift_data)
        max_daily = participant_config.get('max_daily_hours', 16) if participant_config else 16
        if daily_hours > max_daily:
            results.append(self.rules["daily_limit_exceeded"].create_result(
                field="daily_hours",
                suggested_fix=f"Reduce daily hours by {daily_hours - max_daily:.1f}h",
                metadata={"current_hours": daily_hours, "limit": max_daily}
            ))
        
        # Check split shift gaps
        if self._is_split_shift(shift_data):
            gap_hours = self._calculate_split_gap(shift_data, worker_schedule)
            if gap_hours < 1 or gap_hours > 4:
                results.append(self.rules["split_shift_gap"].create_result(
                    field="split_gap",
                    suggested_fix=f"Adjust gap to 1-4 hours (current: {gap_hours:.1f}h)",
                    metadata={"gap_hours": gap_hours, "recommended_range": [1, 4]}
                ))
            else:
                results.append(self.rules["split_shift_detected"].create_result(
                    metadata={"gap_hours": gap_hours, "is_valid": True}
                ))
        
        # Check overnight staffing
        if self._is_overnight_shift(shift_data):
            if shift_data.get('ratio') == '2:1' and len(shift_data.get('workers', [])) < 2:
                results.append(self.rules["overnight_understaffed"].create_result(
                    field="workers",
                    suggested_fix="Add second worker for 2:1 overnight shift",
                    metadata={"required_workers": 2, "current_workers": len(shift_data.get('workers', []))}
                ))
        
        # Check continuous hours
        continuous_hours = self._calculate_continuous_hours(worker_schedule, shift_data)
        if continuous_hours > 12:
            results.append(self.rules["continuous_hours_high"].create_result(
                field="continuous_hours",
                suggested_fix=f"Consider adding break (current: {continuous_hours:.1f}h continuous)",
                metadata={"continuous_hours": continuous_hours, "recommended_max": 12}
            ))
        
        # Check funding category changes
        if self._has_funding_category_change(shift_data, worker_schedule):
            results.append(self.rules["funding_category_change"].create_result(
                field="funding_category",
                suggested_fix="Verify funding category is correct",
                metadata={"new_category": shift_data.get('funding_category')}
            ))
        
        # Check weekend shifts
        if self._is_weekend_shift(shift_data):
            results.append(self.rules["weekend_shift"].create_result(
                metadata={"is_weekend": True, "date": shift_data.get('date')}
            ))
        
        return results
    
    def _has_double_booking(self, shift_data: Dict[str, Any], worker_schedule: List[Dict[str, Any]]) -> bool:
        """Check for double booking"""
        # Implementation would check for conflicts
        return False  # Placeholder
    
    def _has_overlapping_shifts(self, shift_data: Dict[str, Any], worker_schedule: List[Dict[str, Any]]) -> bool:
        """Check for overlapping shifts"""
        # Implementation would check for overlaps
        return False  # Placeholder
    
    def _calculate_rest_hours(self, shift_data: Dict[str, Any], worker_schedule: List[Dict[str, Any]]) -> float:
        """Calculate rest hours between shifts"""
        # Implementation would calculate actual rest
        return 8.0  # Placeholder
    
    def _calculate_weekly_hours(self, worker_schedule: List[Dict[str, Any]], shift_data: Dict[str, Any]) -> float:
        """Calculate weekly hours"""
        # Implementation would calculate actual weekly hours
        return 0.0  # Placeholder
    
    def _calculate_daily_hours(self, worker_schedule: List[Dict[str, Any]], shift_data: Dict[str, Any]) -> float:
        """Calculate daily hours"""
        # Implementation would calculate actual daily hours
        return 0.0  # Placeholder
    
    def _is_split_shift(self, shift_data: Dict[str, Any]) -> bool:
        """Check if this is a split shift"""
        return shift_data.get('is_split_shift', False)
    
    def _calculate_split_gap(self, shift_data: Dict[str, Any], worker_schedule: List[Dict[str, Any]]) -> float:
        """Calculate split shift gap"""
        # Implementation would calculate actual gap
        return 2.0  # Placeholder
    
    def _is_overnight_shift(self, shift_data: Dict[str, Any]) -> bool:
        """Check if this is an overnight shift"""
        start_hour = int(shift_data.get('startTime', '00:00').split(':')[0])
        end_hour = int(shift_data.get('endTime', '00:00').split(':')[0])
        return start_hour >= 22 or end_hour <= 6 or start_hour > end_hour
    
    def _calculate_continuous_hours(self, worker_schedule: List[Dict[str, Any]], shift_data: Dict[str, Any]) -> float:
        """Calculate continuous work hours"""
        # Implementation would calculate actual continuous hours
        return 0.0  # Placeholder
    
    def _has_funding_category_change(self, shift_data: Dict[str, Any], worker_schedule: List[Dict[str, Any]]) -> bool:
        """Check for funding category changes"""
        # Implementation would check for changes
        return False  # Placeholder
    
    def _is_weekend_shift(self, shift_data: Dict[str, Any]) -> bool:
        """Check if this is a weekend shift"""
        # Implementation would check the date
        return False  # Placeholder
    
    def get_validation_summary(self, results: List[SmartValidationResult]) -> Dict[str, Any]:
        """Get a summary of validation results"""
        summary = {
            'total_issues': len(results),
            'critical': 0,
            'errors': 0,
            'warnings': 0,
            'info': 0,
            'can_override': 0,
            'requires_approval': 0,
            'categories': {},
            'impact_score': 0.0
        }
        
        for result in results:
            # Count by severity
            if result.severity == ValidationSeverity.CRITICAL:
                summary['critical'] += 1
            elif result.severity == ValidationSeverity.ERROR:
                summary['errors'] += 1
            elif result.severity == ValidationSeverity.WARNING:
                summary['warnings'] += 1
            elif result.severity == ValidationSeverity.INFO:
                summary['info'] += 1
            
            # Count overrides and approvals
            if result.can_override:
                summary['can_override'] += 1
            if result.requires_approval:
                summary['requires_approval'] += 1
            
            # Count by category
            category = result.category.value
            summary['categories'][category] = summary['categories'].get(category, 0) + 1
            
            # Calculate overall impact score
            summary['impact_score'] += result.impact_score
        
        # Normalize impact score
        if results:
            summary['impact_score'] /= len(results)
        
        # Determine overall status
        if summary['critical'] > 0:
            summary['status'] = 'critical'
        elif summary['errors'] > 0:
            summary['status'] = 'error'
        elif summary['warnings'] > 0:
            summary['status'] = 'warning'
        else:
            summary['status'] = 'success'
        
        return summary


# Global smart validation engine instance
_smart_validation_engine = None

def get_smart_validation_engine() -> SmartValidationEngine:
    """Get the global smart validation engine instance"""
    global _smart_validation_engine
    if _smart_validation_engine is None:
        _smart_validation_engine = SmartValidationEngine()
    return _smart_validation_engine
