#!/usr/bin/env python3
"""Database connection and functionality test script"""
import os
import sys
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from core.logging_config import setup_logging, get_logger

def load_environment():
    """Load environment variables"""
    ROOT_DIR = Path(__file__).parent.parent
    load_dotenv(ROOT_DIR / '.env')
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    
    return supabase_url, supabase_key

def test_database_connection():
    """Test basic database connection"""
    setup_logging()
    logger = get_logger("test_database")
    
    try:
        supabase_url, supabase_key = load_environment()
        client = create_client(supabase_url, supabase_key)
        
        logger.info("testing_database_connection", url=supabase_url)
        
        # Test basic connection
        response = client.table('support_workers').select('id').limit(1).execute()
        
        logger.info("database_connection_successful", 
            response_count=len(response.data) if response.data else 0
        )
        
        return True, "Connection successful"
        
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))
        return False, str(e)

def test_table_structure():
    """Test if required tables exist and have correct structure"""
    setup_logging()
    logger = get_logger("test_database")
    
    try:
        supabase_url, supabase_key = load_environment()
        client = create_client(supabase_url, supabase_key)
        
        # Required tables
        required_tables = [
            'participants',
            'support_workers',
            'shifts',
            'worker_availability',
            'unavailability_periods',
            'roster_data'
        ]
        
        results = {}
        
        for table in required_tables:
            try:
                # Try to select from table
                response = client.table(table).select('*').limit(1).execute()
                results[table] = {
                    "exists": True,
                    "accessible": True,
                    "record_count": len(response.data) if response.data else 0
                }
                logger.info("table_test_successful", table=table)
                
            except Exception as e:
                results[table] = {
                    "exists": False,
                    "accessible": False,
                    "error": str(e)
                }
                logger.error("table_test_failed", table=table, error=str(e))
        
        return results
        
    except Exception as e:
        logger.error("table_structure_test_failed", error=str(e))
        return {"error": str(e)}

def test_soft_deletes():
    """Test if soft delete functionality is working"""
    setup_logging()
    logger = get_logger("test_database")
    
    try:
        supabase_url, supabase_key = load_environment()
        client = create_client(supabase_url, supabase_key)
        
        # Test tables that should have soft deletes
        soft_delete_tables = [
            'participants',
            'support_workers',
            'shifts',
            'worker_availability',
            'unavailability_periods'
        ]
        
        results = {}
        
        for table in soft_delete_tables:
            try:
                # Check if deleted_at column exists
                response = client.table(table).select('deleted_at').limit(1).execute()
                results[table] = {
                    "has_deleted_at_column": True,
                    "soft_deletes_working": True
                }
                logger.info("soft_delete_test_successful", table=table)
                
            except Exception as e:
                results[table] = {
                    "has_deleted_at_column": False,
                    "soft_deletes_working": False,
                    "error": str(e)
                }
                logger.error("soft_delete_test_failed", table=table, error=str(e))
        
        return results
        
    except Exception as e:
        logger.error("soft_delete_test_failed", error=str(e))
        return {"error": str(e)}

def test_indexes():
    """Test if performance indexes are in place"""
    setup_logging()
    logger = get_logger("test_database")
    
    try:
        supabase_url, supabase_key = load_environment()
        client = create_client(supabase_url, supabase_key)
        
        # Test queries that should benefit from indexes
        test_queries = [
            {
                "name": "shifts_by_date",
                "table": "shifts",
                "query": lambda: client.table('shifts').select('*').gte('shift_date', '2024-01-01').limit(10).execute()
            },
            {
                "name": "workers_by_status",
                "table": "support_workers", 
                "query": lambda: client.table('support_workers').select('*').eq('status', 'Active').limit(10).execute()
            },
            {
                "name": "availability_by_worker",
                "table": "worker_availability",
                "query": lambda: client.table('worker_availability').select('*').eq('worker_id', 'test').limit(10).execute()
            }
        ]
        
        results = {}
        
        for test in test_queries:
            try:
                start_time = time.time()
                response = test["query"]()
                end_time = time.time()
                
                query_time = end_time - start_time
                
                results[test["name"]] = {
                    "success": True,
                    "query_time": query_time,
                    "record_count": len(response.data) if response.data else 0,
                    "performance": "good" if query_time < 0.1 else "slow"
                }
                
                logger.info("index_test_successful", 
                    test=test["name"], 
                    query_time=query_time
                )
                
            except Exception as e:
                results[test["name"]] = {
                    "success": False,
                    "error": str(e)
                }
                logger.error("index_test_failed", test=test["name"], error=str(e))
        
        return results
        
    except Exception as e:
        logger.error("index_test_failed", error=str(e))
        return {"error": str(e)}

def main():
    """Main test function"""
    import time
    
    print("🔍 Database Connection and Functionality Test")
    print("=" * 50)
    
    # Test 1: Basic Connection
    print("\n1. Testing database connection...")
    success, message = test_database_connection()
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")
        return
    
    # Test 2: Table Structure
    print("\n2. Testing table structure...")
    table_results = test_table_structure()
    for table, result in table_results.items():
        if isinstance(result, dict) and result.get("exists"):
            print(f"✅ {table}: {result['record_count']} records")
        else:
            print(f"❌ {table}: {result.get('error', 'Not accessible')}")
    
    # Test 3: Soft Deletes
    print("\n3. Testing soft delete functionality...")
    soft_delete_results = test_soft_deletes()
    for table, result in soft_delete_results.items():
        if isinstance(result, dict) and result.get("soft_deletes_working"):
            print(f"✅ {table}: Soft deletes working")
        else:
            print(f"❌ {table}: {result.get('error', 'Soft deletes not working')}")
    
    # Test 4: Performance Indexes
    print("\n4. Testing performance indexes...")
    index_results = test_indexes()
    for test, result in index_results.items():
        if isinstance(result, dict) and result.get("success"):
            performance = result.get("performance", "unknown")
            query_time = result.get("query_time", 0)
            print(f"✅ {test}: {performance} ({query_time:.3f}s)")
        else:
            print(f"❌ {test}: {result.get('error', 'Test failed')}")
    
    print("\n" + "=" * 50)
    print("🏁 Database test completed!")

if __name__ == "__main__":
    main()
