#!/usr/bin/env python3
"""Database migration utility for the Support Management System"""
import os
import sys
import argparse
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

def run_sql_file(client, sql_file_path):
    """Execute SQL file against the database"""
    logger = get_logger("database_migration")
    
    try:
        with open(sql_file_path, 'r') as f:
            sql_content = f.read()
        
        logger.info("executing_sql_file", file=str(sql_file_path))
        
        # Split SQL content by semicolons and execute each statement
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements):
            if statement:
                try:
                    logger.info("executing_statement", 
                        statement_number=i+1, 
                        total_statements=len(statements)
                    )
                    
                    # Execute the SQL statement
                    result = client.rpc('exec_sql', {'sql': statement}).execute()
                    
                    logger.info("statement_executed", 
                        statement_number=i+1,
                        result=str(result.data) if result.data else "success"
                    )
                    
                except Exception as e:
                    logger.error("statement_failed", 
                        statement_number=i+1,
                        statement=statement[:100] + "..." if len(statement) > 100 else statement,
                        error=str(e)
                    )
                    raise
        
        logger.info("sql_file_completed", file=str(sql_file_path))
        return True
        
    except Exception as e:
        logger.error("sql_file_failed", file=str(sql_file_path), error=str(e))
        raise

def check_database_schema(client):
    """Check current database schema"""
    logger = get_logger("database_migration")
    
    try:
        # Check if tables exist
        tables_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
        """
        
        result = client.rpc('exec_sql', {'sql': tables_query}).execute()
        tables = [row['table_name'] for row in result.data] if result.data else []
        
        logger.info("database_schema_check", tables=tables)
        
        # Check for soft delete columns
        soft_delete_check = """
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'deleted_at';
        """
        
        result = client.rpc('exec_sql', {'sql': soft_delete_check}).execute()
        soft_delete_tables = [row['table_name'] for row in result.data] if result.data else []
        
        # Check for indexes
        indexes_check = """
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        ORDER BY tablename, indexname;
        """
        
        result = client.rpc('exec_sql', {'sql': indexes_check}).execute()
        indexes = [(row['tablename'], row['indexname']) for row in result.data] if result.data else []
        
        schema_info = {
            "tables": tables,
            "soft_delete_tables": soft_delete_tables,
            "indexes": indexes,
            "has_soft_deletes": len(soft_delete_tables) > 0,
            "has_indexes": len(indexes) > 0
        }
        
        logger.info("schema_analysis", **schema_info)
        return schema_info
        
    except Exception as e:
        logger.error("schema_check_failed", error=str(e))
        raise

def migrate_database(migration_type="complete", dry_run=False):
    """Run database migrations"""
    setup_logging()
    logger = get_logger("database_migration")
    
    try:
        supabase_url, supabase_key = load_environment()
        client = create_client(supabase_url, supabase_key)
        
        logger.info("migration_started", migration_type=migration_type, dry_run=dry_run)
        
        # Check current schema
        schema_info = check_database_schema(client)
        
        if dry_run:
            logger.info("dry_run_mode", schema_info=schema_info)
            print("DRY RUN - No changes will be made")
            print(f"Current tables: {schema_info['tables']}")
            print(f"Soft delete tables: {schema_info['soft_delete_tables']}")
            print(f"Indexes: {len(schema_info['indexes'])}")
            return
        
        # Define migration files
        migration_files = {
            "soft_deletes": "scripts/add_soft_deletes.sql",
            "indexes": "scripts/add_indexes.sql", 
            "foreign_keys": "scripts/fix_foreign_keys.sql",
            "complete": "scripts/complete_database_upgrade.sql"
        }
        
        if migration_type not in migration_files:
            raise ValueError(f"Unknown migration type: {migration_type}")
        
        migration_file = Path(migration_files[migration_type])
        
        if not migration_file.exists():
            raise FileNotFoundError(f"Migration file not found: {migration_file}")
        
        # Run the migration
        success = run_sql_file(client, migration_file)
        
        if success:
            # Check schema after migration
            new_schema = check_database_schema(client)
            
            logger.info("migration_completed", 
                migration_type=migration_type,
                new_schema=new_schema
            )
            
            print(f"✅ Migration '{migration_type}' completed successfully")
            print(f"📊 Tables: {len(new_schema['tables'])}")
            print(f"🗑️ Soft delete tables: {len(new_schema['soft_delete_tables'])}")
            print(f"📈 Indexes: {len(new_schema['indexes'])}")
        
    except Exception as e:
        logger.error("migration_failed", error=str(e))
        raise

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Database migration utility")
    parser.add_argument("action", choices=["migrate", "check"], 
                       help="Action to perform")
    parser.add_argument("--type", choices=["soft_deletes", "indexes", "foreign_keys", "complete"],
                       default="complete", help="Migration type")
    parser.add_argument("--dry-run", action="store_true", 
                       help="Show what would be done without making changes")
    
    args = parser.parse_args()
    
    try:
        if args.action == "migrate":
            migrate_database(args.type, args.dry_run)
        elif args.action == "check":
            supabase_url, supabase_key = load_environment()
            client = create_client(supabase_url, supabase_key)
            schema_info = check_database_schema(client)
            
            print("Database Schema Status:")
            print("-" * 40)
            print(f"Tables: {len(schema_info['tables'])}")
            print(f"Soft delete tables: {len(schema_info['soft_delete_tables'])}")
            print(f"Indexes: {len(schema_info['indexes'])}")
            print()
            print("Tables:", ", ".join(schema_info['tables']))
            print("Soft delete tables:", ", ".join(schema_info['soft_delete_tables']))
    
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
