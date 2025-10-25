"""Cache configuration for FastAPI"""
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
import redis
import os

def setup_cache():
    """Setup Redis cache for FastAPI"""
    try:
        # Try to connect to Redis (optional - will fallback to in-memory if not available)
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(redis_url)
        
        # Test connection
        redis_client.ping()
        
        # Setup FastAPI cache with Redis backend
        FastAPICache.init(RedisBackend(redis_client), prefix="support-system")
        print("✅ Redis cache initialized successfully")
        return True
    except Exception as e:
        print(f"⚠️ Redis not available, using in-memory cache: {e}")
        # Fallback to in-memory cache
        from fastapi_cache.backends.memory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="support-system")
        return False
