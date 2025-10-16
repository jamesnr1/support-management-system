#!/bin/bash
# Start the Sunday Week Transition Scheduler

echo "🚀 Starting Sunday 3am Week Transition Scheduler..."

# Change to the backend directory
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Install schedule if not already installed
pip install schedule==1.2.0

# Start the scheduler
echo "📅 Scheduler will run every Sunday at 3:00 AM"
echo "⏰ Starting scheduler process..."

# Run the scheduler in the background
nohup python sunday_copy_scheduler.py > sunday_scheduler.log 2>&1 &

# Get the process ID
SCHEDULER_PID=$!
echo "✅ Scheduler started with PID: $SCHEDULER_PID"
echo "📝 Logs are being written to: sunday_scheduler.log"

# Save the PID for later reference
echo $SCHEDULER_PID > sunday_scheduler.pid

echo "🎉 Sunday 3am Week Transition Scheduler is now running!"
echo "   - Every Sunday at 3:00 AM, it will automatically transition roster data"
echo "   - Next week data becomes current week"
echo "   - Week after data becomes next week"
echo "   - Week after is cleared for new planning"
