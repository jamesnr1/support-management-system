#!/bin/bash
# Start Sunday Copy Scheduler

cd "$(dirname "$0")"
source venv/bin/activate
python sunday_copy_scheduler.py
