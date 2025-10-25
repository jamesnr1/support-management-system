"""Performance monitoring middleware for FastAPI"""
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from monitoring.performance_monitor import performance_monitor
import logging

logger = logging.getLogger(__name__)

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor request performance"""
    
    async def dispatch(self, request: Request, call_next):
        """Process request and record performance metrics"""
        start_time = time.time()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Extract endpoint information
        endpoint = request.url.path
        method = request.method
        
        # Record performance metrics
        await performance_monitor.record_request(
            endpoint=endpoint,
            method=method,
            response_time=response_time,
            status_code=response.status_code
        )
        
        # Add performance headers
        response.headers["X-Response-Time"] = f"{response_time:.4f}s"
        response.headers["X-Request-ID"] = str(hash(f"{endpoint}{method}{start_time}"))
        
        return response
