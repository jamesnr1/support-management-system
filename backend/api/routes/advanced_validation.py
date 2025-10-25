"""
Advanced validation API endpoints for templates, participant configs, and batch validation
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, List, Any, Optional
import logging
from api.dependencies import get_db
from services.shift_templates import (
    ShiftTemplate, ShiftTemplateType, get_template_manager,
    ValidationSeverity, ValidationResult
)
from services.participant_validation_config import (
    ParticipantValidationConfig, ParticipantValidationLevel, 
    get_participant_validation_manager
)
from services.smart_validation import (
    SmartValidationEngine, SmartValidationResult, 
    get_smart_validation_engine
)
from services.batch_validation import (
    BatchValidationService, BatchValidationRequest, 
    get_batch_validation_service
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/validation/advanced", tags=["advanced-validation"])

# ============================================================================
# SHIFT TEMPLATES ENDPOINTS
# ============================================================================

@router.get("/templates")
async def get_shift_templates(
    template_type: Optional[str] = None,
    tags: Optional[str] = None,
    search: Optional[str] = None
):
    """Get shift templates with optional filtering"""
    try:
        template_manager = get_template_manager()
        
        if search:
            templates = template_manager.search_templates(search)
        elif template_type:
            try:
                template_type_enum = ShiftTemplateType(template_type)
                templates = template_manager.get_templates_by_type(template_type_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid template type: {template_type}")
        elif tags:
            tag_list = [tag.strip() for tag in tags.split(',')]
            templates = template_manager.get_templates_by_tags(tag_list)
        else:
            templates = template_manager.get_all_templates()
        
        return {
            "success": True,
            "templates": [
                {
                    "id": template.id,
                    "name": template.name,
                    "description": template.description,
                    "template_type": template.template_type.value,
                    "start_time": template.start_time,
                    "end_time": template.end_time,
                    "duration": template.duration,
                    "ratio": template.ratio,
                    "funding_category": template.funding_category,
                    "is_split_shift": template.is_split_shift,
                    "requires_approval": template.requires_approval,
                    "tags": template.tags
                }
                for template in templates
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get shift templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/{template_id}")
async def get_shift_template(template_id: str):
    """Get a specific shift template"""
    try:
        template_manager = get_template_manager()
        template = template_manager.get_template(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "template": {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "template_type": template.template_type.value,
                "start_time": template.start_time,
                "end_time": template.end_time,
                "duration": template.duration,
                "ratio": template.ratio,
                "funding_category": template.funding_category,
                "is_split_shift": template.is_split_shift,
                "requires_approval": template.requires_approval,
                "max_workers": template.max_workers,
                "min_workers": template.min_workers,
                "participant_requirements": template.participant_requirements,
                "validation_rules": template.validation_rules,
                "tags": template.tags
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get shift template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates")
async def create_shift_template(template_data: Dict[str, Any]):
    """Create a new shift template"""
    try:
        template_manager = get_template_manager()
        
        # Create template object
        template = ShiftTemplate(**template_data)
        
        # Add template
        success = template_manager.add_template(template)
        if not success:
            raise HTTPException(status_code=400, detail="Template already exists")
        
        # Save to file
        template_manager.save_templates_to_file()
        
        return {
            "success": True,
            "message": f"Template '{template.name}' created successfully",
            "template_id": template.id
        }
    except Exception as e:
        logger.error(f"Failed to create shift template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/templates/{template_id}")
async def update_shift_template(template_id: str, template_data: Dict[str, Any]):
    """Update an existing shift template"""
    try:
        template_manager = get_template_manager()
        
        # Ensure ID matches
        template_data['id'] = template_id
        
        # Create template object
        template = ShiftTemplate(**template_data)
        
        # Update template
        success = template_manager.update_template(template)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update template")
        
        # Save to file
        template_manager.save_templates_to_file()
        
        return {
            "success": True,
            "message": f"Template '{template.name}' updated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to update shift template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/templates/{template_id}")
async def delete_shift_template(template_id: str):
    """Delete a shift template"""
    try:
        template_manager = get_template_manager()
        
        success = template_manager.delete_template(template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Save to file
        template_manager.save_templates_to_file()
        
        return {
            "success": True,
            "message": f"Template {template_id} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete shift template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/validate")
async def validate_shift_against_template(
    shift_data: Dict[str, Any],
    template_id: str
):
    """Validate a shift against a specific template"""
    try:
        template_manager = get_template_manager()
        template = template_manager.get_template(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Validate shift against template
        results = template_manager.validate_shift_against_template(shift_data, template)
        
        return {
            "success": True,
            "template_id": template_id,
            "template_name": template.name,
            "results": [
                {
                    "severity": result.severity.value,
                    "message": result.message,
                    "field": result.field,
                    "suggested_fix": result.suggested_fix,
                    "metadata": result.metadata
                }
                for result in results
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate shift against template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/suggest")
async def suggest_template_for_shift(shift_data: Dict[str, Any]):
    """Suggest the best matching template for a shift"""
    try:
        template_manager = get_template_manager()
        
        suggested_template = template_manager.suggest_template(shift_data)
        
        if suggested_template:
            return {
                "success": True,
                "suggested_template": {
                    "id": suggested_template.id,
                    "name": suggested_template.name,
                    "description": suggested_template.description,
                    "template_type": suggested_template.template_type.value,
                    "match_score": template_manager._calculate_template_match_score(shift_data, suggested_template)
                }
            }
        else:
            return {
                "success": True,
                "suggested_template": None,
                "message": "No suitable template found"
            }
    except Exception as e:
        logger.error(f"Failed to suggest template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# PARTICIPANT VALIDATION CONFIG ENDPOINTS
# ============================================================================

@router.get("/participants")
async def get_participant_configs():
    """Get all participant validation configurations"""
    try:
        participant_manager = get_participant_validation_manager()
        configs = participant_manager.get_all_configs()
        
        return {
            "success": True,
            "configs": [
                {
                    "participant_id": config.participant_id,
                    "participant_name": config.participant_name,
                    "validation_level": config.validation_level.value,
                    "min_rest_hours": config.min_rest_hours,
                    "max_continuous_hours": config.max_continuous_hours,
                    "max_daily_hours": config.max_daily_hours,
                    "max_weekly_hours": config.max_weekly_hours,
                    "allow_split_shifts": config.allow_split_shifts,
                    "requires_2_1_ratio": config.requires_2_1_ratio,
                    "overnight_restriction": config.overnight_restriction,
                    "weekend_restriction": config.weekend_restriction,
                    "notes": config.notes
                }
                for config in configs
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get participant configs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participants/{participant_id}")
async def get_participant_config(participant_id: str):
    """Get validation configuration for a specific participant"""
    try:
        participant_manager = get_participant_validation_manager()
        config = participant_manager.get_participant_validation_rules(participant_id)
        
        return {
            "success": True,
            "config": config
        }
    except Exception as e:
        logger.error(f"Failed to get participant config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/participants/{participant_id}")
async def create_participant_config(
    participant_id: str,
    config_data: Dict[str, Any]
):
    """Create validation configuration for a participant"""
    try:
        participant_manager = get_participant_validation_manager()
        
        # Create config object
        config = ParticipantValidationConfig(
            participant_id=participant_id,
            **config_data
        )
        
        # Add config
        success = participant_manager.add_config(config)
        if not success:
            raise HTTPException(status_code=400, detail="Config already exists")
        
        # Save to file
        participant_manager.save_configs_to_file()
        
        return {
            "success": True,
            "message": f"Validation config created for participant {participant_id}"
        }
    except Exception as e:
        logger.error(f"Failed to create participant config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/participants/{participant_id}")
async def update_participant_config(
    participant_id: str,
    config_data: Dict[str, Any]
):
    """Update validation configuration for a participant"""
    try:
        participant_manager = get_participant_validation_manager()
        
        # Get existing config
        existing_config = participant_manager.get_config(participant_id)
        if not existing_config:
            raise HTTPException(status_code=404, detail="Participant config not found")
        
        # Update config
        for key, value in config_data.items():
            if hasattr(existing_config, key):
                setattr(existing_config, key, value)
        
        # Save updated config
        success = participant_manager.update_config(existing_config)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update config")
        
        # Save to file
        participant_manager.save_configs_to_file()
        
        return {
            "success": True,
            "message": f"Validation config updated for participant {participant_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update participant config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/participants/{participant_id}/apply-level")
async def apply_validation_level(
    participant_id: str,
    level: str
):
    """Apply a predefined validation level to a participant"""
    try:
        participant_manager = get_participant_validation_manager()
        
        try:
            validation_level = ParticipantValidationLevel(level)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid validation level: {level}. Available: {[l.value for l in ParticipantValidationLevel]}"
            )
        
        success = participant_manager.apply_validation_level(participant_id, validation_level)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to apply validation level")
        
        # Save to file
        participant_manager.save_configs_to_file()
        
        return {
            "success": True,
            "message": f"Applied {level} validation level to participant {participant_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to apply validation level: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# SMART VALIDATION ENDPOINTS
# ============================================================================

@router.get("/smart/rules")
async def get_smart_validation_rules():
    """Get all smart validation rules"""
    try:
        smart_engine = get_smart_validation_engine()
        
        return {
            "success": True,
            "rules": [
                {
                    "rule_id": rule.rule_id,
                    "category": rule.category.value,
                    "severity": rule.severity.value,
                    "message": rule.message,
                    "can_override": rule.can_override,
                    "requires_approval": rule.requires_approval,
                    "impact_score": rule.impact_score
                }
                for rule in smart_engine.rules.values()
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get smart validation rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/smart/validate")
async def validate_with_smart_rules(
    shift_data: Dict[str, Any],
    workers: Dict[str, Any],
    participants: Dict[str, Any] = None
):
    """Validate a shift using smart validation rules"""
    try:
        smart_engine = get_smart_validation_engine()
        
        # Run smart validation
        results = smart_engine.validate_shift(shift_data, [], participants)
        
        # Generate summary
        summary = smart_engine.get_validation_summary(results)
        
        return {
            "success": True,
            "results": [result.to_dict() for result in results],
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Failed to run smart validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# BATCH VALIDATION ENDPOINTS
# ============================================================================

@router.post("/batch/validate")
async def validate_batch(
    request_data: Dict[str, Any],
    background_tasks: BackgroundTasks
):
    """Validate multiple shifts in batch"""
    try:
        batch_service = get_batch_validation_service()
        
        # Create batch validation request
        request = BatchValidationRequest(**request_data)
        
        # Run batch validation
        result = await batch_service.validate_batch(request)
        
        return {
            "success": True,
            "result": result.to_dict()
        }
    except Exception as e:
        logger.error(f"Failed to run batch validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batch/history")
async def get_validation_history(limit: int = 100):
    """Get validation history"""
    try:
        batch_service = get_batch_validation_service()
        history = batch_service.get_validation_history(limit)
        
        return {
            "success": True,
            "history": history
        }
    except Exception as e:
        logger.error(f"Failed to get validation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch/cleanup")
async def cleanup_validation_history(days_old: int = 30):
    """Clean up old validation results"""
    try:
        batch_service = get_batch_validation_service()
        batch_service.cleanup_old_results(days_old)
        
        return {
            "success": True,
            "message": f"Cleaned up validation results older than {days_old} days"
        }
    except Exception as e:
        logger.error(f"Failed to cleanup validation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
