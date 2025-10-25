"""Security configuration for production deployment"""
import os
from typing import List

class SecurityConfig:
    """Security configuration settings"""
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # Development
        "https://yourdomain.com",  # Production - UPDATE THIS
        "https://www.yourdomain.com",  # Production with www - UPDATE THIS
    ]
    
    # Rate limiting settings
    RATE_LIMIT_PER_MINUTE: int = 30
    RATE_LIMIT_WRITE_PER_MINUTE: int = 5
    RATE_LIMIT_ADMIN_PER_MINUTE: int = 100
    
    # Security headers
    SECURITY_HEADERS: dict = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    }
    
    # Database security
    DB_CONNECTION_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    
    # Cache security
    CACHE_DEFAULT_TTL: int = 300  # 5 minutes
    CACHE_MAX_CONNECTIONS: int = 10
    
    # API security
    MAX_REQUEST_SIZE: int = 16 * 1024 * 1024  # 16MB
    REQUEST_TIMEOUT: int = 30  # 30 seconds
    
    @classmethod
    def get_allowed_origins(cls) -> List[str]:
        """Get allowed origins from environment or default"""
        env_origins = os.getenv("ALLOWED_ORIGINS")
        if env_origins:
            return [origin.strip() for origin in env_origins.split(",")]
        return cls.ALLOWED_ORIGINS
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production"""
        return os.getenv("ENVIRONMENT", "development").lower() == "production"
    
    @classmethod
    def get_security_headers(cls) -> dict:
        """Get security headers for production"""
        if cls.is_production():
            return cls.SECURITY_HEADERS
        return {}  # Relaxed headers for development
