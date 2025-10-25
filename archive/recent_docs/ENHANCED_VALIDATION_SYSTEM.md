# Enhanced Validation System

## Overview

The Enhanced Validation System provides a comprehensive, configurable validation framework for roster data with improved conflict detection, flexible rest periods, and support for intentional split shifts.

## Key Improvements

### 1. **Enhanced Conflict Detection**
- **Combined Logic**: Merges overlap and back-to-back shift checks into a single, more efficient process
- **Intentional Split Shifts**: Supports planned split shifts with proper flagging
- **Participant-Aware**: Distinguishes between conflicts (different participants) and split shifts (same participant)
- **Funding Category Support**: Recognizes valid split shifts with different funding categories

### 2. **Flexible Rest Period Validation**
- **Configurable Minimums**: Adjustable rest period requirements (default: 8 hours)
- **Strict vs. Relaxed Modes**: Choose between hard errors or warnings for rest violations
- **Context-Aware**: Considers shift duration and timing for appropriate warnings
- **Overnight Handling**: Properly calculates rest periods across midnight

### 3. **Configurable Validation Levels**
- **Relaxed**: Minimal restrictions (4h rest, 50h weekly max)
- **Standard**: Balanced rules (8h rest, 40h weekly max) - **Default**
- **Strict**: Maximum compliance (12h rest, 35h weekly max)
- **Custom**: Fully configurable parameters

## Architecture

### Backend Components

#### 1. Enhanced Validation Service
```python
# backend/services/enhanced_validation_service.py
class EnhancedValidationService:
    def validate_roster_data(self, roster_data: Dict[str, Any]) -> Dict[str, Any]
    def check_worker_conflicts(self, roster_data: Dict[str, Any])
    def check_rest_periods(self, roster_data: Dict[str, Any])
    def check_continuous_hours(self, roster_data: Dict[str, Any])
    def check_weekly_limits(self, roster_data: Dict[str, Any])
    def check_overnight_staffing(self, roster_data: Dict[str, Any])
```

#### 2. Validation Configuration
```python
# backend/services/validation_config.py
class ValidationConfig:
    def __init__(self, level: ValidationLevel, custom_config: Optional[Dict])
    def update_config(self, updates: Dict[str, Any])
    def validate_config(self) -> Dict[str, Any]
    def get_validation_rules_summary(self) -> Dict[str, Any]
```

#### 3. API Endpoints
```python
# backend/api/routes/validation.py
GET    /api/validation/config          # Get current configuration
PUT    /api/validation/config          # Update configuration
POST   /api/validation/validate        # Validate roster data
GET    /api/validation/presets         # Get available presets
POST   /api/validation/presets/{level} # Apply preset
GET    /api/validation/rules/description # Get rule descriptions
POST   /api/validation/test            # Test validation rules
```

### Frontend Components

#### 1. Validation Configuration UI
```jsx
// frontend/src/components/validation/ValidationConfig.jsx
<ValidationConfig />
```

#### 2. Validation Results Display
```jsx
// frontend/src/components/validation/ValidationResults.jsx
<ValidationResults validationResult={result} onClose={handleClose} />
```

## Configuration Options

### Core Parameters

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| `min_rest_hours` | Minimum rest between shifts | 8 | 0-24 |
| `max_continuous_hours` | Maximum continuous work | 12 | 1-24 |
| `max_daily_hours` | Maximum hours per day | 16 | 1-24 |
| `max_weekly_hours` | Maximum hours per week | 40 | 1-80 |
| `allow_split_shifts` | Allow intentional split shifts | true | boolean |
| `min_split_shift_gap` | Minimum gap between split shifts | 1 | 0-24 |
| `strict_rest_validation` | Enforce rest rules strictly | false | boolean |
| `overnight_staffing_required` | Require 2:1 for overnight | true | boolean |

### Environment Variables

```bash
# Validation Configuration
VALIDATION_MIN_REST_HOURS=8
VALIDATION_MAX_CONTINUOUS_HOURS=12
VALIDATION_MAX_DAILY_HOURS=16
VALIDATION_MAX_WEEKLY_HOURS=40
VALIDATION_ALLOW_SPLIT_SHIFTS=true
VALIDATION_MIN_SPLIT_GAP=1
VALIDATION_STRICT_REST=true
VALIDATION_OVERNIGHT_STAFFING=true
```

## Usage Examples

### 1. Basic Validation
```python
from services.enhanced_validation_service import EnhancedValidationService

# Create validator with default configuration
validator = EnhancedValidationService(workers_data)
result = validator.validate_roster_data(roster_data)

print(f"Valid: {result['valid']}")
print(f"Errors: {len(result['errors'])}")
print(f"Warnings: {len(result['warnings'])}")
```

