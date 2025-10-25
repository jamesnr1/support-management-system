"""
Batch validation service for validating multiple shifts at once
"""
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json

from .enhanced_validation_service import EnhancedValidationService
from .smart_validation import SmartValidationEngine, SmartValidationResult
from .shift_templates import ShiftTemplateManager
from .participant_validation_config import ParticipantValidationManager

logger = logging.getLogger(__name__)

@dataclass
class BatchValidationRequest:
    """Request for batch validation"""
    shifts: List[Dict[str, Any]]
    workers: Dict[str, Any]
    participants: Dict[str, Any]
    validation_options: Optional[Dict[str, Any]] = None
    template_validation: bool = True
    participant_specific: bool = True
    smart_validation: bool = True
    
    def __post_init__(self):
        if self.validation_options is None:
            self.validation_options = {}

@dataclass
class BatchValidationResult:
    """Result of batch validation"""
    request_id: str
    total_shifts: int
    validated_shifts: int
    failed_validations: int
    overall_status: str  # success, warning, error, critical
    results: List[Dict[str, Any]]
    summary: Dict[str, Any]
    processing_time: float
    created_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return asdict(self)

class BatchValidationService:
    """Service for batch validation of multiple shifts"""
    
    def __init__(self):
        self.enhanced_validator = EnhancedValidationService({})
        self.smart_engine = SmartValidationEngine()
        self.template_manager = ShiftTemplateManager()
        self.participant_manager = ParticipantValidationManager()
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def validate_batch(self, request: BatchValidationRequest) -> BatchValidationResult:
        """Validate a batch of shifts"""
        start_time = datetime.now()
        request_id = f"batch_{int(start_time.timestamp())}"
        
        logger.info(f"Starting batch validation {request_id} for {len(request.shifts)} shifts")
        
        try:
            # Prepare validation results
            results = []
            validated_count = 0
            failed_count = 0
            
            # Process shifts in parallel batches
            batch_size = 10  # Process 10 shifts at a time
            shift_batches = [request.shifts[i:i + batch_size] 
                           for i in range(0, len(request.shifts), batch_size)]
            
            for batch in shift_batches:
                batch_results = await self._validate_shift_batch(
                    batch, request.workers, request.participants, request
                )
                results.extend(batch_results)
                
                for result in batch_results:
                    if result.get('status') in ['success', 'warning']:
                        validated_count += 1
                    else:
                        failed_count += 1
            
            # Calculate overall status
            overall_status = self._calculate_overall_status(results)
            
            # Generate summary
            summary = self._generate_batch_summary(results)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            batch_result = BatchValidationResult(
                request_id=request_id,
                total_shifts=len(request.shifts),
                validated_shifts=validated_count,
                failed_validations=failed_count,
                overall_status=overall_status,
                results=results,
                summary=summary,
                processing_time=processing_time,
                created_at=start_time.isoformat()
            )
            
            logger.info(f"Batch validation {request_id} completed in {processing_time:.2f}s")
            return batch_result
            
        except Exception as e:
            logger.error(f"Batch validation {request_id} failed: {e}")
            raise
    
    async def _validate_shift_batch(self, shifts: List[Dict[str, Any]], 
                                  workers: Dict[str, Any], participants: Dict[str, Any],
                                  request: BatchValidationRequest) -> List[Dict[str, Any]]:
        """Validate a batch of shifts"""
        tasks = []
        
        for shift in shifts:
            task = self._validate_single_shift(shift, workers, participants, request)
            tasks.append(task)
        
        # Run validations in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Validation failed for shift {i}: {result}")
                processed_results.append({
                    'shift_id': shifts[i].get('id', f'shift_{i}'),
                    'status': 'error',
                    'error': str(result),
                    'validations': []
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def _validate_single_shift(self, shift: Dict[str, Any], 
                                   workers: Dict[str, Any], participants: Dict[str, Any],
                                   request: BatchValidationRequest) -> Dict[str, Any]:
        """Validate a single shift with all enabled validation types"""
        shift_id = shift.get('id', 'unknown')
        validations = []
        
        try:
            # Enhanced validation
            enhanced_result = await self._run_enhanced_validation(shift, workers, request)
            if enhanced_result:
                validations.append(enhanced_result)
            
            # Template validation
            if request.template_validation:
                template_result = await self._run_template_validation(shift)
                if template_result:
                    validations.append(template_result)
            
            # Participant-specific validation
            if request.participant_specific:
                participant_result = await self._run_participant_validation(shift, participants)
                if participant_result:
                    validations.append(participant_result)
            
            # Smart validation
            if request.smart_validation:
                smart_result = await self._run_smart_validation(shift, workers, participants)
                if smart_result:
                    validations.append(smart_result)
            
            # Determine overall status for this shift
            status = self._determine_shift_status(validations)
            
            return {
                'shift_id': shift_id,
                'status': status,
                'validations': validations,
                'summary': self._generate_shift_summary(validations)
            }
            
        except Exception as e:
            logger.error(f"Error validating shift {shift_id}: {e}")
            return {
                'shift_id': shift_id,
                'status': 'error',
                'error': str(e),
                'validations': []
            }
    
    async def _run_enhanced_validation(self, shift: Dict[str, Any], 
                                     workers: Dict[str, Any], 
                                     request: BatchValidationRequest) -> Optional[Dict[str, Any]]:
        """Run enhanced validation on a shift"""
        try:
            # Create roster data structure for single shift
            roster_data = {
                'data': {
                    shift.get('participant', 'unknown'): {
                        shift.get('date', 'unknown'): [shift]
                    }
                }
            }
            
            # Update validator with current workers
            self.enhanced_validator.workers = workers
            
            # Run validation
            result = self.enhanced_validator.validate_roster_data(roster_data)
            
            return {
                'type': 'enhanced',
                'status': 'success' if result['valid'] else 'error',
                'errors': result.get('errors', []),
                'warnings': result.get('warnings', []),
                'info': result.get('info', []),
                'summary': result.get('summary', {})
            }
            
        except Exception as e:
            logger.error(f"Enhanced validation failed: {e}")
            return {
                'type': 'enhanced',
                'status': 'error',
                'error': str(e)
            }
    
    async def _run_template_validation(self, shift: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Run template validation on a shift"""
        try:
            # Suggest best matching template
            suggested_template = self.template_manager.suggest_template(shift)
            
            if suggested_template:
                # Validate against suggested template
                template_results = self.template_manager.validate_shift_against_template(
                    shift, suggested_template
                )
                
                return {
                    'type': 'template',
                    'status': 'success',
                    'suggested_template': {
                        'id': suggested_template.id,
                        'name': suggested_template.name,
                        'description': suggested_template.description
                    },
                    'results': [result.to_dict() for result in template_results]
                }
            else:
                return {
                    'type': 'template',
                    'status': 'warning',
                    'message': 'No matching template found'
                }
                
        except Exception as e:
            logger.error(f"Template validation failed: {e}")
            return {
                'type': 'template',
                'status': 'error',
                'error': str(e)
            }
    
    async def _run_participant_validation(self, shift: Dict[str, Any], 
                                        participants: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Run participant-specific validation"""
        try:
            participant_id = shift.get('participant')
            if not participant_id:
                return None
            
            # Get participant configuration
            participant_config = self.participant_manager.get_participant_validation_rules(participant_id)
            
            # Validate shift against participant rules
            validation_results = self.participant_manager.validate_participant_shift(
                participant_id, shift, []
            )
            
            return {
                'type': 'participant',
                'status': 'success',
                'participant_id': participant_id,
                'participant_config': participant_config,
                'results': validation_results
            }
            
        except Exception as e:
            logger.error(f"Participant validation failed: {e}")
            return {
                'type': 'participant',
                'status': 'error',
                'error': str(e)
            }
    
    async def _run_smart_validation(self, shift: Dict[str, Any], 
                                  workers: Dict[str, Any], 
                                  participants: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Run smart validation on a shift"""
        try:
            # Get participant configuration
            participant_id = shift.get('participant')
            participant_config = None
            if participant_id:
                participant_config = self.participant_manager.get_participant_validation_rules(participant_id)
            
            # Run smart validation
            smart_results = self.smart_engine.validate_shift(shift, [], participant_config)
            
            # Generate summary
            summary = self.smart_engine.get_validation_summary(smart_results)
            
            return {
                'type': 'smart',
                'status': summary['status'],
                'results': [result.to_dict() for result in smart_results],
                'summary': summary
            }
            
        except Exception as e:
            logger.error(f"Smart validation failed: {e}")
            return {
                'type': 'smart',
                'status': 'error',
                'error': str(e)
            }
    
    def _determine_shift_status(self, validations: List[Dict[str, Any]]) -> str:
        """Determine overall status for a shift based on all validations"""
        if not validations:
            return 'success'
        
        # Check for critical errors
        for validation in validations:
            if validation.get('status') == 'critical':
                return 'critical'
        
        # Check for errors
        for validation in validations:
            if validation.get('status') == 'error':
                return 'error'
        
        # Check for warnings
        for validation in validations:
            if validation.get('status') == 'warning':
                return 'warning'
        
        return 'success'
    
    def _generate_shift_summary(self, validations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary for a single shift"""
        summary = {
            'total_validations': len(validations),
            'errors': 0,
            'warnings': 0,
            'info': 0,
            'critical': 0
        }
        
        for validation in validations:
            status = validation.get('status', 'success')
            if status == 'critical':
                summary['critical'] += 1
            elif status == 'error':
                summary['errors'] += 1
            elif status == 'warning':
                summary['warnings'] += 1
            elif status == 'info':
                summary['info'] += 1
        
        return summary
    
    def _calculate_overall_status(self, results: List[Dict[str, Any]]) -> str:
        """Calculate overall status for the batch"""
        if not results:
            return 'success'
        
        # Check for any critical issues
        for result in results:
            if result.get('status') == 'critical':
                return 'critical'
        
        # Check for any errors
        for result in results:
            if result.get('status') == 'error':
                return 'error'
        
        # Check for any warnings
        for result in results:
            if result.get('status') == 'warning':
                return 'warning'
        
        return 'success'
    
    def _generate_batch_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary for the entire batch"""
        summary = {
            'total_shifts': len(results),
            'successful': 0,
            'warnings': 0,
            'errors': 0,
            'critical': 0,
            'validation_types': {
                'enhanced': 0,
                'template': 0,
                'participant': 0,
                'smart': 0
            },
            'common_issues': {},
            'processing_stats': {}
        }
        
        for result in results:
            status = result.get('status', 'success')
            if status == 'success':
                summary['successful'] += 1
            elif status == 'warning':
                summary['warnings'] += 1
            elif status == 'error':
                summary['errors'] += 1
            elif status == 'critical':
                summary['critical'] += 1
            
            # Count validation types
            for validation in result.get('validations', []):
                validation_type = validation.get('type', 'unknown')
                summary['validation_types'][validation_type] = summary['validation_types'].get(validation_type, 0) + 1
        
        return summary
    
    def get_validation_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get validation history (would be implemented with database storage)"""
        # This would typically query a database for historical validation results
        return []
    
    def cleanup_old_results(self, days_old: int = 30):
        """Clean up old validation results"""
        # This would typically clean up old results from database storage
        logger.info(f"Cleaning up validation results older than {days_old} days")


# Global batch validation service instance
_batch_validation_service = None

def get_batch_validation_service() -> BatchValidationService:
    """Get the global batch validation service instance"""
    global _batch_validation_service
    if _batch_validation_service is None:
        _batch_validation_service = BatchValidationService()
    return _batch_validation_service
