#!/usr/bin/env python3
"""Database backup script"""
import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from database import db
from core.logging_config import setup_logging, get_logger

def backup_all_tables():
    """Backup all tables to JSON files"""
    logger = get_logger("backup")
    
    try:
        # Create backup directory
        backup_dir = Path("backups") / datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("backup_started", backup_dir=str(backup_dir))
        
        # Tables to backup
        tables = [
            'participants',
            'support_workers', 
            'shifts',
            'worker_availability',
            'unavailability_periods',
            'locations'
        ]
        
        backup_summary = {
            "backup_date": datetime.now().isoformat(),
            "tables": {}
        }
        
        for table in tables:
            try:
                logger.info("backing_up_table", table=table)
                
                # Get all data from table
                if table == 'support_workers':
                    data = db.get_all_support_workers()
                elif table == 'participants':
                    data = db.get_all_participants()
                elif table == 'shifts':
                    data = db.get_all_shifts()
                elif table == 'worker_availability':
                    data = db.get_all_worker_availability()
                elif table == 'unavailability_periods':
                    data = db.get_all_unavailability_periods()
                elif table == 'locations':
                    data = db.get_all_locations()
                else:
                    logger.warning("unknown_table", table=table)
                    continue
                
                # Save to JSON file
                backup_file = backup_dir / f"{table}.json"
                with open(backup_file, 'w') as f:
                    json.dump(data, f, indent=2, default=str)
                
                record_count = len(data) if isinstance(data, list) else 1
                backup_summary["tables"][table] = {
                    "records": record_count,
                    "file": str(backup_file)
                }
                
                logger.info("table_backed_up", 
                    table=table, 
                    records=record_count,
                    file=str(backup_file)
                )
                
            except Exception as e:
                logger.error("table_backup_failed", 
                    table=table, 
                    error=str(e)
                )
                backup_summary["tables"][table] = {
                    "error": str(e),
                    "records": 0
                }
        
        # Save backup summary
        summary_file = backup_dir / "backup_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(backup_summary, f, indent=2)
        
        total_records = sum(
            t.get("records", 0) for t in backup_summary["tables"].values()
            if isinstance(t, dict) and "records" in t
        )
        
        logger.info("backup_completed", 
            backup_dir=str(backup_dir),
            total_records=total_records,
            summary_file=str(summary_file)
        )
        
        print(f"✅ Backup completed successfully!")
        print(f"📁 Backup saved to: {backup_dir}")
        print(f"📊 Total records backed up: {total_records}")
        print(f"📋 Summary: {summary_file}")
        
        return backup_dir
        
    except Exception as e:
        logger.error("backup_failed", error=str(e))
        print(f"❌ Backup failed: {e}")
        return None

if __name__ == "__main__":
    setup_logging()
    backup_all_tables()
