#!/usr/bin/env python3
"""
Script to sync live website data to local development environment
"""
import os
import requests
import json
from supabase import create_client, Client

# Configuration - Update these with your actual values
LIVE_SUPABASE_URL = "https://vskqemnnjozeirizbutj.supabase.co"
LIVE_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZza3FlbW5uam96ZWlyaXpidXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjE5NDYsImV4cCI6MjA3Mzk5Nzk0Nn0.qdmY6qVNquRwWBWTakdg06HiTHYRkF1HbaAEFfZYgR4"
LOCAL_SUPABASE_URL = "http://localhost:8001"  # Your local backend URL
LOCAL_SUPABASE_KEY = "your-local-anon-key"  # Not needed for local backend

def sync_table_data(live_client: Client, local_backend_url: str, table_name: str):
    """Sync data from live to local for a specific table"""
    print(f"Syncing {table_name}...")
    
    try:
        # Get data from live Supabase
        response = live_client.table(table_name).select("*").execute()
        live_data = response.data
        
        if not live_data:
            print(f"No data found in live {table_name}")
            return
        
        # Clear local table via backend API
        try:
            requests.delete(f"{local_backend_url}/api/clear-table/{table_name}")
        except:
            print(f"⚠️ Could not clear local {table_name} table (might not exist)")
        
        # Insert live data to local via backend API
        for record in live_data:
            try:
                if table_name == "support_workers":
                    requests.post(f"{local_backend_url}/api/workers", json=record)
                elif table_name == "availability_rule":
                    # Handle availability rules differently
                    worker_id = record.get('worker_id')
                    if worker_id:
                        requests.post(f"{local_backend_url}/api/workers/{worker_id}/availability", 
                                    json={"rules": [record]})
                # Add other table handlers as needed
            except Exception as e:
                print(f"⚠️ Could not insert record into {table_name}: {e}")
        
        print(f"✅ Synced {len(live_data)} records for {table_name}")
        
    except Exception as e:
        print(f"❌ Error syncing {table_name}: {e}")

def main():
    print("🔄 Starting data sync from live to local...")
    print("⚠️ Make sure your local backend is running on http://localhost:8001")
    
    # Create live Supabase client
    live_client = create_client(LIVE_SUPABASE_URL, LIVE_SUPABASE_KEY)
    
    # Tables to sync
    tables_to_sync = [
        "support_workers",
        "availability_rule", 
        "unavailability_periods",
        "participants",
        "locations"
        # Note: shifts might be handled differently
    ]
    
    for table in tables_to_sync:
        sync_table_data(live_client, LOCAL_SUPABASE_URL, table)
    
    print("✅ Data sync completed!")
    print("💡 You can now start your local development with live data")

if __name__ == "__main__":
    main()
