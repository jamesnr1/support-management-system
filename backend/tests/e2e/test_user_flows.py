"""End-to-end tests for critical user flows"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from main import app

class TestUserFlows:
    """End-to-end tests for critical user flows"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.client = TestClient(app)
        self.mock_db = Mock()
    
    @patch('main.db')
    def test_complete_worker_management_flow(self, mock_db):
        """Test complete worker management flow"""
        # Step 1: Get workers
        mock_db.get_support_workers.return_value = [
            {
                'id': 1,
                'full_name': 'John Doe',
                'code': 'JD001',
                'status': 'Active'
            }
        ]
        
        response = self.client.get("/api/workers")
        assert response.status_code == 200
        workers = response.json()
        assert len(workers) == 1
        
        # Step 2: Get worker availability
        mock_db.get_availability_rules.return_value = [
            {
                'id': 1,
                'worker_id': 1,
                'weekday': 1,
                'from_time': '09:00',
                'to_time': '17:00',
                'is_full_day': False
            }
        ]
        
        response = self.client.get("/api/workers/1/availability")
        assert response.status_code == 200
        availability = response.json()
        assert 'rules' in availability
        
        # Step 3: Update worker availability
        new_availability = {
            'rules': [
                {
                    'weekday': 1,
                    'from_time': '08:00',
                    'to_time': '16:00',
                    'is_full_day': False
                }
            ]
        }
        mock_db.save_availability_rules.return_value = True
        
        response = self.client.post("/api/workers/1/availability", json=new_availability)
        assert response.status_code == 200
        result = response.json()
        assert result['success'] is True
    
    @patch('main.db')
    def test_complete_roster_management_flow(self, mock_db):
        """Test complete roster management flow"""
        # Step 1: Get participants
        mock_db.get_participants.return_value = [
            {
                'id': 1,
                'name': 'Participant 1',
                'code': 'P001',
                'support_ratio': '1:1'
            }
        ]
        
        response = self.client.get("/api/participants")
        assert response.status_code == 200
        participants = response.json()
        assert len(participants) == 1
        
        # Step 2: Get roster data
        with patch('main.ROSTER_DATA', {'weekA': {'P001': {'2024-01-01': []}}}):
            response = self.client.get("/api/roster/weekA")
            assert response.status_code == 200
            roster = response.json()
            assert 'P001' in roster
        
        # Step 3: Update roster data
        new_roster_data = {
            'P001': {
                '2024-01-01': [
                    {
                        'workers': [1],
                        'startTime': '09:00',
                        'endTime': '17:00',
                        'isFullDay': False,
                        'location': 1
                    }
                ]
            }
        }
        
        with patch('main.ROSTER_DATA', {}):
            response = self.client.post("/api/roster/weekA", json=new_roster_data)
            assert response.status_code == 200
            result = response.json()
            assert result['success'] is True
    
    @patch('main.db')
    def test_availability_and_unavailability_flow(self, mock_db):
        """Test availability and unavailability management flow"""
        worker_id = 1
        
        # Step 1: Set availability
        availability_data = {
            'rules': [
                {
                    'weekday': 1,
                    'from_time': '09:00',
                    'to_time': '17:00',
                    'is_full_day': False
                }
            ]
        }
        mock_db.save_availability_rules.return_value = True
        
        response = self.client.post(f"/api/workers/{worker_id}/availability", json=availability_data)
        assert response.status_code == 200
        
        # Step 2: Add unavailability period
        unavailability_data = {
            'from_date': '2024-01-01',
            'to_date': '2024-01-07',
            'reason': 'Annual Leave'
        }
        mock_db.add_unavailability_period.return_value = True
        
        response = self.client.post(f"/api/workers/{worker_id}/unavailability", json=unavailability_data)
        assert response.status_code == 200
        
        # Step 3: Get unavailability periods
        mock_db.get_unavailability_periods.return_value = [
            {
                'id': 1,
                'worker_id': worker_id,
                'from_date': '2024-01-01',
                'to_date': '2024-01-07',
                'reason': 'Annual Leave'
            }
        ]
        
        response = self.client.get(f"/api/workers/{worker_id}/unavailability")
        assert response.status_code == 200
        periods = response.json()
        assert len(periods) == 1
        assert periods[0]['reason'] == 'Annual Leave'
    
    @patch('main.db')
    def test_worker_creation_and_management_flow(self, mock_db):
        """Test worker creation and management flow"""
        # Step 1: Create worker
        worker_data = {
            'full_name': 'Jane Doe',
            'code': 'JD002',
            'phone': '0987654321',
            'telegram': 987654321
        }
        created_worker = {
            'id': 2,
            **worker_data,
            'status': 'Active',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }
        mock_db.create_support_worker.return_value = created_worker
        
        response = self.client.post("/api/workers", json=worker_data)
        assert response.status_code == 200
        worker = response.json()
        assert worker['full_name'] == 'Jane Doe'
        
        # Step 2: Update worker
        updated_data = {
            'full_name': 'Jane Smith',
            'phone': '1111111111'
        }
        updated_worker = {**created_worker, **updated_data}
        mock_db.update_support_worker.return_value = updated_worker
        
        response = self.client.put(f"/api/workers/{worker['id']}", json=updated_data)
        assert response.status_code == 200
        updated_worker_response = response.json()
        assert updated_worker_response['full_name'] == 'Jane Smith'
        
        # Step 3: Get specific worker
        mock_db.get_support_worker.return_value = updated_worker
        
        response = self.client.get(f"/api/workers/{worker['id']}")
        assert response.status_code == 200
        retrieved_worker = response.json()
        assert retrieved_worker['full_name'] == 'Jane Smith'
    
    @patch('main.db')
    def test_roster_validation_flow(self, mock_db):
        """Test roster validation flow"""
        # Step 1: Create roster with potential conflicts
        roster_data = {
            'P001': {
                '2024-01-01': [
                    {
                        'workers': [1, 2],
                        'startTime': '09:00',
                        'endTime': '17:00',
                        'isFullDay': False,
                        'location': 1
                    }
                ]
            }
        }
        
        # Step 2: Validate roster
        with patch('main.ROSTER_DATA', {'weekA': roster_data}):
            response = self.client.post("/api/roster/weekA/validate", json=roster_data)
            assert response.status_code == 200
            validation_result = response.json()
            assert 'valid' in validation_result
    
    def test_health_check_flow(self):
        """Test health check flow"""
        # Test API health
        response = self.client.get("/api/health")
        assert response.status_code == 200
        health_data = response.json()
        assert health_data['status'] == 'healthy'
        
        # Test root endpoint
        response = self.client.get("/")
        assert response.status_code == 200
        root_data = response.json()
        assert 'message' in root_data
        assert 'version' in root_data
    
    @patch('main.db')
    def test_error_handling_flow(self, mock_db):
        """Test error handling flow"""
        # Test 404 for non-existent worker
        mock_db.get_support_worker.return_value = None
        
        response = self.client.get("/api/workers/999")
        assert response.status_code == 404
        
        # Test 400 for invalid data
        invalid_worker_data = {
            'full_name': '',  # Invalid empty name
            'code': 'INVALID'
        }
        
        response = self.client.post("/api/workers", json=invalid_worker_data)
        assert response.status_code == 400
        
        # Test 500 for database errors
        mock_db.get_support_workers.side_effect = Exception("Database error")
        
        response = self.client.get("/api/workers")
        assert response.status_code == 500
