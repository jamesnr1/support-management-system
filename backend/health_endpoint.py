# Health Check Endpoint Addition
# Add this code to server.py after the root endpoint (around line 100)

"""
@api_router.get("/health")
async def health_check():
    '''Health check endpoint for monitoring'''
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
"""

