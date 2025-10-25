# IMMEDIATE ACTION PLAN - Quick Fixes (1-3 Days)

**Priority:** 🔴 CRITICAL  
**Time Required:** 2-3 days  
**Impact:** Prevents security breaches and data loss  

---

## 🚨 DAY 1: SECURITY EMERGENCY FIXES

### 1. Rotate ALL Credentials (1 hour)

#### Step 1: Supabase
```bash
# 1. Go to Supabase Dashboard → Settings → API
# 2. Click "Reset" on Service Role Key
# 3. Copy new key

# 2. Update .env file (DON'T commit)
SUPABASE_SERVICE_KEY=new_key_here

# 3. Update production environment variables
# Render: Dashboard → Environment → Add Variable
# Vercel: Settings → Environment Variables
```

#### Step 2: OpenAI
```bash
# 1. Go to https://platform.openai.com/api-keys
# 2. Revoke old key
# 3. Create new key

# Update .env
OPENAI_API_KEY=new_key_here
```

#### Step 3: Telegram
```bash
# 1. Message @BotFather on Telegram
# 2. Send /revoke_token
# 3. Generate new token

# Update .env
TELEGRAM_BOT_TOKEN=new_token_here
```

#### Step 4: Remove from Git History
```bash
# WARNING: This rewrites history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env frontend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team!)
git push origin --force --all
```

### 2. Add Basic Authentication (2 hours)

Create `backend/core/security.py`:
```python
from fastapi import HTTPException, Header
import os
from functools import wraps

ADMIN_SECRET = os.getenv("ADMIN_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")

async def verify_admin_token(x_admin_token: str = Header(None)):
    """Verify admin token from header"""
    if not x_admin_token or x_admin_token != ADMIN_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing admin token"
        )
    return True

# Add to .env
# ADMIN_SECRET_KEY=generate-strong-random-key-here
```

Update `backend/server.py`:
```python
from core.security import verify_admin_token
from fastapi import Depends

# Protect dangerous endpoints
@router.post("/roster/reset", dependencies=[Depends(verify_admin_token)])
async def reset_roster():
    ...

@router.delete("/shifts/{shift_id}", dependencies=[Depends(verify_admin_token)])
async def delete_shift(shift_id: str):
    ...

@router.put("/workers/{worker_id}", dependencies=[Depends(verify_admin_token)])
async def update_worker(worker_id: str):
    ...
```

### 3. Fix CORS (30 minutes)

Update `backend/server.py`:
```python
# Replace current CORS middleware
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,https://your-production-domain.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # NOT "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Add to .env for production
# ALLOWED_ORIGINS=https://your-production-domain.vercel.app
```

### 4. Add Rate Limiting (1 hour)

Install:
```bash
pip install slowapi
```

Add to `backend/server.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to endpoints
@router.get("/api/roster")
@limiter.limit("30/minute")  # More restrictive for data endpoints
async def get_roster(request: Request):
    ...

@router.post("/api/shifts")
@limiter.limit("10/minute")  # Even more restrictive for write operations
async def create_shift(request: Request):
    ...
```

---

## 📊 DAY 2: DATA PROTECTION

### 1. Set Up Database Backups (1 hour)

#### Automated Backups (Supabase):
```bash
# 1. Go to Supabase Dashboard → Database → Backups
# 2. Enable daily automated backups
# 3. Set retention to 30 days
```

#### Manual Backup Script:
Create `backend/scripts/backup_database.py`:
```python
#!/usr/bin/env python3
import os
from datetime import datetime
from supabase import create_client
import json

def backup_all_tables():
    """Backup all tables to JSON files"""
    client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")
    )
    
    backup_dir = f"backups/{datetime.now().strftime('%Y-%m-%d_%H-%M')}"
    os.makedirs(backup_dir, exist_ok=True)
    
    tables = ['participants', 'workers', 'shifts', 'worker_availability']
    
    for table in tables:
        data = client.table(table).select("*").execute()
        
        with open(f"{backup_dir}/{table}.json", 'w') as f:
            json.dump(data.data, f, indent=2, default=str)
        
        print(f"✅ Backed up {table}: {len(data.data)} records")
    
    print(f"\n📁 Backup saved to: {backup_dir}")

if __name__ == "__main__":
    backup_all_tables()
```

Run manually before major changes:
```bash
python backend/scripts/backup_database.py
```

### 2. Implement Soft Deletes (2 hours)

