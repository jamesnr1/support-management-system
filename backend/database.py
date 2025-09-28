from supabase import create_client, Client
import os
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class SupabaseDatabase:
    def __init__(self):
        self.client: Optional[Client] = None
        self.connect()
    
    def connect(self):
        try:
            supabase_url = os.environ.get('SUPABASE_URL')
            supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                raise Exception("Supabase URL and Service Key must be provided")
            
            self.client = create_client(supabase_url, supabase_key)
            logger.info(f"Successfully connected to Supabase at {supabase_url}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def get_participants(self) -> List[Dict]:
        """Get all participants from Supabase"""
        try:
            response = self.client.table('participants').select('*').execute()
            participants = []
            for p in response.data:
                participants.append({
                    'id': str(p['id']),
                    'code': p['code'],
                    'full_name': p['full_name'],
                    'participant_number': p.get('ndis_number'),  # Map ndis_number to participant_number
                    'location_id': str(p.get('location_id')) if p.get('location_id') else None,  # Convert to string
                    'default_ratio': p.get('default_ratio'),
                    'plan_start': p.get('plan_start'),
                    'plan_end': p.get('plan_end')
                })
            return participants
        except Exception as e:
            logger.error(f"Error fetching participants: {e}")
            return []
    
    def get_support_workers(self) -> List[Dict]:
        """Get all support workers from Supabase"""
        try:
            response = self.client.table('support_workers').select('*').execute()
            workers = []
            for w in response.data:
                workers.append({
                    'id': str(w['id']),
                    'code': w['code'],
                    'full_name': w['full_name'],
                    'email': w.get('email'),
                    'phone': w.get('phone'),
                    'status': w.get('status', 'Active'),
                    'max_hours': w.get('max_hours'),
                    'car': w.get('car'),
                    'skills': w.get('skills'),
                    'sex': w.get('sex'),
                    'telegram': w.get('telegram')
                })
            return workers
        except Exception as e:
            logger.error(f"Error fetching support workers: {e}")
            return []
    
    def get_locations(self) -> List[Dict]:
        """Get all locations from Supabase"""
        try:
            response = self.client.table('locations').select('*').execute()
            locations = []
            for location in response.data:
                locations.append({
                    'id': str(location['id']),
                    'name': location['name']
                })
            return locations
        except Exception as e:
            logger.error(f"Error fetching locations: {e}")
            return []
    
    def get_roster_data(self, week_type: str) -> Dict:
        """Get roster data for a specific week type"""
        try:
            # This will be stored as JSON in a roster_data table or similar
            # For now, return empty structure - we'll implement this based on your needs
            return {}
        except Exception as e:
            logger.error(f"Error fetching roster data for {week_type}: {e}")
            return {}
    
    def save_roster_data(self, week_type: str, data: Dict) -> bool:
        """Save roster data for a specific week type"""
        try:
            # This will save to a roster_data table or similar
            # For now, just return True - we'll implement this based on your needs
            logger.info(f"Saving roster data for {week_type}")
            return True
        except Exception as e:
            logger.error(f"Error saving roster data for {week_type}: {e}")
            return False

# Global database instance
db = SupabaseDatabase()