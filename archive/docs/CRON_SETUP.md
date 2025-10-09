# Automatic Roster Transition Setup

## Overview
The system automatically transitions rosters every Sunday at 2:30 AM:
- **Planner Next Week** → **Active Roster**
- **Planner Week After** → **Planner Next Week**
- **Planner Week After** → Cleared for new planning

## Setup Instructions

### 1. Test the Script First
```bash
# Test manually with force mode
cd /Users/James/support-management-system/backend
python auto_transition_roster.py --force
```

### 2. Add to Crontab
```bash
# Open crontab editor
crontab -e

# Add this line (adjust path if needed):
30 2 * * 0 /usr/bin/python3 /Users/James/support-management-system/backend/auto_transition_roster.py >> /Users/James/support-management-system/backend/transition.log 2>&1
```

### 3. Verify Cron Job
```bash
# List current cron jobs
crontab -l

# Check if cron is running
sudo launchctl list | grep cron
```

### 4. Monitor Logs
```bash
# View transition logs
tail -f /Users/James/support-management-system/backend/transition.log

# Check backups created
ls -la /Users/James/support-management-system/backend/roster_backups/
```

## Cron Schedule Explained
`30 2 * * 0`
- `30` - Minute (30 minutes past the hour)
- `2` - Hour (2 AM)
- `*` - Day of month (every day)
- `*` - Month (every month)
- `0` - Day of week (0 = Sunday)

## Manual Operations

### Force Transition (Emergency Use)
```bash
python /Users/James/support-management-system/backend/auto_transition_roster.py --force
```

### Restore from Backup
```bash
# List available backups
ls -la backend/roster_backups/

# Restore specific backup
cp backend/roster_backups/roster_data_backup_YYYYMMDD_HHMMSS.json backend/roster_data.json
```

## Troubleshooting

### Cron Not Running
1. Check if cron service is enabled:
   ```bash
   sudo launchctl load -w /System/Library/LaunchDaemons/com.vix.cron.plist
   ```

2. Check mail for cron errors:
   ```bash
   mail
   ```

### Permission Issues
Ensure the script has execute permissions:
```bash
chmod +x /Users/James/support-management-system/backend/auto_transition_roster.py
```

### Python Path Issues
If cron can't find Python, use full path:
```bash
which python3  # Find your Python path
# Update crontab with the full path
```

## Disable Auto-Transition
To temporarily disable:
```bash
# Comment out the line in crontab
crontab -e
# Add # at the beginning of the roster transition line
```

## Backup Retention
The system keeps the last 10 backups automatically. To change this:
1. Edit `auto_transition_roster.py`
2. Find `cleanup_old_backups(keep_count=10)`
3. Change the number as needed