Add to database tables (run in Supabase SQL Editor):
```sql
-- Add deleted_at column to all tables
ALTER TABLE shifts ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE workers ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE participants ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE worker_availability ADD COLUMN deleted_at TIMESTAMP NULL;

-- Update all SELECT queries to exclude deleted records
CREATE OR REPLACE VIEW active_shifts AS
SELECT * FROM shifts WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_workers AS
SELECT * FROM workers WHERE deleted_at IS NULL;
```

Update `backend/database.py`:
```python
def delete_shift(self, shift_id: str):
    """Soft delete a shift"""
    return self.client.table('shifts').update({
        'deleted_at': datetime.now(timezone.utc).isoformat()
    }).eq('id', shift_id).execute()

def get_all_shifts(self, include_deleted: bool = False):
    """Get shifts, optionally including deleted ones"""
    query = self.client.table('shifts').select('*')
    
    if not include_deleted:
        query = query.is_('deleted_at', 'null')
    
    return query.execute()
```

### 3. Add Critical Indexes (30 minutes)

Run in Supabase SQL Editor:
```sql
-- Performance boost for common queries
CREATE INDEX IF NOT EXISTS idx_shifts_date 
ON shifts(shift_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_worker 
ON shifts USING GIN(workers) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_participant 
ON shifts(participant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_availability_worker_day 
ON worker_availability(worker_id, day_of_week);

-- Add index on deleted_at for soft delete queries
CREATE INDEX IF NOT EXISTS idx_shifts_deleted 
ON shifts(deleted_at);

-- Analyze tables after index creation
ANALYZE shifts;
ANALYZE workers;
ANALYZE participants;
```

### 4. Fix Foreign Key Constraints (1 hour)

```sql
-- Drop existing constraints
ALTER TABLE shifts 
DROP CONSTRAINT IF EXISTS shifts_participant_id_fkey;

ALTER TABLE shifts 
DROP CONSTRAINT IF EXISTS shifts_location_id_fkey;

-- Add with CASCADE
ALTER TABLE shifts
ADD CONSTRAINT shifts_participant_id_fkey
FOREIGN KEY (participant_id) 
REFERENCES participants(id) 
ON DELETE CASCADE;

ALTER TABLE shifts
ADD CONSTRAINT shifts_location_id_fkey
FOREIGN KEY (location_id) 
REFERENCES locations(id) 
ON DELETE SET NULL;

-- Add constraint for worker_availability
ALTER TABLE worker_availability
ADD CONSTRAINT worker_availability_worker_id_fkey
FOREIGN KEY (worker_id)
REFERENCES workers(id)
ON DELETE CASCADE;
```

---

## 🛡️ DAY 3: ERROR HANDLING & MONITORING

### 1. Add Structured Logging (2 hours)

Install:
```bash
pip install structlog python-json-logger
```

Create `backend/core/logging_config.py`:
```python
import structlog
import logging
from pythonjsonlogger import jsonlogger

def setup_logging():
    """Configure structured logging"""
    
    # JSON formatter for production
    logHandler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    )
    logHandler.setFormatter(formatter)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[logHandler]
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Usage in server.py
from core.logging_config import setup_logging

setup_logging()
logger = structlog.get_logger()

# Replace all print() statements with:
logger.info("shift_created", 
    shift_id=shift_id,
    participant=participant_code,
    worker=worker_name,
    duration=duration,
    date=shift_date
)
```

### 2. Add Health Check Endpoint (30 minutes)

Add to `backend/server.py`:
```python
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connection
        db_healthy = db.client is not None
        
        # Check if we can query
        test_query = db.client.table('workers').select('id').limit(1).execute()
        db_query_healthy = len(test_query.data) >= 0
        
        return {
            "status": "healthy" if db_healthy and db_query_healthy else "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {
                "connected": db_healthy,
                "can_query": db_query_healthy
            },
            "version": os.getenv("APP_VERSION", "unknown")
        }
    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/ready")
async def readiness_check():
    """Readiness check for load balancers"""
    return {"status": "ready"}
```

### 3. Add Global Error Handler (1 hour)

Add to `backend/server.py`:
```python
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions"""
    logger.error("unhandled_exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=True
    )
    
    # Don't expose internal errors to users
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again later.",
            "request_id": str(uuid.uuid4())  # For tracking
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with clear messages"""
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "Invalid request data",
            "details": exc.errors()
        }
    )

class BusinessLogicError(Exception):
    """Custom exception for business logic errors"""
    pass

@app.exception_handler(BusinessLogicError)
async def business_logic_handler(request: Request, exc: BusinessLogicError):
    """Handle business logic errors"""
    return JSONResponse(
        status_code=400,
        content={
            "error": "business_logic_error",
            "message": str(exc)
        }
    )
```

