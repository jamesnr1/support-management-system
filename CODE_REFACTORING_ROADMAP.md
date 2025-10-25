# CODE REFACTORING ROADMAP - Specific Implementation Examples

**Purpose:** Detailed code examples for major refactoring tasks  
**Timeline:** Weeks 3-6 (after security fixes)  
**Effort:** 3-4 weeks  

---

## 1. 🗂️ SPLIT server.py INTO MODULES

### Current Problem:
`backend/server.py` is 1500+ lines with everything in one file.

### New Structure:

```
backend/
├── api/
│   ├── __init__.py
│   ├── dependencies.py
│   └── routes/
│       ├── __init__.py
│       ├── roster.py      # Roster endpoints
│       ├── workers.py     # Worker management
│       ├── shifts.py      # Shift CRUD
│       ├── participants.py # Participant endpoints
│       └── calendar.py    # Google Calendar integration
├── services/
│   ├── roster_service.py
│   ├── validation_service.py
│   └── notification_service.py
├── core/
│   ├── config.py
│   ├── security.py
│   └── logging_config.py
└── main.py
```

### Step 1: Create api/dependencies.py

```python
"""Shared dependencies for all routes"""
from fastapi import Depends, HTTPException, Header
from typing import Optional
from database import SupabaseDatabase
import os

# Database dependency
_db_instance = None

def get_db() -> SupabaseDatabase:
    """Get database instance (singleton)"""
    global _db_instance
    if _db_instance is None:
        _db_instance = SupabaseDatabase()
    return _db_instance

# Authentication dependency
async def verify_admin_token(
    x_admin_token: Optional[str] = Header(None)
) -> bool:
    """Verify admin authentication token"""
    admin_secret = os.getenv("ADMIN_SECRET_KEY")
    if not admin_secret or x_admin_token != admin_secret:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing admin token"
        )
    return True

# Optional auth for read-only endpoints
async def optional_auth(
    x_admin_token: Optional[str] = Header(None)
) -> bool:
    """Optional authentication for read endpoints"""
    return x_admin_token == os.getenv("ADMIN_SECRET_KEY")
```

### Step 2: Create api/routes/workers.py

