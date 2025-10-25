"""Main FastAPI application with modular structure"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import uuid
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi.exceptions import RequestValidationError

# Import core modules
from core.config import get_settings, get_allowed_origins, is_production
from core.security import setup_rate_limiting, get_rate_limiter
from core.logging_config import setup_logging, get_logger
from cache_config import setup_cache
from middleware.performance_middleware import PerformanceMiddleware

# Import routes
from api.routes import workers, roster, participants, health, validation, advanced_validation, calendar, telegram, ai_chat

# Load environment variables
load_dotenv()

# Setup logging first
setup_logging()
logger = get_logger("main")

# Initialize Sentry for error tracking
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        integrations=[FastApiIntegration()],
    )
    logger.info("sentry_initialized", environment=os.getenv("ENVIRONMENT", "development"))

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events"""
    # Startup
    try:
        # Load initial data
        from api.routes.roster import load_roster_data
        load_roster_data()
        logger.info("application_started", database="supabase")
        yield
    except Exception as e:
        logger.error("application_startup_failed", error=str(e))
        raise
    # Shutdown
    logger.info("application_shutdown")

# Create the main app
app = FastAPI(
    title="Support Management System", 
    version="2.0.0",
    description="Support Management System with improved security and modular architecture",
    lifespan=lifespan
)

# Configure CORS with security
allowed_origins = get_allowed_origins()
if is_production() and '*' in allowed_origins:
    logger.warning("cors_wildcard_in_production", 
        message="CORS is set to allow all origins in production - this is insecure!"
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

logger.info("cors_configured", 
    allowed_origins=allowed_origins,
    production=is_production()
)

# Setup rate limiting
setup_rate_limiting(app)
limiter = get_rate_limiter()
logger.info("rate_limiting_configured")

# Setup caching
setup_cache()
logger.info("cache_configured")

# Setup performance monitoring
app.add_middleware(PerformanceMiddleware)
logger.info("performance_monitoring_configured")

# Global error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions"""
    request_id = str(uuid.uuid4())
    
    logger.error("unhandled_exception",
        request_id=request_id,
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
            "request_id": request_id
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

# Include routers
app.include_router(health.router)
app.include_router(workers.router)
app.include_router(roster.router)
app.include_router(participants.router)
app.include_router(validation.router)
app.include_router(advanced_validation.router)
app.include_router(calendar.router)
app.include_router(telegram.router)
app.include_router(ai_chat.router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Support Management System API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