### 4. Set Up Error Tracking (1 hour)

Sign up for Sentry (free tier):
```bash
pip install sentry-sdk[fastapi]
```

Add to `backend/server.py`:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Initialize Sentry
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT", "development"),
    traces_sample_rate=0.1,  # 10% of transactions
    integrations=[FastApiIntegration()],
)

# Add to .env
# SENTRY_DSN=your-sentry-dsn-here
# ENVIRONMENT=production
```

---

## ✅ VERIFICATION CHECKLIST

After completing all fixes, verify:

### Security:
- [ ] All credentials rotated and .env files not in git
- [ ] Admin endpoints require authentication header
- [ ] CORS only allows production domain
- [ ] Rate limiting active (test with curl)
- [ ] Can't access admin endpoints without token

### Data Protection:
- [ ] Daily automated backups enabled in Supabase
- [ ] Manual backup script works
- [ ] Soft deletes working (deleted records still in DB)
- [ ] Database queries fast (<100ms average)
- [ ] Foreign keys cascade properly

### Monitoring:
- [ ] /health endpoint returns healthy
- [ ] Logs are in JSON format
- [ ] Errors logged to Sentry
- [ ] Can track request_id through logs

---

## 🧪 TESTING YOUR FIXES

### Test Authentication:
```bash
# Should FAIL (401):
curl -X POST http://localhost:8000/api/roster/reset

# Should SUCCEED:
curl -X POST http://localhost:8000/api/roster/reset \
  -H "X-Admin-Token: your-admin-secret"
```

### Test Rate Limiting:
```bash
# Run 35 times rapidly - should see 429 error:
for i in {1..35}; do
  curl http://localhost:8000/api/roster
done
```

### Test Soft Deletes:
```python
# In Python shell:
from database import db
import uuid

# Create test shift
shift_id = str(uuid.uuid4())
db.create_shift({...})

# Soft delete
db.delete_shift(shift_id)

# Should not appear in normal queries
shifts = db.get_all_shifts()
assert shift_id not in [s['id'] for s in shifts]

# Should appear when including deleted
shifts = db.get_all_shifts(include_deleted=True)
assert shift_id in [s['id'] for s in shifts]
```

### Test Health Check:
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy", ...}
```

---

## 📝 UPDATE ENVIRONMENT VARIABLES

### Backend (.env):
```bash
# Security
ADMIN_SECRET_KEY=generate-random-32-char-string
ALLOWED_ORIGINS=https://your-domain.vercel.app

# Monitoring
SENTRY_DSN=your-sentry-dsn
ENVIRONMENT=production
APP_VERSION=1.0.0

# Database (new keys after rotation)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=new-rotated-key

# APIs (new keys after rotation)
OPENAI_API_KEY=new-rotated-key
TELEGRAM_BOT_TOKEN=new-rotated-key
```

### Render (Production Backend):
```
Dashboard → Environment → Environment Variables:
- ADMIN_SECRET_KEY
- ALLOWED_ORIGINS
- SENTRY_DSN
- ENVIRONMENT=production
- (all other vars from .env)
```

### Vercel (Production Frontend):
```
Settings → Environment Variables:
- REACT_APP_API_URL=https://your-backend.render.com
- REACT_APP_ENVIRONMENT=production
```

---

## 🎯 SUCCESS METRICS

After 3 days, you should have:

✅ **Security:**
- No credentials in git history
- Admin endpoints protected
- CORS restricted to production
- Rate limiting active

✅ **Data Protection:**
- Daily automated backups
- Soft deletes implemented
- Database indexes added
- Foreign keys fixed

✅ **Monitoring:**
- Health check endpoint live
- Structured JSON logging
- Error tracking in Sentry
- Global error handling

---

## 📞 NEXT STEPS

After completing these immediate fixes:

1. **Week 2:** Code Quality Improvements
   - Split large files into modules
   - Add type hints
   - Add code comments

2. **Week 3-4:** Testing
   - Write unit tests
   - Set up CI/CD
   - Add integration tests

3. **Week 5-6:** Performance
   - Fix N+1 queries
   - Add caching
   - Optimize frontend

---

**Remember:** These are the MINIMUM security and data protection fixes. Don't deploy to production without completing ALL items in Days 1-3.

**Need Help?** Refer to the main COMPLETE_SYSTEM_AUDIT_AND_IMPROVEMENTS.md document for detailed explanations.