```python
"""Worker management endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from datetime import datetime

from api.dependencies import get_db, verify_admin_token, optional_auth
from database import SupabaseDatabase
from models import Worker, WorkerCreate, AvailabilityRule

router = APIRouter(prefix="/api/workers", tags=["workers"])

@router.get("/", response_model=List[Worker])
async def get_workers(
    db: SupabaseDatabase = Depends(get_db),
    is_admin: bool = Depends(optional_auth)
):
    """Get all workers"""
    workers = db.get_workers()
    
    # Hide sensitive data for non-admin users
    if not is_admin:
        for worker in workers:
            worker.pop('telegram_id', None)
            worker.pop('phone', None)
    
    return workers

@router.get("/{worker_id}", response_model=Worker)
async def get_worker(
    worker_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get specific worker by ID"""
    worker = db.get_worker(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker

@router.post("/", response_model=Worker, dependencies=[Depends(verify_admin_token)])
async def create_worker(
    worker: WorkerCreate,
    db: SupabaseDatabase = Depends(get_db)
):
    """Create new worker (admin only)"""
    try:
        new_worker = db.create_worker(worker.dict())
        return new_worker
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{worker_id}", response_model=Worker, dependencies=[Depends(verify_admin_token)])
async def update_worker(
    worker_id: str,
    worker: WorkerCreate,
    db: SupabaseDatabase = Depends(get_db)
):
    """Update worker (admin only)"""
    try:
        updated_worker = db.update_worker(worker_id, worker.dict())
        if not updated_worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        return updated_worker
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{worker_id}", dependencies=[Depends(verify_admin_token)])
async def delete_worker(
    worker_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Soft delete worker (admin only)"""
    success = db.delete_worker(worker_id)
    if not success:
        raise HTTPException(status_code=404, detail="Worker not found")
    return {"status": "deleted", "worker_id": worker_id}

@router.get("/{worker_id}/availability")
async def get_worker_availability(
    worker_id: str,
    db: SupabaseDatabase = Depends(get_db)
):
    """Get worker's availability schedule"""
    availability = db.get_worker_availability(worker_id)
    return availability

@router.put("/{worker_id}/availability", dependencies=[Depends(verify_admin_token)])
async def update_worker_availability(
    worker_id: str,
    availability: List[AvailabilityRule],
    db: SupabaseDatabase = Depends(get_db)
):
    """Update worker's availability (admin only)"""
    try:
        updated = db.update_worker_availability(worker_id, availability)
        return {"status": "updated", "worker_id": worker_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Step 3: Create services/roster_service.py

```python
"""Business logic for roster operations"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from database import SupabaseDatabase
from services.validation_service import ValidationService
import structlog

logger = structlog.get_logger()

class RosterService:
    """Service for roster business logic"""
    
    def __init__(self, db: SupabaseDatabase):
        self.db = db
        self.validator = ValidationService(db)
    
    def get_week_roster(
        self, 
        week_start: datetime,
        participant_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get roster for specific week"""
        week_end = week_start + timedelta(days=7)
        
        # Get all shifts for the week
        shifts = self.db.get_shifts_by_date_range(
            week_start.date(),
            week_end.date()
        )
        
        # Filter by participants if specified
        if participant_ids:
            shifts = [s for s in shifts if s['participant_id'] in participant_ids]
        
        # Group by participant and date
        roster = self._group_shifts_by_participant_and_date(shifts)
        
        # Calculate statistics
        stats = self._calculate_week_stats(shifts)
        
        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "roster": roster,
            "statistics": stats
        }
    
    def create_shift(
        self,
        shift_data: Dict[str, Any],
        validate: bool = True
    ) -> Dict[str, Any]:
        """Create a new shift with validation"""
        
        # Validate if requested
        if validate:
            validation_result = self.validator.validate_new_shift(shift_data)
            if not validation_result['valid']:
                raise ValueError(f"Validation failed: {validation_result['errors']}")
        
        # Create shift
        try:
            new_shift = self.db.create_shift(shift_data)
            
            logger.info("shift_created",
                shift_id=new_shift['id'],
                participant=shift_data.get('participant_id'),
                date=shift_data.get('shift_date'),
                duration=shift_data.get('duration')
            )
            
            return new_shift
            
        except Exception as e:
            logger.error("shift_creation_failed",
                error=str(e),
                shift_data=shift_data
            )
            raise
    
    def update_shift(
        self,
        shift_id: str,
        updates: Dict[str, Any],
        validate: bool = True
    ) -> Dict[str, Any]:
        """Update existing shift with validation"""
        
        # Get existing shift
        existing_shift = self.db.get_shift(shift_id)
        if not existing_shift:
            raise ValueError(f"Shift {shift_id} not found")
        
        # Check if shift is locked
        if existing_shift.get('locked', False):
            raise ValueError(f"Shift {shift_id} is locked and cannot be modified")
        
        # Merge updates
        updated_data = {**existing_shift, **updates}
        
        # Validate if requested
        if validate:
            validation_result = self.validator.validate_shift_update(
                shift_id,
                updated_data
            )
            if not validation_result['valid']:
                raise ValueError(f"Validation failed: {validation_result['errors']}")
        
        # Update shift
        try:
            updated_shift = self.db.update_shift(shift_id, updates)
            
            logger.info("shift_updated",
                shift_id=shift_id,
                updates=list(updates.keys())
            )
            
            return updated_shift
            
        except Exception as e:
            logger.error("shift_update_failed",
                shift_id=shift_id,
                error=str(e)
            )
            raise
    
    def _group_shifts_by_participant_and_date(
        self,
        shifts: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, List[Dict]]]:
        """Group shifts by participant code and date"""
        grouped = {}
        
        for shift in shifts:
            participant_id = shift['participant_id']
            shift_date = shift['shift_date']
            
            if participant_id not in grouped:
                grouped[participant_id] = {}
            
            if shift_date not in grouped[participant_id]:
                grouped[participant_id][shift_date] = []
            
            grouped[participant_id][shift_date].append(shift)
        
        return grouped
    
    def _calculate_week_stats(
        self,
        shifts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate statistics for the week"""
        total_hours = sum(float(s.get('duration', 0)) for s in shifts)
        total_shifts = len(shifts)
        
        # Worker hours
        worker_hours = {}
        for shift in shifts:
            for worker_id in shift.get('workers', []):
                worker_hours[worker_id] = worker_hours.get(worker_id, 0) + float(shift.get('duration', 0))
        
        return {
            "total_hours": total_hours,
            "total_shifts": total_shifts,
            "unique_workers": len(worker_hours),
            "worker_hours": worker_hours
        }
```

### Step 4: Update main.py

```python
"""Main FastAPI application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from core.config import get_settings
from core.logging_config import setup_logging
from core.security import setup_security

# Import routers
from api.routes import workers, shifts, roster, participants, calendar

# Setup logging
setup_logging()

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    logger.info("application_starting")
    yield
    # Shutdown
    logger.info("application_shutdown")

# Create app
app = FastAPI(
    title="Support Management API",
    version="2.0.0",
    lifespan=lifespan
)

# Setup security and middleware
setup_security(app)

# Include routers
app.include_router(workers.router)
app.include_router(shifts.router)
app.include_router(roster.router)
app.include_router(participants.router)
app.include_router(calendar.router)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 2. 🎨 REFACTOR FRONTEND COMPONENTS

### Current Problem:
`RosteringSystem.js` is 1200+ lines with everything mixed together.

### New Structure:

```
frontend/src/
├── components/
│   ├── roster/
│   │   ├── RosterView.jsx
│   │   ├── WeekSelector.jsx
│   │   ├── ParticipantCard.jsx
│   │   ├── ShiftList.jsx
│   │   └── EditShiftModal.jsx
│   ├── workers/
│   │   ├── WorkerList.jsx
│   │   ├── WorkerCard.jsx
│   │   └── AvailabilityModal.jsx
│   └── common/
│       ├── Button.jsx
│       ├── Modal.jsx
│       └── LoadingSpinner.jsx
├── contexts/
│   └── RosterContext.jsx
├── hooks/
│   ├── useRoster.js
│   ├── useWorkers.js
│   └── useValidation.js
└── api/
    └── client.js
```

### Example: RosterContext.jsx

```javascript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';
import { toast } from 'sonner';

const RosterContext = createContext();

export function RosterProvider({ children }) {
  const [roster, setRoster] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load roster for specific week
  const loadRoster = useCallback(async (weekStart) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/roster?week=${weekStart}`);
      setRoster(response.data);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load workers
  const loadWorkers = useCallback(async () => {
    try {
      const response = await api.get('/api/workers');
      setWorkers(response.data);
    } catch (err) {
      toast.error('Failed to load workers');
    }
  }, []);

  // Create shift
  const createShift = useCallback(async (shiftData) => {
    try {
      const response = await api.post('/api/shifts', shiftData);
      
      // Update local state
      setRoster(prev => ({
        ...prev,
        shifts: [...prev.shifts, response.data]
      }));
      
      toast.success('Shift created successfully');
      return response.data;
    } catch (err) {
      toast.error(`Failed to create shift: ${err.message}`);
      throw err;
    }
  }, []);

  // Update shift
  const updateShift = useCallback(async (shiftId, updates) => {
    try {
      const response = await api.put(`/api/shifts/${shiftId}`, updates);
      
      // Update local state
      setRoster(prev => ({
        ...prev,
        shifts: prev.shifts.map(s => 
          s.id === shiftId ? response.data : s
        )
      }));
      
      toast.success('Shift updated successfully');
      return response.data;
    } catch (err) {
      toast.error(`Failed to update shift: ${err.message}`);
      throw err;
    }
  }, []);

  // Delete shift
  const deleteShift = useCallback(async (shiftId) => {
    try {
      await api.delete(`/api/shifts/${shiftId}`);
      
      // Update local state
      setRoster(prev => ({
        ...prev,
        shifts: prev.shifts.filter(s => s.id !== shiftId)
      }));
      
      toast.success('Shift deleted successfully');
    } catch (err) {
      toast.error(`Failed to delete shift: ${err.message}`);
      throw err;
    }
  }, []);

  const value = {
    roster,
    workers,
    loading,
    error,
    loadRoster,
    loadWorkers,
    createShift,
    updateShift,
    deleteShift
  };

  return (
    <RosterContext.Provider value={value}>
      {children}
    </RosterContext.Provider>
  );
}