### 2. Custom Configuration
```python
from services.validation_config import ValidationConfig, ValidationLevel

# Create custom configuration
custom_config = {
    'min_rest_hours': 10,
    'max_weekly_hours': 45,
    'strict_rest_validation': True
}

config = ValidationConfig(ValidationLevel.CUSTOM, custom_config)
validator = EnhancedValidationService(workers_data, config.get_config())
```

### 3. API Usage
```javascript
// Get current configuration
const response = await fetch('/api/validation/config');
const config = await response.json();

// Update configuration
await fetch('/api/validation/config', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    level: 'strict',
    updates: { min_rest_hours: 12 }
  })
});

// Validate roster data
const validationResult = await fetch('/api/validation/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roster_data: rosterData,
    workers: workersData
  })
});
```

## Validation Rules

### 1. Worker Conflicts
- **Different Participants**: Overlapping shifts for different participants = ERROR
- **Same Participant**: 
  - Overlapping times = ERROR
  - Back-to-back with different funding = INFO (valid split shift)
  - Back-to-back with same funding = WARNING (verify intentional)
  - Gap < minimum = WARNING

### 2. Rest Periods
- **Same Day**: Gap between shifts must meet minimum requirement
- **Overnight**: Rest period calculated across midnight
- **Strict Mode**: Insufficient rest = ERROR
- **Relaxed Mode**: Insufficient rest = WARNING

### 3. Work Limits
- **Continuous**: Maximum hours without break
- **Daily**: Maximum hours per day
- **Weekly**: Maximum hours per week (per worker)
- **Worker-Specific**: Respects individual worker limits

### 4. Overnight Staffing
- **2:1 Ratio**: Overnight shifts (10PM-6AM) require 2:1 staffing
- **Configurable**: Can be disabled for specific needs

## Migration from Legacy System

### Backward Compatibility
The enhanced system maintains full backward compatibility:

```python
# Legacy function still works
from validation_rules import validate_roster_data

result = validate_roster_data(roster_data, workers_data)
# Now uses enhanced validation internally
```

### Gradual Migration
1. **Phase 1**: Deploy enhanced system alongside legacy
2. **Phase 2**: Update API calls to use new endpoints
3. **Phase 3**: Remove legacy validation code

## Testing

### Unit Tests
```bash
# Run validation tests
cd backend
python -m pytest tests/test_enhanced_validation.py -v
```

### Test Coverage
- Worker conflict detection
- Rest period validation
- Work limit enforcement
- Configuration management
- API endpoint functionality

## Performance Considerations

### Optimizations
- **Efficient Scheduling**: O(n log n) complexity for conflict detection
- **Caching**: Configuration cached in memory
- **Batch Processing**: Multiple validations in single request
- **Lazy Loading**: Configuration loaded on demand

### Monitoring
- **Validation Metrics**: Track validation frequency and results
- **Performance Logging**: Monitor validation execution time
- **Error Tracking**: Sentry integration for validation failures

## Future Enhancements

### Planned Features
1. **Machine Learning**: Predictive validation based on historical data
2. **Real-time Validation**: Live validation as users edit rosters
3. **Custom Rules**: User-defined validation rules
4. **Audit Trail**: Track validation rule changes
5. **Integration**: Connect with external compliance systems

### API Extensions
- **Webhook Support**: Notify external systems of validation results
- **Bulk Validation**: Validate multiple rosters simultaneously
- **Validation History**: Track validation results over time
- **Export Reports**: Generate compliance reports

## Troubleshooting

### Common Issues

#### 1. Configuration Not Applied
```bash
# Check environment variables
echo $VALIDATION_MIN_REST_HOURS

# Verify API response
curl -X GET http://localhost:8000/api/validation/config
```

#### 2. Validation Errors
```python
# Enable debug logging
import logging
logging.getLogger('services.enhanced_validation_service').setLevel(logging.DEBUG)
```

#### 3. Performance Issues
```python
# Profile validation performance
import time
start = time.time()
result = validator.validate_roster_data(roster_data)
print(f"Validation took {time.time() - start:.2f} seconds")
```

### Support
- **Documentation**: This file and inline code comments
- **Logs**: Check application logs for detailed error information
- **API**: Use `/api/validation/test` endpoint for debugging
- **Configuration**: Use `/api/validation/config` to verify settings

## Conclusion

The Enhanced Validation System provides a robust, flexible, and maintainable solution for roster validation. It addresses the limitations of the legacy system while maintaining backward compatibility and providing a clear migration path.

Key benefits:
- **Improved Accuracy**: Better conflict detection and split shift handling
- **Flexibility**: Configurable rules for different operational needs
- **Maintainability**: Clean, modular architecture
- **Performance**: Optimized algorithms and efficient processing
- **User Experience**: Clear feedback and intuitive configuration

The system is production-ready and provides a solid foundation for future enhancements and compliance requirements.
