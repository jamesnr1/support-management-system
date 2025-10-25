#!/usr/bin/env python3
"""Backup and restore utility for the Support Management System"""
import os
import sys
import json
import argparse
from datetime import datetime
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

def create_backup(backup_dir=None, include_deleted=False):
    """Create a complete backup of all tables"""
    setup_logging()
    logger = get_logger("backup_restore")
    
    try:
        supabase_url, supabase_key = load_environment()
        client = create_client(supabase_url, supabase_key)
        
        # Create backup directory
        if not backup_dir:
            backup_dir = Path(f"backups/{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}")
        else:
            backup_dir = Path(backup_dir)
        
        backup_dir.mkdir(parents=True, exist_ok=True)
        logger.info("backup_started", backup_dir=str(backup_dir))
        
        # Define tables to backup
        tables = [
            'participants',
            'support_workers', 
            'shifts',
            'worker_availability',
            'unavailability_periods',
            'roster_data'
        ]
        
        backup_metadata = {
            "backup_date": datetime.now().isoformat(),
            "tables": {},
            "include_deleted": include_deleted,
            "version": os.getenv("APP_VERSION", "2.0.0")
        }
        
        total_records = 0
        
        for table in tables:
            try:
                logger.info("backing_up_table", table=table)
                
                # Build query
                query = client.table(table).select('*')
                
                # Filter out deleted records unless specifically requested
                if not include_deleted:
                    query = query.is_('deleted_at', 'null')
                
                # Execute query
                response = query.execute()
                data = response.data
                
                if data:
                    # Save to JSON file
                    backup_file = backup_dir / f"{table}.json"
                    with open(backup_file, 'w') as f:
                        json.dump(data, f, indent=2, default=str)
                    
                    record_count = len(data)
                    total_records += record_count
                    
                    backup_metadata["tables"][table] = {
                        "file": f"{table}.json",
                        "record_count": record_count,
                        "backup_size": backup_file.stat().st_size
                    }
                    
                    logger.info("table_backed_up", 
                        table=table, 
                        record_count=record_count,
                        file_size=backup_file.stat().st_size
                    )
                else:
                    logger.info("table_empty", table=table)
                    backup_metadata["tables"][table] = {
                        "file": f"{table}.json",
                        "record_count": 0,
                        "backup_size": 0
                    }
                    
            except Exception as e:
                logger.error("table_backup_failed", table=table, error=str(e))
                backup_metadata["tables"][table] = {
                    "error": str(e),
                    "record_count": 0
                }
        
        # Save backup metadata
        metadata_file = backup_dir / "backup_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(backup_metadata, f, indent=2)
        
        logger.info("backup_completed", 
            backup_dir=str(backup_dir),
            total_records=total_records,
            metadata_file=str(metadata_file)
        )
        
        return str(backup_dir), total_records
        
    except Exception as e:
        logger.error("backup_failed", error=str(e))
        raise

