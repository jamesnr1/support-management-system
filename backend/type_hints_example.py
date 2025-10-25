"""Example of comprehensive type hints for backend modules"""

from typing import List, Dict, Optional, Any, Union, Tuple
from datetime import datetime, date, time
from pydantic import BaseModel

# ===== DATABASE MODULE TYPE HINTS =====

class WorkerAvailabilityRule(BaseModel):
    """Type hint for availability rule"""
    id: int
    worker_id: int
    weekday: int
    from_time: Optional[time]
    to_time: Optional[time]
    is_full_day: bool
    wraps_midnight: bool

class UnavailabilityPeriod(BaseModel):
    """Type hint for unavailability period"""
    id: int
    worker_id: int
    from_date: date
    to_date: date
    reason: str
    created_at: datetime
    updated_at: datetime

class SupportWorker(BaseModel):
    """Type hint for support worker"""
    id: int
    full_name: str
    code: str
    status: str
    phone: Optional[str]
    telegram: Optional[int]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

class Participant(BaseModel):
    """Type hint for participant"""
    id: int
    name: str
    code: str
    support_ratio: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

# ===== API RESPONSE TYPE HINTS =====

class APIResponse(BaseModel):
    """Standard API response format"""
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None

class WorkerListResponse(APIResponse):
    """Response for worker list endpoint"""
    data: List[SupportWorker]

class AvailabilityResponse(APIResponse):
    """Response for availability endpoint"""
    data: List[WorkerAvailabilityRule]

# ===== REQUEST TYPE HINTS =====

class WorkerCreateRequest(BaseModel):
    """Request for creating a worker"""
    full_name: str
    code: str
    phone: Optional[str] = None
    telegram: Optional[int] = None

class AvailabilityUpdateRequest(BaseModel):
    """Request for updating availability"""
    rules: List[Dict[str, Any]]

class ShiftCreateRequest(BaseModel):
    """Request for creating a shift"""
    workers: List[int]
    start_time: Optional[time]
    end_time: Optional[time]
    is_full_day: bool
    location: int
    notes: Optional[str] = None

# ===== UTILITY TYPE HINTS =====

def get_worker_availability(worker_id: int) -> List[WorkerAvailabilityRule]:
    """Get availability rules for a worker with type hints"""
    pass

def save_availability_rules(worker_id: int, rules: List[Dict[str, Any]]) -> bool:
    """Save availability rules with type hints"""
    pass

def calculate_worker_hours(worker_id: int, week_type: str) -> float:
    """Calculate worker hours with type hints"""
    pass

def validate_shift_data(shift_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate shift data with type hints"""
    pass

# ===== CONFIGURATION TYPE HINTS =====

class DatabaseConfig(BaseModel):
    """Database configuration with type hints"""
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    echo: bool = False

class CacheConfig(BaseModel):
    """Cache configuration with type hints"""
    redis_url: str
    default_ttl: int = 300
    max_connections: int = 10

class APIConfig(BaseModel):
    """API configuration with type hints"""
    title: str
    version: str
    description: str
    debug: bool = False
    cors_origins: List[str] = []

# ===== ERROR TYPE HINTS =====

class ValidationError(Exception):
    """Custom validation error with type hints"""
    def __init__(self, message: str, field: Optional[str] = None):
        self.message = message
        self.field = field
        super().__init__(message)

class DatabaseError(Exception):
    """Custom database error with type hints"""
    def __init__(self, message: str, query: Optional[str] = None):
        self.message = message
        self.query = query
        super().__init__(message)

# ===== EXAMPLE USAGE =====

def example_typed_function(
    worker_id: int,
    availability_data: List[Dict[str, Any]],
    validate: bool = True
) -> Tuple[bool, Optional[str]]:
    """
    Example function with comprehensive type hints
    
    Args:
        worker_id: The ID of the worker
        availability_data: List of availability rules
        validate: Whether to validate the data
        
    Returns:
        Tuple of (success, error_message)
    """
    if validate:
        for rule in availability_data:
            if not isinstance(rule.get('weekday'), int):
                return False, "Invalid weekday format"
    
    # Process the data
    success = save_availability_rules(worker_id, availability_data)
    return success, None if success else "Failed to save availability rules"
