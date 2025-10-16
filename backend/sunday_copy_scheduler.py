#!/usr/bin/env python3
"""
Sunday 3am Week Transition Scheduler
Automatically transitions roster data every Sunday at 3am
"""

import schedule
import time
import logging
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sunday_scheduler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def get_current_week_dates():
    """Calculate current week start and end dates (Monday to Sunday)"""
    now = datetime.now()
    days_since_monday = now.weekday()
    monday = now - timedelta(days=days_since_monday)
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    sunday = monday + timedelta(days=6)
    return monday.strftime('%Y-%m-%d'), sunday.strftime('%Y-%m-%d')

def get_next_week_dates():
    """Calculate next week start and end dates (Monday to Sunday)"""
    now = datetime.now()
    days_since_monday = now.weekday()
    monday = now - timedelta(days=days_since_monday)
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    next_monday = monday + timedelta(days=7)
    next_sunday = next_monday + timedelta(days=6)
    return next_monday.strftime('%Y-%m-%d'), next_sunday.strftime('%Y-%m-%d')

def get_week_after_next_dates():
    """Calculate week after next start and end dates (Monday to Sunday)"""
    now = datetime.now()
    days_since_monday = now.weekday()
    monday = now - timedelta(days=days_since_monday)
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    week_after_monday = monday + timedelta(days=14)
    week_after_sunday = week_after_monday + timedelta(days=6)
    return week_after_monday.strftime('%Y-%m-%d'), week_after_sunday.strftime('%Y-%m-%d')

def load_roster_data():
    """Load roster data from file"""
    roster_file = Path(__file__).parent / 'roster_data.json'
    if not roster_file.exists():
        logger.error("Roster data file not found!")
        return {}
    
    try:
        with open(roster_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading roster data: {e}")
        return {}

def save_roster_data(data):
    """Save roster data to file"""
    roster_file = Path(__file__).parent / 'roster_data.json'
    try:
        with open(roster_file, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info("Roster data saved successfully")
        return True
    except Exception as e:
        logger.error(f"Error saving roster data: {e}")
        return False

def perform_week_transition():
    """Perform the weekly roster transition"""
    logger.info("🔄 Starting Sunday 3am week transition...")
    
    try:
        # Load current data
        data = load_roster_data()
        if not data:
            logger.error("No roster data to transition")
            return False
        
        # Get correct dates
        current_start, current_end = get_current_week_dates()
        next_start, next_end = get_next_week_dates()
        after_start, after_end = get_week_after_next_dates()
        
        logger.info(f"📅 Transitioning to week: {current_start} to {current_end}")
        
        # Check if transition is needed
        current_roster = data.get('roster', {})
        if current_roster.get('start_date') == current_start:
            logger.info("✅ Week transition already up to date")
            return True
        
        # Move next week data to current week
        next_roster = data.get('roster_next', {})
        if not next_roster.get('data'):
            logger.warning("⚠️ No next week data available for transition")
            return False
        
        logger.info("📋 Moving next week data to current week...")
        data['roster'] = {
            'week_type': next_roster.get('week_type', 'weekA'),
            'start_date': current_start,
            'end_date': current_end,
            'data': next_roster.get('data', {})
        }
        
        # Move week after data to next week
        after_roster = data.get('roster_after', {})
        logger.info("📋 Moving week after data to next week...")
        data['roster_next'] = {
            'week_type': after_roster.get('week_type', 'weekA'),
            'start_date': next_start,
            'end_date': next_end,
            'data': after_roster.get('data', {})
        }
        
        # Clear week after for new planning
        data['roster_after'] = {
            'week_type': 'weekA',
            'start_date': after_start,
            'end_date': after_end,
            'data': {}
        }
        
        # Save the transitioned data
        if save_roster_data(data):
            logger.info("✅ Week transition completed successfully!")
            logger.info(f"   Current week: {current_start} to {current_end}")
            logger.info(f"   Next week: {next_start} to {next_end}")
            logger.info(f"   Week after: {after_start} to {after_end}")
            return True
        else:
            logger.error("❌ Failed to save transitioned data")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error during week transition: {e}")
        return False

def test_transition():
    """Test the transition function (for manual testing)"""
    logger.info("🧪 Testing week transition...")
    return perform_week_transition()

def main():
    """Main scheduler function"""
    logger.info("🚀 Starting Sunday 3am Week Transition Scheduler")
    logger.info("📅 Will run every Sunday at 3:00 AM")
    
    # Schedule the week transition for every Sunday at 3am
    schedule.every().sunday.at("03:00").do(perform_week_transition)
    
    # For testing, you can also run immediately
    # Uncomment the next line to test the transition right now
    # test_transition()
    
    logger.info("⏰ Scheduler started. Waiting for next Sunday 3am...")
    
    # Keep the scheduler running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