export function useRoster() {
  const context = useContext(RosterContext);
  if (!context) {
    throw new Error('useRoster must be used within RosterProvider');
  }
  return context;
}
```

### Example: ParticipantCard.jsx

```javascript
import React, { useMemo } from 'react';
import { Card, CardHeader, CardContent } from './ui/card';
import { ShiftList } from './ShiftList';
import { useRoster } from '../contexts/RosterContext';

export const ParticipantCard = React.memo(({ participant, date }) => {
  const { roster } = useRoster();

  // Memoize filtered shifts
  const shiftsForDay = useMemo(() => {
    if (!roster?.shifts) return [];
    
    return roster.shifts.filter(shift => 
      shift.participant_id === participant.id &&
      shift.shift_date === date
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [roster?.shifts, participant.id, date]);

  // Calculate daily hours
  const totalHours = useMemo(() => {
    return shiftsForDay.reduce((sum, shift) => sum + (shift.duration || 0), 0);
  }, [shiftsForDay]);

  return (
    <Card className="participant-card">
      <CardHeader>
        <h3>{participant.full_name}</h3>
        <span className="text-sm text-gray-500">
          {totalHours.toFixed(1)}h scheduled
        </span>
      </CardHeader>
      
      <CardContent>
        <ShiftList 
          shifts={shiftsForDay}
          participantId={participant.id}
        />
      </CardContent>
    </Card>
  );
});

ParticipantCard.displayName = 'ParticipantCard';
```

---

## 3. 🧪 ADD COMPREHENSIVE TESTS

### Backend Tests

```python
# tests/test_roster_service.py
import pytest
from datetime import datetime, timedelta
from services.roster_service import RosterService
from database import SupabaseDatabase

@pytest.fixture
def roster_service(mock_db):
    """Fixture for RosterService with mock database"""
    return RosterService(mock_db)

@pytest.fixture
def sample_shift():
    """Fixture for sample shift data"""
    return {
        'participant_id': '1',
        'shift_date': '2025-10-25',
        'start_time': '09:00',
        'end_time': '17:00',
        'duration': 8.0,
        'workers': ['worker-1', 'worker-2'],
        'ratio': '2:1'
    }

def test_create_shift_success(roster_service, sample_shift):
    """Test successful shift creation"""
    result = roster_service.create_shift(sample_shift)
    
    assert result is not None
    assert result['participant_id'] == '1'
    assert result['duration'] == 8.0

def test_create_shift_validation_fails(roster_service):
    """Test shift creation with invalid data"""
    invalid_shift = {
        'participant_id': '1',
        'start_time': '17:00',  # End before start!
        'end_time': '09:00',
        'workers': []  # No workers!
    }
    
    with pytest.raises(ValueError, match="Validation failed"):
        roster_service.create_shift(invalid_shift)

def test_update_locked_shift_fails(roster_service):
    """Test that locked shifts cannot be updated"""
    locked_shift_id = 'shift-1'
    
    with pytest.raises(ValueError, match="is locked"):
        roster_service.update_shift(
            locked_shift_id,
            {'start_time': '10:00'}
        )

def test_calculate_week_stats(roster_service):
    """Test week statistics calculation"""
    shifts = [
        {'duration': 8.0, 'workers': ['w1']},
        {'duration': 6.0, 'workers': ['w1', 'w2']},
        {'duration': 4.0, 'workers': ['w2']},
    ]
    
    stats = roster_service._calculate_week_stats(shifts)
    
    assert stats['total_hours'] == 18.0
    assert stats['total_shifts'] == 3
    assert stats['unique_workers'] == 2
    assert stats['worker_hours']['w1'] == 14.0  # 8 + 6
    assert stats['worker_hours']['w2'] == 10.0  # 6 + 4
```

### Frontend Tests

```javascript
// tests/ParticipantCard.test.jsx
import { render, screen } from '@testing-library/react';
import { ParticipantCard } from '../components/ParticipantCard';
import { RosterProvider } from '../contexts/RosterContext';

const mockRoster = {
  shifts: [
    {
      id: '1',
      participant_id: 'p1',
      shift_date: '2025-10-25',
      start_time: '09:00',
      end_time: '17:00',
      duration: 8.0
    },
    {
      id: '2',
      participant_id: 'p1',
      shift_date: '2025-10-25',
      start_time: '18:00',
      end_time: '22:00',
      duration: 4.0
    }
  ]
};

const mockParticipant = {
  id: 'p1',
  full_name: 'John Smith',
  code: 'JS001'
};

describe('ParticipantCard', () => {
  it('renders participant name', () => {
    render(
      <RosterProvider value={{ roster: mockRoster }}>
        <ParticipantCard 
          participant={mockParticipant} 
          date="2025-10-25" 
        />
      </RosterProvider>
    );
    
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('calculates total hours correctly', () => {
    render(
      <RosterProvider value={{ roster: mockRoster }}>
        <ParticipantCard 
          participant={mockParticipant} 
          date="2025-10-25" 
        />
      </RosterProvider>
    );
    
    expect(screen.getByText('12.0h scheduled')).toBeInTheDocument();
  });

  it('shows only shifts for correct date', () => {
    render(
      <RosterProvider value={{ roster: mockRoster }}>
        <ParticipantCard 
          participant={mockParticipant} 
          date="2025-10-26"  // Different date
        />
      </RosterProvider>
    );
    
    expect(screen.getByText('0.0h scheduled')).toBeInTheDocument();
  });
});
```

---

## 4. 🚀 CI/CD PIPELINE

### .github/workflows/ci.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('backend/requirements.txt') }}
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        run: |
          cd backend
          pytest --cov=. --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  backend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install linters
        run: |
          pip install black flake8 mypy
      
      - name: Run black
        run: |
          cd backend
          black --check .
      
      - name: Run flake8
        run: |
          cd backend
          flake8 . --max-line-length=100
      
      - name: Run mypy
        run: |
          cd backend
          mypy . --ignore-missing-imports

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
          cache-dependency-path: frontend/yarn.lock
      
      - name: Install dependencies
        run: |
          cd frontend
          yarn install --frozen-lockfile
      
      - name: Run tests
        run: |
          cd frontend
          yarn test --coverage --watchAll=false
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./frontend/coverage/coverage-final.json

  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
          cache-dependency-path: frontend/yarn.lock
      
      - name: Install dependencies
        run: |
          cd frontend
          yarn install --frozen-lockfile
      
      - name: Run ESLint
        run: |
          cd frontend
          yarn lint
      
      - name: Run Prettier
        run: |
          cd frontend
          yarn prettier --check .

  deploy-staging:
    needs: [backend-test, backend-lint, frontend-test, frontend-lint]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: echo "Deploy to staging environment"
      # Add actual deployment steps

  deploy-production:
    needs: [backend-test, backend-lint, frontend-test, frontend-lint]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploy to production environment"
      # Add actual deployment steps
```

---

## 📅 IMPLEMENTATION TIMELINE

### Week 1: Backend Refactoring
- Day 1-2: Create new folder structure
- Day 3-4: Split server.py into routes
- Day 5: Create service layer

### Week 2: Frontend Refactoring
- Day 1-2: Create RosterContext
- Day 3-4: Split RosteringSystem.js
- Day 5: Extract reusable components

### Week 3: Testing
- Day 1-2: Backend unit tests
- Day 3-4: Frontend unit tests
- Day 5: Integration tests

### Week 4: CI/CD & Polish
- Day 1-2: Set up GitHub Actions
- Day 3-4: Fix any issues found by tests
- Day 5: Documentation update

---

## ✅ SUCCESS METRICS

After refactoring:
- ✅ No files >300 lines
- ✅ Test coverage >70%
- ✅ CI/CD passing all checks
- ✅ All linters passing
- ✅ Response time <100ms (p95)
- ✅ Bundle size <500KB

---

**Remember:** Always create a new branch for refactoring and get code review before merging!