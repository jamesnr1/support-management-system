"""
Validation API endpoints for managing validation rules and configuration
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
import logging
from api.dependencies import get_db
from services.validation_config import (
    ValidationConfig, 
    ValidationLevel, 
    get_validation_config,
    set_validation_level
)
from services.enhanced_validation_service import EnhancedValidationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/validation", tags=["validation"])


@router.get("/config")
async def get_validation_configuration():
    """
    Get current validation configuration
    """
    try:
        config = get_validation_config()
        return {
            "success": True,
            "config": config.get_validation_rules_summary(),
            "available_levels": [level.value for level in ValidationLevel]
        }
    except Exception as e:
        logger.error(f"Failed to get validation config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config")
async def update_validation_configuration(
    updates: Dict[str, Any],
    level: Optional[str] = None
):
    """
    Update validation configuration
    
    Args:
        updates: Configuration updates to apply
        level: Optional validation level to set
    """
    try:
        config = get_validation_config()
        
        # Set validation level if provided
        if level:
            try:
                validation_level = ValidationLevel(level)
                config.set_level(validation_level)
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid validation level: {level}. Available: {[l.value for l in ValidationLevel]}"
                )
        
        # Apply configuration updates
        if updates:
            config.update_config(updates)
        
        # Validate the new configuration
        validation_result = config.validate_config()
        if not validation_result['valid']:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid configuration: {validation_result['errors']}"
            )
        
        return {
            "success": True,
            "config": config.get_validation_rules_summary(),
            "warnings": validation_result.get('warnings', [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update validation config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_roster(
    roster_data: Dict[str, Any],
    workers: Dict[str, Any],
    config_override: Optional[Dict[str, Any]] = None
):
    """
    Validate roster data with current or custom configuration
    
    Args:
        roster_data: The roster data to validate
        workers: Worker data for validation
        config_override: Optional custom validation configuration
    """
    try:
        # Get validation configuration
        config = get_validation_config()
        validation_config = config_override or config.get_config()
        
        # Perform validation
        validator = EnhancedValidationService(workers, validation_config)
        result = validator.validate_roster_data(roster_data)
        
        return {
            "success": True,
            "validation_result": result
        }
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets")
async def get_validation_presets():
    """
    Get available validation presets
    """
    try:
        presets = {}
        for level in ValidationLevel:
            if level != ValidationLevel.CUSTOM:
                config = ValidationConfig(level)
                presets[level.value] = config.get_validation_rules_summary()
        
        return {
            "success": True,
            "presets": presets
        }
        
    except Exception as e:
        logger.error(f"Failed to get validation presets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/presets/{level}")
async def apply_validation_preset(level: str):
    """
    Apply a validation preset
    
    Args:
        level: Validation level to apply (relaxed, standard, strict)
    """
    try:
        try:
            validation_level = ValidationLevel(level)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid validation level: {level}. Available: {[l.value for l in ValidationLevel]}"
            )
        
        set_validation_level(validation_level)
        config = get_validation_config()
        
        return {
            "success": True,
            "message": f"Applied {level} validation preset",
            "config": config.get_validation_rules_summary()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to apply validation preset: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules/description")
async def get_validation_rules_description():
    """
    Get human-readable description of validation rules
    """
    try:
        config = get_validation_config()
        rules = config.get_validation_rules_summary()
        
        description = {
            "rest_periods": {
                "title": "Rest Periods",
                "description": f"Workers must have at least {rules['rest_periods']['minimum_rest_hours']} hours rest between shifts",
                "strict_mode": rules['rest_periods']['strict_validation']
            },
            "work_limits": {
                "title": "Work Limits",
                "description": f"Maximum {rules['work_limits']['max_continuous_hours']}h continuous, {rules['work_limits']['max_daily_hours']}h daily, {rules['work_limits']['max_weekly_hours']}h weekly"
            },
            "split_shifts": {
                "title": "Split Shifts",
                "description": f"Split shifts are {'allowed' if rules['split_shifts']['allowed'] else 'not allowed'}",
                "minimum_gap": f"{rules['split_shifts']['minimum_gap_hours']} hours minimum gap"
            },
            "overnight_shifts": {
                "title": "Overnight Shifts",
                "description": f"2:1 staffing is {'required' if rules['overnight_shifts']['staffing_required'] else 'not required'} for overnight shifts"
            }
        }
        
        return {
            "success": True,
            "rules": description,
            "current_level": rules['level']
        }
        
    except Exception as e:
        logger.error(f"Failed to get validation rules description: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_validation_rules(
    test_data: Dict[str, Any],
    workers: Dict[str, Any]
):
    """
    Test validation rules with sample data
    
    Args:
        test_data: Sample roster data to test
        workers: Worker data for testing
    """
    try:
        config = get_validation_config()
        validator = EnhancedValidationService(workers, config.get_config())
        result = validator.validate_roster_data(test_data)
        
        return {
            "success": True,
            "test_result": result,
            "config_used": config.get_validation_rules_summary()
        }
        
    except Exception as e:
        logger.error(f"Validation test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
