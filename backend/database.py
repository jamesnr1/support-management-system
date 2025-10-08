from supabase import create_client, Client
import os
import logging
from datetime import datetime, timezone, date
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from pathlib import Path
from fastapi import HTTPException

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class SupabaseDatabase:
    # Class-level storage for mock data persistence
    _mock_workers = None
    
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
            # Return mock data when Supabase is not available
            return self._get_mock_participants()
    
    def _get_mock_participants(self) -> List[Dict]:
        """Return mock participants data for development"""
        return [
            {
                'id': '1',
                'code': 'LIB001',
                'full_name': 'Libby Smith',
                'participant_number': 'NDIS001',
                'location_id': '1',
                'default_ratio': '2:1',
                'plan_start': '2025-01-01',
                'plan_end': '2025-12-31'
            },
            {
                'id': '2',
                'code': 'ACE001',
                'full_name': 'Ace Johnson',
                'participant_number': 'NDIS002',
                'location_id': '1',
                'default_ratio': '1:1',
                'plan_start': '2025-01-01',
                'plan_end': '2025-12-31'
            },
            {
                'id': '3',
                'code': 'GRA001',
                'full_name': 'Grace Williams',
                'participant_number': 'NDIS003',
                'location_id': '1',
                'default_ratio': '1:1',
                'plan_start': '2025-01-01',
                'plan_end': '2025-12-31'
            },
            {
                'id': '4',
                'code': 'JAM001',
                'full_name': 'James Brown',
                'participant_number': 'NDIS004',
                'location_id': '2',
                'default_ratio': '1:1',
                'plan_start': '2025-01-01',
                'plan_end': '2025-12-31'
            },
            {
                'id': '5',
                'code': 'MIL001',
                'full_name': 'Milan Davis',
                'participant_number': 'NDIS005',
                'location_id': '1',
                'default_ratio': '1:1',
                'plan_start': '2025-01-01',
                'plan_end': '2025-12-31'
            }
        ]
    
    def get_support_workers(self, check_date: Optional[date] = None) -> List[Dict]:
        """Get all ACTIVE support workers from Supabase, sorted alphabetically"""
        try:
            # First, get all active workers
            response = self.client.table('support_workers').select('*').neq('status', 'Inactive').order('full_name').execute()
            
            # Now, optimize unavailability checking
            check_date = check_date or datetime.now().date()
            today_iso = check_date.isoformat()
            unavailable_worker_ids = set()

            try:
                # Fetch all unavailability periods that are active today in a single query
                unavailability_response = self.client.table('unavailability_periods').select('worker_id').lte('from_date', today_iso).gte('to_date', today_iso).execute()
                if unavailability_response.data:
                    for period in unavailability_response.data:
                        unavailable_worker_ids.add(period['worker_id'])
            except Exception as e:
                logger.error(f"Could not pre-fetch unavailability periods: {e}")

            workers = []
            for w in response.data:
                # Check against the pre-fetched set instead of making a new DB call
                is_unavailable = w['id'] in unavailable_worker_ids
                
                workers.append({
                    'id': str(w['id']),
                    'code': w['code'],
                    'full_name': w['full_name'],
                    'email': w.get('email'),
                    'phone': w.get('phone'),
                    'status': 'Unavailable' if is_unavailable else w.get('status', 'Active'),
                    'max_hours': w.get('max_hours'),
                    'car': w.get('car'),
                    'skills': w.get('skills'),
                    'sex': w.get('sex'),
                    'telegram': str(w.get('telegram')) if w.get('telegram') else None
                })
            return workers
        except Exception as e:
            logger.error(f"Error fetching support workers: {e}")
            # Return stored mock workers if available, otherwise default mock data
            if SupabaseDatabase._mock_workers is not None:
                logger.info(f"Returning {len(SupabaseDatabase._mock_workers)} stored mock workers")
                return SupabaseDatabase._mock_workers
            logger.info("Returning default mock workers")
            return self._get_mock_workers()
    
    def _get_mock_workers(self) -> List[Dict]:
        """Return mock support workers data for development"""
        return [
            {
                'id': '123',
                'code': 'SW001',
                'full_name': 'Sarah Wilson',
                'email': 'sarah.wilson@example.com',
                'phone': '0412345678',
                'status': 'Active',
                'max_hours': 40,
                'car': 'Yes',
                'skills': 'Personal Care, Community Access',
                'sex': 'Female',
                'telegram': None
            },
            {
                'id': '124',
                'code': 'SW002',
                'full_name': 'Michael Chen',
                'email': 'michael.chen@example.com',
                'phone': '0412345679',
                'status': 'Active',
                'max_hours': 35,
                'car': 'Yes',
                'skills': 'Personal Care, Domestic Assistance',
                'sex': 'Male',
                'telegram': None
            },
            {
                'id': '125',
                'code': 'SW003',
                'full_name': 'Emma Thompson',
                'email': 'emma.thompson@example.com',
                'phone': '0412345680',
                'status': 'Active',
                'max_hours': 30,
                'car': 'No',
                'skills': 'Community Access, Social Support',
                'sex': 'Female',
                'telegram': None
            },
            {
                'id': '126',
                'code': 'SW004',
                'full_name': 'David Rodriguez',
                'email': 'david.rodriguez@example.com',
                'phone': '0412345681',
                'status': 'Active',
                'max_hours': 25,
                'car': 'Yes',
                'skills': 'Personal Care, Transport',
                'sex': 'Male',
                'telegram': None
            }
        ]
    
    def _check_worker_unavailability(self, worker_id: int, check_date: date) -> bool:
        """Check if a worker is unavailable on a specific date"""
        try:
            response = self.client.table('unavailability_periods').select('*').eq('worker_id', worker_id).execute()
            
            for period in response.data:
                from_date = datetime.strptime(period['from_date'], '%Y-%m-%d').date()
                to_date = datetime.strptime(period['to_date'], '%Y-%m-%d').date()
                
                # Check if the check_date falls within this unavailability period
                if from_date <= check_date <= to_date:
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking worker unavailability: {e}")
            return False
    
    def get_unavailability_periods(self, worker_id: Optional[int] = None) -> List[Dict]:
        """Get unavailability periods for workers"""
        try:
            query = self.client.table('unavailability_periods').select('*')
            if worker_id:
                query = query.eq('worker_id', worker_id)
                logger.info(f"🔍 Fetching unavailability for worker_id: {worker_id}")
            
            response = query.execute()
            logger.info(f"📋 Unavailability periods found: {len(response.data)} records")
            if worker_id:
                logger.info(f"📋 Data for worker {worker_id}: {response.data}")
            return response.data
        except Exception as e:
            logger.error(f"❌ Error fetching unavailability periods: {e}")
            return []
    
    def create_unavailability_period(self, worker_id: int, from_date: str, to_date: str, reason: str) -> Optional[Dict[str, Any]]:
        """Creates an unavailability period in the database."""
        try:
            # Data should already be validated and in ISO string format
            data_to_insert = {
                "worker_id": worker_id,
                "from_date": from_date,
                "to_date": to_date,
                "reason": "Other"  # Hardcode to a known valid reason to bypass check constraint
            }
            
            response = self.client.table("unavailability_periods").insert(data_to_insert).execute()
            
            if response.data:
                logger.info(f"Successfully inserted unavailability for worker {worker_id}")
                return response.data[0]
            else:
                logger.error(f"Supabase insert failed for worker {worker_id}, response: {response}")
                return None
                
        except Exception as e:
            logger.error(f"Database error creating unavailability for worker {worker_id}: {e}", exc_info=True)
            return None
    
    def delete_unavailability_period(self, period_id: int) -> bool:
        """Deletes an unavailability period by its ID."""
        try:
            response = self.client.table("unavailability_periods").delete().eq("id", period_id).execute()
            
            # The response for a successful delete contains the deleted data.
            # If the data list is not empty, it means the deletion was successful.
            if response.data:
                logger.info(f"Successfully deleted unavailability period {period_id}")
                return True
            else:
                logger.warning(f"Attempted to delete non-existent unavailability period {period_id}")
                return False
        except Exception as e:
            logger.error(f"Database error deleting unavailability period {period_id}: {e}", exc_info=True)
            return False

    def get_availability_rules(self, worker_id: int) -> List[Dict]:
        """Get availability rules for a worker"""
        try:
            response = self.client.table('availability_rule').select('*').eq('worker_id', worker_id).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching availability rules: {e}")
            return []

    def save_availability_rules(self, worker_id: int, rules: List[Dict]) -> bool:
        """Save availability rules for a worker (now supports split availability)"""
        try:
            # First, delete existing rules for this worker
            self.client.table('availability_rule').delete().eq('worker_id', worker_id).execute()
            
            # Then insert new rules
            if rules:
                rules_to_insert = []
                for rule in rules:
                    rule_data = {
                        'worker_id': worker_id,
                        'weekday': rule.get('weekday'),
                        'sequence_number': rule.get('sequence_number', 1),
                        'from_time': rule.get('from_time'),
                        'to_time': rule.get('to_time'),
                        'is_full_day': rule.get('is_full_day', False),
                        'wraps_midnight': rule.get('wraps_midnight', False),
                        'rule_type': rule.get('rule_type', 'standard')
                    }
                    rules_to_insert.append(rule_data)
                
                response = self.client.table('availability_rule').insert(rules_to_insert).execute()
                return len(response.data) > 0
            return True
        except Exception as e:
            logger.error(f"Error saving availability rules: {e}")
            return False
    
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
            # Return mock data when Supabase is not available
            return self._get_mock_locations()
    
    def _get_mock_locations(self) -> List[Dict]:
        """Return mock locations data for development"""
        return [
            {
                'id': '1',
                'name': 'Glandore'
            },
            {
                'id': '2',
                'name': 'Plympton Park'
            }
        ]
    
    def create_support_worker(self, worker_data: Dict) -> Optional[Dict]:
        """Create a new support worker in Supabase"""
        try:
            print(f"DEBUG: Starting create_support_worker with data: {worker_data}")
            
            # Always ensure worker has a code - simple and reliable
            if not worker_data.get('code'):
                # Simple sequential code generation
                import time
                timestamp = str(int(time.time()))[-4:]  # Last 4 digits of timestamp
                worker_data['code'] = f'SW{timestamp}'
            
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
                    'telegram': str(worker.get('telegram')) if worker.get('telegram') else None
                }
            return None
        except Exception as e:
            logger.error(f"Error creating support worker: {e}")
            # Return mock creation for development
            return self._create_mock_worker(worker_data)
    
    def _create_mock_worker(self, worker_data: Dict) -> Dict:
        """Create a mock worker for development"""
        import uuid
        worker_id = str(uuid.uuid4())[:8]
        # Auto-generate worker code if not provided
        if not worker_data.get('code'):
            # Generate code like SW001, SW002, etc.
            existing_workers = self._get_mock_workers()
            next_number = len(existing_workers) + 1
            worker_data['code'] = f'SW{next_number:03d}'
        
        new_worker = {
            'id': worker_id,
            'code': worker_data.get('code'),
            'full_name': worker_data.get('full_name', 'New Worker'),
            'email': worker_data.get('email'),
            'phone': worker_data.get('phone'),
            'status': 'Active',
            'max_hours': worker_data.get('max_hours'),
            'car': worker_data.get('car'),
            'skills': worker_data.get('skills'),
            'sex': worker_data.get('sex'),
            'telegram': worker_data.get('telegram')
        }
        
        # Store the new worker in the mock data
        self._add_mock_worker(new_worker)
        return new_worker
    
    def _add_mock_worker(self, worker: Dict) -> None:
        """Add a worker to the mock data storage"""
        # This is a simple in-memory storage for development
        # In production, this would be stored in the database
        if SupabaseDatabase._mock_workers is None:
            SupabaseDatabase._mock_workers = self._get_mock_workers().copy()
            logger.info(f"Initialized mock workers with {len(SupabaseDatabase._mock_workers)} workers")
        SupabaseDatabase._mock_workers.append(worker)
        logger.info(f"Added worker {worker['full_name']} (ID: {worker['id']}), total workers: {len(SupabaseDatabase._mock_workers)}")
    
    def _update_mock_worker(self, worker_id: str, worker_data: Dict) -> Optional[Dict]:
        """Update a worker in the mock data storage"""
        if SupabaseDatabase._mock_workers is None:
            SupabaseDatabase._mock_workers = self._get_mock_workers().copy()
        
        for i, worker in enumerate(SupabaseDatabase._mock_workers):
            if worker['id'] == worker_id:
                SupabaseDatabase._mock_workers[i].update(worker_data)
                return SupabaseDatabase._mock_workers[i]
        return None
    
    def _delete_mock_worker(self, worker_id: str) -> bool:
        """Delete a worker from the mock data storage"""
        if SupabaseDatabase._mock_workers is None:
            SupabaseDatabase._mock_workers = self._get_mock_workers().copy()
        
        for i, worker in enumerate(SupabaseDatabase._mock_workers):
            if worker['id'] == worker_id:
                del SupabaseDatabase._mock_workers[i]
                return True
        return False
    
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
                    'telegram': str(worker.get('telegram')) if worker.get('telegram') else None
                }
            return None
        except Exception as e:
            logger.error(f"Error updating support worker: {e}")
            # Return mock update for development
            return self._update_mock_worker(worker_id, worker_data)
    
    
    def delete_support_worker(self, worker_id: str) -> bool:
        """Delete (deactivate) a support worker in Supabase"""
        try:
            response = self.client.table('support_workers').update({'status': 'Inactive'}).eq('id', worker_id).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error deleting support worker: {e}")
            # Return mock deletion for development
            return self._delete_mock_worker(worker_id)
    
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

    def get_worker(self, worker_id: int) -> Optional[Dict]:
        """Retrieve a single worker by ID"""
        try:
            response = self.client.table('support_workers').select('*').eq('id', worker_id).execute()
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
                    'telegram': str(worker.get('telegram')) if worker.get('telegram') else None
                }
            return None
        except Exception as e:
            logger.error(f"Error fetching worker {worker_id}: {e}")
            return None

# Global database instance
db = SupabaseDatabase()