def restore_backup(backup_dir, confirm=False):
    """Restore from a backup"""
    setup_logging()
    logger = get_logger("backup_restore")
    
    try:
        backup_dir = Path(backup_dir)
        
        if not backup_dir.exists():
            raise ValueError(f"Backup directory {backup_dir} does not exist")
        
        # Load backup metadata
        metadata_file = backup_dir / "backup_metadata.json"
        if not metadata_file.exists():
            raise ValueError(f"Backup metadata file not found: {metadata_file}")
        
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        logger.info("restore_started", 
            backup_dir=str(backup_dir),
            backup_date=metadata.get("backup_date"),
            version=metadata.get("version")
        )
        
        if not confirm:
            print(f"WARNING: This will restore data from {metadata['backup_date']}")
            print("This operation will overwrite existing data!")
            response = input("Are you sure you want to continue? (yes/no): ")
            if response.lower() != 'yes':
                print("Restore cancelled")
                return
        
        supabase_url, supabase_key = load_environment()
        client = create_client(supabase_url, supabase_key)
        
        total_restored = 0
        
        for table, table_info in metadata["tables"].items():
            if "error" in table_info:
                logger.warning("skipping_table_with_error", 
                    table=table, 
                    error=table_info["error"]
                )
                continue
            
            backup_file = backup_dir / table_info["file"]
            if not backup_file.exists():
                logger.warning("backup_file_missing", 
                    table=table, 
                    file=str(backup_file)
                )
                continue
            
            try:
                logger.info("restoring_table", table=table)
                
                # Load backup data
                with open(backup_file, 'r') as f:
                    data = json.load(f)
                
                if not data:
                    logger.info("table_empty_skip", table=table)
                    continue
                
                # Clear existing data (optional - be careful!)
                # client.table(table).delete().neq('id', '').execute()
                
                # Insert backup data
                # Note: This is a simplified restore - in production you'd want
                # more sophisticated conflict resolution
                for record in data:
                    try:
                        # Remove id to let database generate new ones
                        if 'id' in record:
                            del record['id']
                        
                        client.table(table).insert(record).execute()
                        total_restored += 1
                        
                    except Exception as e:
                        logger.warning("record_restore_failed", 
                            table=table, 
                            record=record.get('id', 'unknown'),
                            error=str(e)
                        )
                
                logger.info("table_restored", 
                    table=table, 
                    records_restored=len(data)
                )
                
            except Exception as e:
                logger.error("table_restore_failed", table=table, error=str(e))
        
        logger.info("restore_completed", total_restored=total_restored)
        return total_restored
        
    except Exception as e:
        logger.error("restore_failed", error=str(e))
        raise

def list_backups():
    """List available backups"""
    setup_logging()
    logger = get_logger("backup_restore")
    
    backups_dir = Path("backups")
    if not backups_dir.exists():
        print("No backups directory found")
        return []
    
    backups = []
    for backup_dir in sorted(backups_dir.iterdir(), reverse=True):
        if backup_dir.is_dir():
            metadata_file = backup_dir / "backup_metadata.json"
            if metadata_file.exists():
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    total_records = sum(
                        table_info.get("record_count", 0) 
                        for table_info in metadata.get("tables", {}).values()
                    )
                    
                    backups.append({
                        "directory": str(backup_dir),
                        "date": metadata.get("backup_date"),
                        "version": metadata.get("version"),
                        "total_records": total_records,
                        "include_deleted": metadata.get("include_deleted", False)
                    })
                except Exception as e:
                    logger.warning("metadata_load_failed", 
                        backup_dir=str(backup_dir), 
                        error=str(e)
                    )
    
    return backups

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Backup and restore utility")
    parser.add_argument("action", choices=["backup", "restore", "list"], 
                       help="Action to perform")
    parser.add_argument("--backup-dir", help="Backup directory path")
    parser.add_argument("--include-deleted", action="store_true", 
                       help="Include soft-deleted records in backup")
    parser.add_argument("--confirm", action="store_true", 
                       help="Skip confirmation prompt for restore")
    
    args = parser.parse_args()
    
    try:
        if args.action == "backup":
            backup_dir, total_records = create_backup(
                args.backup_dir, 
                args.include_deleted
            )
            print(f"✅ Backup completed: {backup_dir}")
            print(f"📊 Total records backed up: {total_records}")
            
        elif args.action == "restore":
            if not args.backup_dir:
                print("❌ --backup-dir required for restore")
                sys.exit(1)
            
            total_restored = restore_backup(args.backup_dir, args.confirm)
            print(f"✅ Restore completed: {total_restored} records restored")
            
        elif args.action == "list":
            backups = list_backups()
            if not backups:
                print("No backups found")
            else:
                print("Available backups:")
                print("-" * 80)
                for backup in backups:
                    print(f"📁 {backup['directory']}")
                    print(f"   Date: {backup['date']}")
                    print(f"   Version: {backup['version']}")
                    print(f"   Records: {backup['total_records']}")
                    print(f"   Include deleted: {backup['include_deleted']}")
                    print()
    
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
