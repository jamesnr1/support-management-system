"""Shared dependencies for all API routes"""
from fastapi import Depends, HTTPException, Header
from typing import Optional
from database import SupabaseDatabase
from core.security import verify_admin_token, optional_admin_auth
import os

# Database dependency
_db_instance = None

def get_db() -> SupabaseDatabase:
    """Get database instance (singleton)"""
    global _db_instance
    if _db_instance is None:
        _db_instance = SupabaseDatabase()
    return _db_instance

# Authentication dependencies
def require_admin():
    """Dependency for endpoints that require admin authentication"""
    return Depends(verify_admin_token)

def optional_admin():
    """Dependency for endpoints with optional admin authentication"""
    return Depends(optional_admin_auth)
