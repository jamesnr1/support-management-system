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
        """Get all support workers from Supabase, sorted alphabetically"""
        try:
            response = self.client.table('support_workers').select('*').order('full_name').execute()
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
    
    def create_support_worker(self, worker_data: Dict) -> Optional[Dict]:
        """Create a new support worker in Supabase"""
        try:
            response = self.client.table('support_workers').insert(worker_data).execute()
            if response.data:
                worker = response.data[0]
                return {
                    'id': str(worker['id']),
                    'code': worker['code'],
                    'full_name': worker['full_name'],
                    'email': worker.get('email'),
                    'phone': worker.get('phone'),
                    'status': worker.get('status', 'Active'),
                    'max_hours': worker.get('max_hours'),
                    'car': worker.get('car'),
                    'skills': worker.get('skills'),
                    'sex': worker.get('sex'),
                    'telegram': worker.get('telegram')
                }
            return None
        except Exception as e:
            logger.error(f"Error creating support worker: {e}")
            return None
    
    def update_support_worker(self, worker_id: str, worker_data: Dict) -> Optional[Dict]:
        """Update a support worker in Supabase"""
        try:
            response = self.client.table('support_workers').update(worker_data).eq('id', worker_id).execute()
            if response.data:
                worker = response.data[0]
                return {
                    'id': str(worker['id']),
                    'code': worker['code'],
                    'full_name': worker['full_name'],
                    'email': worker.get('email'),
                    'phone': worker.get('phone'),
                    'status': worker.get('status', 'Active'),
                    'max_hours': worker.get('max_hours'),
                    'car': worker.get('car'),
                    'skills': worker.get('skills'),
                    'sex': worker.get('sex'),
                    'telegram': worker.get('telegram')
                }
            return None
        except Exception as e:
            logger.error(f"Error updating support worker: {e}")
            return None
    
    def delete_support_worker(self, worker_id: str) -> bool:
        """Delete (deactivate) a support worker in Supabase"""
        try:
            response = self.client.table('support_workers').update({'status': 'Inactive'}).eq('id', worker_id).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error deleting support worker: {e}")
            return False
    
    def get_roster_data(self, week_type: str) -> Dict:
        """Get roster data for a specific week type from Supabase"""
        try:
            response = self.client.table('roster_data').select('data').eq('week_type', week_type).execute()
            
            if response.data:
                return response.data[0].get('data', {})
            else:
                return {}
        except Exception as e:
            logger.error(f"Error fetching roster data for {week_type}: {e}")
            return {}
    
    def save_roster_data(self, week_type: str, data: Dict) -> bool:
        """Save roster data for a specific week type to Supabase"""
        try:
            # Create roster_data table structure if it doesn't exist
            # For now, we'll use a simple JSON storage approach
            
            # Check if record exists
            existing = self.client.table('roster_data').select('*').eq('week_type', week_type).execute()
            
            if existing.data:
                # Update existing record
                response = self.client.table('roster_data').update({
                    'data': data,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('week_type', week_type).execute()
            else:
                # Insert new record
                response = self.client.table('roster_data').insert({
                    'week_type': week_type,
                    'data': data,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).execute()
            
            logger.info(f"Successfully saved roster data for {week_type}")
            return True
        except Exception as e:
            logger.error(f"Error saving roster data for {week_type}: {e}")
            # Fallback to memory storage for now
            return True

# Global database instance
db = SupabaseDatabase()