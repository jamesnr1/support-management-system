"""Security utilities for authentication and authorization"""
from fastapi import HTTPException, Header, Depends
from typing import Optional
import os
import secrets
import hashlib
from datetime import datetime, timedelta
import jwt

# Admin secret key - should be set in environment variables
ADMIN_SECRET = os.getenv("ADMIN_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")

def generate_admin_secret() -> str:
    """Generate a secure admin secret key"""
    return secrets.token_urlsafe(32)

async def verify_admin_token(x_admin_token: Optional[str] = Header(None)) -> bool:
    """Verify admin authentication token from header"""
    if not x_admin_token:
        raise HTTPException(
            status_code=401,
            detail="Missing admin token. Include X-Admin-Token header."
        )
    
    if not ADMIN_SECRET or ADMIN_SECRET == "CHANGE_ME_IN_PRODUCTION":
        raise HTTPException(
            status_code=500,
            detail="Admin secret not configured. Set ADMIN_SECRET_KEY environment variable."
        )
    
    if x_admin_token != ADMIN_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin token"
        )
    
    return True

async def optional_admin_auth(x_admin_token: Optional[str] = Header(None)) -> bool:
    """Optional authentication for read endpoints - returns True if admin, False otherwise"""
    if not x_admin_token or not ADMIN_SECRET:
        return False
    
    return x_admin_token == ADMIN_SECRET

def require_admin() -> Depends:
    """Dependency for endpoints that require admin authentication"""
    return Depends(verify_admin_token)

def optional_admin() -> Depends:
    """Dependency for endpoints with optional admin authentication"""
    return Depends(optional_admin_auth)

# Rate limiting utilities
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Create rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"]
)

def get_rate_limiter():
    """Get the rate limiter instance"""
    return limiter

def setup_rate_limiting(app):
    """Setup rate limiting for the FastAPI app"""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
