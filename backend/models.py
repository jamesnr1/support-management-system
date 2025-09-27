from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
import uuid

class Worker(BaseModel):
    id: Optional[int] = None
    code: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "Active"
    max_hours: Optional[int] = None
    car: Optional[str] = None
    skills: Optional[str] = None
    sex: Optional[str] = None
    telegram: Optional[int] = None
    digital_signature: Optional[str] = None

class WorkerCreate(BaseModel):
    code: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    max_hours: Optional[int] = None
    car: Optional[str] = None
    skills: Optional[str] = None
    sex: Optional[str] = None
    telegram: Optional[int] = None

class AvailabilityRule(BaseModel):
    id: Optional[int] = None
    worker_id: int
    weekday: int  # 0=Sunday, 1=Monday, etc.
    from_time: Optional[time] = None
    to_time: Optional[time] = None
    is_full_day: bool = False
    wraps_midnight: bool = False

class UnavailabilityPeriod(BaseModel):
    id: Optional[int] = None
    worker_id: int
    from_date: date
    to_date: date
    reason: str
    created_at: Optional[datetime] = None

class Participant(BaseModel):
    id: Optional[int] = None
    code: str
    full_name: str
    participant_number: Optional[str] = None
    location_id: Optional[int] = None
    default_ratio: Optional[str] = None
    plan_start: Optional[date] = None
    plan_end: Optional[date] = None

class Shift(BaseModel):
    id: Optional[int] = None
    shift_number: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location_id: Optional[int] = None
    status: str = "Scheduled"
    ratio_workers: int = 1
    ratio_participants: int = 1
    support_type: str = "Self-Care"

class ShiftWorker(BaseModel):
    id: Optional[int] = None
    shift_id: int
    worker_id: int
    role: Optional[str] = None
    alloc_status: str = "Assigned"

class WorkerAvailabilityCheck(BaseModel):
    worker_id: int
    shift_start: datetime
    shift_end: datetime

class ConflictCheck(BaseModel):
    worker_id: int
    shift_date: str
    start_time: str
    end_time: str

class HoursCalculation(BaseModel):
    worker_id: int
    weekA: float = 0
    weekB: float = 0
    nextA: float = 0
    nextB: float = 0
    total: float = 0

class RosterState(BaseModel):
    rosters: Dict[str, Dict[str, Dict[str, List[Dict[str, Any]]]]] = {}
    participants: List[Participant] = []
    workers: List[Worker] = []
    locations: List[Dict[str, Any]] = []
    workerHours: Dict[str, HoursCalculation] = {}

class TelegramMessage(BaseModel):
    worker_id: int
    message: str
    urgent: bool = False