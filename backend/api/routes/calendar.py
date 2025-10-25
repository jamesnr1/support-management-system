"""Calendar integration endpoints"""
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, Optional
from database import db
from calendar_service import calendar_service
from core.security import get_rate_limiter
from core.logging_config import get_logger

router = APIRouter(prefix="/api/calendar", tags=["calendar"])
limiter = get_rate_limiter()
logger = get_logger("calendar")

@router.get("/appointments")
@limiter.limit("30/minute")
async def get_calendar_appointments(startDate: str, endDate: str, weekType: str):
    """Get calendar appointments for date range"""
    try:
        appointments = calendar_service.get_appointments(startDate, endDate, weekType)
        return appointments
    except Exception as e:
        logger.error(f"Error fetching calendar appointments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch calendar appointments")

@router.get("/auth-url")
@limiter.limit("10/minute")
async def get_calendar_auth_url(redirect_uri: str):
    """Get Google Calendar OAuth authorization URL"""
    try:
        auth_url = calendar_service.get_authorization_url(redirect_uri)
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Error generating auth URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate authorization URL")

@router.post("/authorize")
@limiter.limit("5/minute")
async def authorize_calendar(data: Dict[str, Any]):
    """Complete OAuth authorization with code"""
    try:
        # Debug logging removed for production
        
        code = data.get('code')
        redirect_uri = data.get('redirect_uri')
        
        # Debug logging removed for production
        
        if not code or not redirect_uri:
            raise HTTPException(status_code=400, detail="Missing code or redirect_uri")
        
        success = calendar_service.authorize_with_code(code, redirect_uri)
        
        if success:
            return {"success": True, "message": "Calendar authorized successfully"}
        else:
            raise HTTPException(status_code=400, detail="Authorization failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error authorizing calendar: {e}")
        raise HTTPException(status_code=500, detail="Authorization failed")

@router.get("/oauth/callback")
@limiter.limit("10/minute")
async def oauth_callback(code: str = None, error: str = None):
    """Handle OAuth callback from Google"""
    try:
        if error:
            logger.error(f"OAuth error: {error}")
            raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
        
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")
        
        # Process the authorization code
        success = calendar_service.authorize_with_code(code, "http://localhost:3000")
        
        if success:
            return {"success": True, "message": "Calendar connected successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to connect calendar")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing OAuth callback: {e}")
        raise HTTPException(status_code=500, detail="Failed to process callback")

@router.get("/status")
@limiter.limit("30/minute")
async def get_calendar_status():
    """Get calendar connection status"""
    try:
        is_connected = calendar_service.is_connected()
        return {
            "connected": is_connected,
            "status": "connected" if is_connected else "disconnected"
        }
    except Exception as e:
        logger.error(f"Error checking calendar status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check calendar status")

@router.post("/events")
@limiter.limit("10/minute")
async def create_calendar_event(event_data: dict):
    """Create a new calendar event"""
    try:
        # Validate required fields
        required_fields = ['calendar_id', 'summary', 'start', 'end']
        for field in required_fields:
            if field not in event_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Create the event
        event = calendar_service.create_event(
            calendar_id=event_data['calendar_id'],
            summary=event_data['summary'],
            start=event_data['start'],
            end=event_data['end'],
            description=event_data.get('description', ''),
            location=event_data.get('location', '')
        )
        
        return {"success": True, "event": event}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating calendar event: {e}")
        raise HTTPException(status_code=500, detail="Failed to create calendar event")

@router.post("/create-appointment")
@limiter.limit("10/minute")
async def create_appointment(appointment_data: dict):
    """Create a calendar appointment"""
    try:
        # Validate required fields
        required_fields = ['calendarId', 'title', 'date', 'startTime', 'endTime']
        for field in required_fields:
            if field not in appointment_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Create the appointment
        appointment = calendar_service.create_appointment(
            calendar_id=appointment_data['calendarId'],
            title=appointment_data['title'],
            date=appointment_data['date'],
            start_time=appointment_data['startTime'],
            end_time=appointment_data['endTime'],
            description=appointment_data.get('description', ''),
            location=appointment_data.get('location', '')
        )
        
        return {"success": True, "appointment": appointment}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create appointment")

@router.get("/list")
@limiter.limit("30/minute")
async def list_calendars():
    """List available calendars"""
    try:
        calendars = calendar_service.list_calendars()
        return {"calendars": calendars}
    except Exception as e:
        logger.error(f"Error listing calendars: {e}")
        raise HTTPException(status_code=500, detail="Failed to list calendars")
