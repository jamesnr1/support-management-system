"""
Google Calendar Integration Service
Fetches and displays appointments from Google Calendar
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import json

# Configuration
SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
]
CLIENT_SECRETS_FILE = os.getenv('GOOGLE_CLIENT_SECRETS_FILE', 'client_secrets.json')


class CalendarService:
    """Service for reading Google Calendar appointments"""
    
    def __init__(self):
        self.creds = None
        self.service = None
        # Try to load existing credentials on startup
        self.load_credentials()
    
    def get_authorization_url(self, redirect_uri: str) -> str:
        """
        Generate OAuth2 authorization URL
        """
        try:
            flow = Flow.from_client_secrets_file(
                CLIENT_SECRETS_FILE,
                scopes=SCOPES,
                redirect_uri=redirect_uri
            )
            
            authorization_url, state = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'  # Force consent screen to show correct project name
            )
            
            return authorization_url
        except Exception as e:
            print(f"Error generating auth URL: {e}")
            return None
    
    def authorize_with_code(self, code: str, redirect_uri: str) -> bool:
        """
        Exchange authorization code for credentials
        """
        try:
            print(f"DEBUG: Raw code received: {repr(code)}")
            print(f"DEBUG: Code length: {len(code)}")
            print(f"DEBUG: Redirect URI: {redirect_uri}")
            
            # Clean the code - remove any whitespace or URL encoding issues
            clean_code = code.strip()
            
            # Remove common URL prefixes if user copied the whole URL
            if clean_code.startswith('http'):
                # Extract code from URL parameter
                import urllib.parse as urlparse
                parsed = urlparse.urlparse(clean_code)
                query_params = urlparse.parse_qs(parsed.query)
                if 'code' in query_params:
                    clean_code = query_params['code'][0]
                    print(f"DEBUG: Extracted code from URL: {clean_code[:20]}...")
            
            print(f"DEBUG: Final cleaned code: {clean_code[:20]}...")
            
            flow = Flow.from_client_secrets_file(
                CLIENT_SECRETS_FILE,
                scopes=SCOPES,
                redirect_uri=redirect_uri
            )
            
            print(f"DEBUG: About to call flow.fetch_token with code")
            flow.fetch_token(code=clean_code)
            print(f"DEBUG: Successfully got token!")
            
            self.creds = flow.credentials
            self.service = build('calendar', 'v3', credentials=self.creds)
            
            # Save credentials to file for persistence
            self.save_credentials()
            
            return True
        except Exception as e:
            print(f"Error authorizing with code: {e}")
            print(f"DEBUG: Exception type: {type(e)}")
            print(f"DEBUG: Exception details: {str(e)}")
            return False
    
    def save_credentials(self):
        """Save credentials to file for persistence"""
        try:
            if self.creds:
                creds_file = os.path.join(os.path.dirname(__file__), 'calendar_credentials.json')
                with open(creds_file, 'w') as f:
                    f.write(self.creds.to_json())
                print(f"DEBUG: Saved credentials to {creds_file}")
        except Exception as e:
            print(f"Error saving credentials: {e}")
    
    def load_credentials(self):
        """Load saved credentials from file"""
        try:
            creds_file = os.path.join(os.path.dirname(__file__), 'calendar_credentials.json')
            if os.path.exists(creds_file):
                with open(creds_file, 'r') as f:
                    creds_data = f.read()
                self.creds = Credentials.from_authorized_user_info(
                    json.loads(creds_data), SCOPES
                )
                
                # Refresh if expired
                if self.creds.expired and self.creds.refresh_token:
                    from google.auth.transport.requests import Request
                    self.creds.refresh(Request())
                    self.save_credentials()  # Save refreshed credentials
                
                self.service = build('calendar', 'v3', credentials=self.creds)
                print(f"DEBUG: Loaded existing credentials")
                return True
        except Exception as e:
            print(f"Error loading credentials: {e}")
        return False
    
    def set_credentials(self, credentials_dict: Dict[str, Any]) -> bool:
        """
        Set credentials from dictionary
        """
        try:
            self.creds = Credentials(**credentials_dict)
            self.service = build('calendar', 'v3', credentials=self.creds)
            return True
        except Exception as e:
            print(f"Error setting credentials: {e}")
            return False
    
    def create_calendar(self, name: str, description: str = None, timezone: str = 'Australia/Adelaide') -> str:
        """
        Create a new calendar
        Returns calendar ID
        """
        if not self.service:
            raise Exception("Not authorized - please authenticate first")
        
        try:
            calendar = {
                'summary': name,
                'description': description or f'Roster calendar for {name}',
                'timeZone': timezone
            }
            
            created_calendar = self.service.calendars().insert(body=calendar).execute()
            return created_calendar['id']
        except HttpError as e:
            print(f"Error creating calendar: {e}")
            raise
    
    def get_appointments(self, start_date: datetime, end_date: datetime, calendar_id: str = 'primary') -> List[Dict[str, Any]]:
        """
        Fetch appointments from Google Calendar for a date range

        Args:
            start_date: Start of date range
            end_date: End of date range
            calendar_id: Calendar ID to fetch from (default: 'primary')
                        Use 'all' to fetch from all accessible calendars

        Returns:
            List of appointment dictionaries
        """
        if not self.service:
            return []

        try:
            # If 'all' is specified, fetch from all accessible calendars
            if calendar_id == 'all':
                print(f"DEBUG: Fetching from ALL calendars, timeMin: {start_date.isoformat()}, timeMax: {end_date.isoformat()}")

                # Get list of all calendars
                calendars_result = self.service.calendarList().list().execute()
                calendars = calendars_result.get('items', [])

                all_events = []
                for cal in calendars:
                    cal_id = cal['id']
                    cal_name = cal.get('summary', 'Unknown')

                    try:
                        events_result = self.service.events().list(
                            calendarId=cal_id,
                            timeMin=start_date.isoformat() + 'Z' if start_date.tzinfo is None else start_date.isoformat(),
                            timeMax=end_date.isoformat() + 'Z' if end_date.tzinfo is None else end_date.isoformat(),
                            maxResults=100,
                            singleEvents=True,
                            orderBy='startTime'
                        ).execute()

                        cal_events = events_result.get('items', [])
                        print(f"DEBUG: Calendar '{cal_name}' ({cal_id}): {len(cal_events)} events")
                        all_events.extend(cal_events)

                    except Exception as cal_error:
                        print(f"DEBUG: Error fetching from calendar '{cal_name}': {cal_error}")

                events = all_events
                print(f"DEBUG: Got total {len(events)} events from all calendars")

            else:
                print(f"DEBUG: Fetching from calendar {calendar_id}, timeMin: {start_date.isoformat()}, timeMax: {end_date.isoformat()}")

                events_result = self.service.events().list(
                    calendarId=calendar_id,
                    timeMin=start_date.isoformat() + 'Z' if start_date.tzinfo is None else start_date.isoformat(),
                    timeMax=end_date.isoformat() + 'Z' if end_date.tzinfo is None else end_date.isoformat(),
                    maxResults=100,
                    singleEvents=True,
                    orderBy='startTime'
                ).execute()

                events = events_result.get('items', [])
                print(f"DEBUG: Got {len(events)} events from Google Calendar")
            
            # Format events for frontend
            appointments = []
            for event in events:
                appointment = {
                    'id': event.get('id'),
                    'summary': event.get('summary', 'Untitled Event'),
                    'description': event.get('description'),
                    'location': event.get('location'),
                    'htmlLink': event.get('htmlLink'),
                    'colorId': event.get('colorId'),
                    'attendees': event.get('attendees', []),
                }
                
                # Handle start/end times - Google Calendar API returns these as strings directly
                start = event.get('start')
                end = event.get('end')

                if start:
                    if isinstance(start, dict):
                        # Handle object format (for all-day events)
                        if 'dateTime' in start:
                            appointment['start'] = start['dateTime']
                        elif 'date' in start:
                            appointment['start'] = start['date']
                            appointment['allDay'] = True
                    else:
                        # Handle string format (normal events)
                        appointment['start'] = start

                if end:
                    if isinstance(end, dict):
                        # Handle object format
                        if 'dateTime' in end:
                            appointment['end'] = end['dateTime']
                        elif 'date' in end:
                            appointment['end'] = end['date']
                    else:
                        # Handle string format
                        appointment['end'] = end
                
                appointments.append(appointment)
            
            return appointments
            
        except HttpError as e:
            print(f"Error fetching appointments: {e}")
            return []
    
    def create_calendar_event(self, calendar_id: str, event_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new event in the specified calendar
        
        Args:
            calendar_id: The calendar ID to create the event in
            event_data: Dictionary containing event details:
                - summary: Event title
                - description: Event description
                - start: Start datetime (ISO format)
                - end: End datetime (ISO format)
                - location: Event location
                - attendees: List of attendee emails
        """
        if not self.service:
            print("Calendar service not initialized")
            return None
            
        try:
            # Build the event object
            event = {
                'summary': event_data.get('summary', 'Support Shift'),
                'description': event_data.get('description', ''),
                'location': event_data.get('location', ''),
                'start': {
                    'dateTime': event_data['start'],
                    'timeZone': 'Australia/Adelaide'
                },
                'end': {
                    'dateTime': event_data['end'],
                    'timeZone': 'Australia/Adelaide'
                }
            }
            
            # Add attendees if provided
            if event_data.get('attendees'):
                event['attendees'] = [
                    {'email': email} for email in event_data['attendees']
                ]
            
            # Create the event
            created_event = self.service.events().insert(
                calendarId=calendar_id,
                body=event
            ).execute()
            
            print(f"Created event: {created_event.get('htmlLink')}")
            return created_event
            
        except HttpError as e:
            print(f"Error creating calendar event: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error creating event: {e}")
            return None
    
    def get_calendars(self) -> List[Dict[str, str]]:
        """
        Get list of user's calendars
        """
        if not self.service:
            raise Exception("Not authorized - please authenticate first")
        
        try:
            calendar_list = self.service.calendarList().list().execute()
            return [
                {
                    'id': cal['id'],
                    'name': cal['summary'],
                    'description': cal.get('description', ''),
                    'primary': cal.get('primary', False)
                }
                for cal in calendar_list.get('items', [])
            ]
        except HttpError as e:
            print(f"Error getting calendars: {e}")
            raise


# Singleton instance
calendar_service = CalendarService()

