"""Application configuration"""
import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # Security
    admin_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    allowed_origins: List[str] = ["http://localhost:3000"]
    
    # Database
    supabase_url: str = ""
    supabase_service_key: str = ""
    
    # External APIs
    openai_api_key: str = ""
    telegram_bot_token: str = ""
    
    # Monitoring
    sentry_dsn: str = ""
    environment: str = "development"
    app_version: str = "1.0.0"
    
    # Rate limiting
    rate_limit_default: str = "100/minute"
    rate_limit_strict: str = "10/minute"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

def get_settings() -> Settings:
    """Get application settings"""
    return Settings()

def get_allowed_origins() -> List[str]:
    """Get allowed CORS origins from environment"""
    origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in origins_str.split(",") if origin.strip()]

def is_production() -> bool:
    """Check if running in production environment"""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"
