# This file contains the sections to add to server.py
# Copy the sections below to the appropriate locations in server.py

# ========================================
# SECTION 1: Add after line 58 (after CORS middleware)
# ========================================

# Middleware for request ID tracking
@app.middleware("http")
async def add_request_id(request, call_next):
    """Add unique request ID to each request for tracking"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# ========================================
# SECTION 2: Add after line 102 (after root endpoint)
# ========================================

@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test database connection
        workers = db.get_support_workers()
        db_healthy = isinstance(workers, list)
        
        # Test calendar connection
        calendar_healthy = calendar_service is not None
        
        return {
            "status": "healthy" if db_healthy else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "up" if db_healthy else "down",
                "calendar": "up" if calendar_healthy else "down"
            },
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

