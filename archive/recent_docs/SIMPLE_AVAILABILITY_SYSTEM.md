# Simple Availability System

## Overview
The availability system has been simplified from a complex calendar interface to a clean, practical day-by-day interface that's easy to use and understand.

## What Changed

### ❌ Removed Complex Components
- **AvailabilityCalendar.jsx** - 400+ line complex calendar component
- **AvailabilitySection.jsx** - Wrapper component with unnecessary complexity
- **React Big Calendar** dependency - Heavy calendar library

### ✅ New Simple Interface
- **Day-by-day grid** - 7 columns for each day of the week
- **Checkbox for availability** - Simple on/off toggle
- **24-hour option** - Checkbox for full-day availability
- **Time pickers** - Native HTML time inputs for start/end times
- **Compact design** - Fits in the existing modal without scrolling issues

## Database Schema

### New Tables Added
```sql
-- Worker Availability (weekly rules)
CREATE TABLE worker_availability (
    id UUID PRIMARY KEY,
    worker_id UUID REFERENCES support_workers(id),
    weekday INTEGER (0=Sunday, 1=Monday, etc.),
    from_time TIME,
    to_time TIME,
    is_full_day BOOLEAN,
    wraps_midnight BOOLEAN
);

-- Unavailability Periods (temporary blocks)
CREATE TABLE unavailability_periods (
    id UUID PRIMARY KEY,
    worker_id UUID REFERENCES support_workers(id),
    from_date DATE,
    to_date DATE,
    reason VARCHAR(200)
);
```

## API Endpoints

### Availability
- `GET /api/workers/{worker_id}/availability` - Get weekly availability rules
- `PUT /api/workers/{worker_id}/availability` - Update weekly availability rules

### Unavailability
- `GET /api/workers/{worker_id}/unavailability` - Get unavailability periods
- `POST /api/workers/{worker_id}/unavailability` - Add unavailability period
- `DELETE /api/unavailability/{period_id}` - Delete unavailability period

## Setup Instructions

1. **Run the SQL script** in your Supabase SQL Editor:
   ```bash
   # Copy and paste the contents of:
   backend/scripts/add_availability_tables.sql
   ```

2. **Restart the backend** to ensure new database methods are loaded:
   ```bash
   cd backend
   source venv/bin/activate
   python main.py
   ```

3. **Test the functionality**:
   - Open the frontend
   - Go to Staff tab
   - Click "Set Availability" on any worker
   - Set availability for different days
   - Save and verify data persists

## Benefits

### ✅ User Experience
- **Faster loading** - No heavy calendar library
- **Better mobile support** - Native HTML inputs work on all devices
- **Clearer interface** - Easy to see all days at once
- **No scrolling issues** - Fits in modal properly

### ✅ Technical Benefits
- **Smaller bundle size** - Removed react-big-calendar dependency
- **Better performance** - Simple React components vs complex calendar
- **Easier maintenance** - Less code to maintain
- **Better data persistence** - Proper database integration

### ✅ Data Integrity
- **Proper database schema** - Normalized tables with foreign keys
- **Data validation** - Backend validates all inputs
- **Audit trail** - Created/updated timestamps
- **Cascade deletes** - Clean up when workers are deleted

## Usage

1. **Set Weekly Availability**:
   - Check "Available" for days the worker can work
   - Check "24h" for full-day availability
   - Set specific times for partial-day availability

2. **Add Unavailability Periods**:
   - Set date ranges when worker is unavailable
   - Add reason for tracking purposes
   - Delete periods when no longer needed

3. **Data Persistence**:
   - All changes are saved to the database immediately
   - Data persists across sessions
   - Changes are reflected in roster validation

## Migration Notes

- **Existing data**: No migration needed - starts with empty availability
- **Backward compatibility**: All existing functionality preserved
- **API changes**: New endpoints added, existing ones unchanged
- **Frontend changes**: Only availability modal updated, rest unchanged

The new system is production-ready and provides a much better user experience while maintaining all the functionality of the previous system.
