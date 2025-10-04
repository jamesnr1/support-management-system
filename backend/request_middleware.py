# Request ID Tracking Middleware
# Add this code to server.py after the CORS middleware (around line 58)

"""
# Middleware for request ID tracking
@app.middleware("http")
async def add_request_id(request, call_next):
    '''Add unique request ID to each request for tracking'''
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response
"""

