#!/usr/bin/env python3
"""
Automatic Sunday 3am Copy Scheduler
This script automatically copies Next A → Week A and Next B → Week B every Sunday at 3am
"""

import schedule
import time
import requests
import logging
import json
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sunday_copy.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

def copy_week_data(source_week, dest_week):
    """Copy data from source week to destination week"""
    try:
        logger.info(f"Starting copy: {source_week} → {dest_week}")
        
        # Get source data
        response = requests.get(f"{API_BASE}/roster/{source_week}", timeout=30)
        if response.status_code != 200:
            logger.error(f"Failed to get {source_week} data: {response.status_code}")
            return False
            
        source_data = response.json()
        
        if not source_data or len(source_data) == 0:
            logger.warning(f"No data found in {source_week} to copy")
            return True  # Not an error, just no data
            
        # Post to destination
        post_response = requests.post(
            f"{API_BASE}/roster/{dest_week}", 
            json=source_data,
            timeout=30
        )
        
        if post_response.status_code != 200:
            logger.error(f"Failed to copy to {dest_week}: {post_response.status_code}")
            return False
            
        logger.info(f"✅ Successfully copied {source_week} → {dest_week}")
        return True
        
    except Exception as e:
        logger.error(f"Error copying {source_week} → {dest_week}: {e}")
        return False

def sunday_3am_copy():
    """Perform the automatic Sunday 3am copy"""
    logger.info("🕒 Starting automatic Sunday 3am copy...")
    
    # Copy Next A → Week A
    copy_a_success = copy_week_data('nextA', 'weekA')
    
    # Copy Next B → Week B  
    copy_b_success = copy_week_data('nextB', 'weekB')
    
    if copy_a_success and copy_b_success:
        logger.info("✅ Sunday 3am copy completed successfully")
    else:
        logger.error("❌ Sunday 3am copy had errors")

def test_copy_functionality():
    """Test the copy functionality without waiting for Sunday"""
    logger.info("🧪 Testing copy functionality...")
    sunday_3am_copy()

if __name__ == "__main__":
    logger.info("🚀 Sunday Copy Scheduler starting...")
    
    # Schedule the copy for every Sunday at 3:00 AM
    schedule.every().sunday.at("03:00").do(sunday_3am_copy)
    
    logger.info("📅 Scheduled automatic copy for every Sunday at 3:00 AM")
    logger.info("💡 Use 'python sunday_copy_scheduler.py test' to test immediately")
    
    # Check if we should run a test
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        test_copy_functionality()
        logger.info("🧪 Test completed. Exiting.")
        sys.exit(0)
    
    # Keep the scheduler running
    logger.info("⏰ Scheduler running... Press Ctrl+C to stop")
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("🛑 Scheduler stopped by user")
