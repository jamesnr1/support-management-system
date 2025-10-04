#!/usr/bin/env python3
"""
Script to create a test worker for system testing
"""
import requests
import json

# Test worker data
test_worker = {
    "full_name": "Test Worker",
    "preferred_name": "Tester",
    "phone": "555-0123",
    "email": "test.worker@example.com",
    "status": "Active",
    "notes": "This is a test worker for system testing purposes"
}

def create_test_worker():
    """Create a test worker via the API"""
    try:
        url = "http://localhost:8001/api/workers"
        headers = {"Content-Type": "application/json"}
        
        print("Creating test worker...")
        print(f"Data: {json.dumps(test_worker, indent=2)}")
        
        response = requests.post(url, json=test_worker, headers=headers)
        
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            worker_data = response.json()
            print(f"✅ Test worker created successfully!")
            print(f"Worker ID: {worker_data.get('id')}")
            print(f"Worker Code: {worker_data.get('code')}")
            print(f"Full Name: {worker_data.get('full_name')}")
            return worker_data
        else:
            print(f"❌ Failed to create test worker: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating test worker: {e}")
        return None

def list_workers():
    """List all workers to verify creation"""
    try:
        url = "http://localhost:8001/api/workers"
        response = requests.get(url)
        
        if response.status_code == 200:
            workers = response.json()
            print(f"\n📋 Current workers ({len(workers)} total):")
            for worker in workers:
                print(f"  - {worker.get('code', 'NO_CODE')}: {worker.get('full_name', 'NO_NAME')} ({worker.get('status', 'NO_STATUS')})")
        else:
            print(f"❌ Failed to list workers: {response.text}")
            
    except Exception as e:
        print(f"❌ Error listing workers: {e}")

if __name__ == "__main__":
    print("🧪 Creating Test Worker for System Testing")
    print("=" * 50)
    
    # First, list existing workers
    list_workers()
    
    # Create the test worker
    worker = create_test_worker()
    
    # List workers again to show the new one
    if worker:
        print("\n" + "=" * 50)
        list_workers()
        
        print(f"\n✅ Test worker '{worker.get('full_name')}' is ready for testing!")
        print("You can now use this worker to test the system functionality.")
