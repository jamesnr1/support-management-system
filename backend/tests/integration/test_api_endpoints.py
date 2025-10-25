"""Integration tests for API endpoints"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from main import app
from database import SupabaseDatabase

class TestAPIEndpoints:
    """Integration tests for API endpoints"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.client = TestClient(app)
        self.mock_db = Mock(spec=SupabaseDatabase)
    
    @patch('main.db')
    def test_get_workers_success(self, mock_db):
        """Test successful retrieval of workers"""
        # Arrange
        expected_workers = [
            {
                'id': 1,
                'full_name': 'John Doe',
                'code': 'JD001',
                'status': 'Active',
                'phone': '1234567890',
                'telegram': 123456789
            }
        ]
        mock_db.get_support_workers.return_value = expected_workers
        
        # Act
        response = self.client.get("/api/workers")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]['full_name'] == 'John Doe'
    
    @patch('main.db')
    def test_get_workers_with_date_filter(self, mock_db):
        """Test retrieval of workers with date filter"""
        # Arrange
        expected_workers = [
            {
                'id': 1,
                'full_name': 'John Doe',
                'code': 'JD001',
                'status': 'Active'
            }
        ]
        mock_db.get_support_workers.return_value = expected_workers
        
        # Act
        response = self.client.get("/api/workers?check_date=2024-01-01")
        
        # Assert
        assert response.status_code == 200
        mock_db.get_support_workers.assert_called_once()
    
    @patch('main.db')
    def test_get_participants_success(self, mock_db):
        """Test successful retrieval of participants"""
        # Arrange
        expected_participants = [
            {
                'id': 1,
                'name': 'Participant 1',
                'code': 'P001',
                'support_ratio': '1:1'
            }
        ]
        mock_db.get_participants.return_value = expected_participants
        
        # Act
        response = self.client.get("/api/participants")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]['name'] == 'Participant 1'
    
    @patch('main.db')
    def test_get_worker_availability_success(self, mock_db):
        """Test successful retrieval of worker availability"""
        # Arrange
        worker_id = 1
        expected_rules = [
            {
                'id': 1,
                'worker_id': worker_id,
                'weekday': 1,
                'from_time': '09:00',
                'to_time': '17:00',
                'is_full_day': False
            }
        ]
        mock_db.get_availability_rules.return_value = expected_rules
        
        # Act
        response = self.client.get(f"/api/workers/{worker_id}/availability")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert 'rules' in data
        assert len(data['rules']) == 1
    
    @patch('main.db')
    def test_set_worker_availability_success(self, mock_db):
        """Test successful setting of worker availability"""
        # Arrange
        worker_id = 1
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
        
        # Act
        response = self.client.post(f"/api/workers/{worker_id}/availability", json=availability_data)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
    
    @patch('main.db')
    def test_get_roster_success(self, mock_db):
        """Test successful retrieval of roster data"""
        # Arrange
        week_type = 'weekA'
        expected_roster = {
            'P001': {
                '2024-01-01': [
                    {
                        'workers': [1, 2],
                        'startTime': '09:00',
                        'endTime': '17:00',
                        'isFullDay': False
                    }
                ]
            }
        }
        
        # Mock the ROSTER_DATA
        with patch('main.ROSTER_DATA', {week_type: expected_roster}):
            # Act
            response = self.client.get(f"/api/roster/{week_type}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert 'P001' in data
    
    @patch('main.db')
    def test_create_worker_success(self, mock_db):
        """Test successful creation of a worker"""
        # Arrange
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
        
        # Act
        response = self.client.post("/api/workers", json=worker_data)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data['full_name'] == 'Jane Doe'
    
    @patch('main.db')
    def test_get_unavailability_periods_success(self, mock_db):
        """Test successful retrieval of unavailability periods"""
        # Arrange
        worker_id = 1
        expected_periods = [
            {
                'id': 1,
                'worker_id': worker_id,
                'from_date': '2024-01-01',
                'to_date': '2024-01-07',
                'reason': 'Annual Leave'
            }
        ]
        mock_db.get_unavailability_periods.return_value = expected_periods
        
        # Act
        response = self.client.get(f"/api/workers/{worker_id}/unavailability")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]['reason'] == 'Annual Leave'
    
    @patch('main.db')
    def test_add_unavailability_period_success(self, mock_db):
        """Test successful addition of unavailability period"""
        # Arrange
        worker_id = 1
        period_data = {
            'from_date': '2024-01-01',
            'to_date': '2024-01-07',
            'reason': 'Annual Leave'
        }
        mock_db.add_unavailability_period.return_value = True
        
        # Act
        response = self.client.post(f"/api/workers/{worker_id}/unavailability", json=period_data)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
    
    def test_health_check_endpoint(self):
        """Test health check endpoint"""
        # Act
        response = self.client.get("/api/health")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        # Act
        response = self.client.get("/")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert 'message' in data
        assert 'version' in data
