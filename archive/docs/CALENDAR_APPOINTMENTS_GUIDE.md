# Calendar Appointments Integration

**Last Updated:** October 1, 2025

## Overview

The Support Management System now displays **existing Google Calendar appointments** as cards before the participant schedules in Week A, Week B, Next A, and Next B. This allows you to see upcoming appointments alongside shift schedules.

---

## What This Feature Does

**This feature DISPLAYS existing calendar appointments, it does NOT export shifts to calendar.**

- Shows appointments from your Google Calendar
- Displays appointments for the selected week (Week A, B, Next A, or Next B)
- Appears as cards before participant schedule cards
- Auto-hides if no appointments exist for that week
- Includes refresh button to sync latest appointments

---

## What You'll See

### Calendar Appointments Card

At the top of each week tab (before participant schedules), you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Calendar Appointments                    [Refresh] [Hide] │
│ Oct 1 - Oct 7, 2025 • 5 appointments                   │
│                                                         │
│ Monday, Oct 1                                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Team Meeting                              🟦    │   │
│ │ 9:00 AM - 10:00 AM                              │   │
│ │ Weekly team sync                                │   │
│ │ 📍 Conference Room A                            │   │
│ │ 👥 5 attendees                                  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Tuesday, Oct 2                                          │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Doctor Appointment                        🟨    │   │
│ │ 2:00 PM - 3:00 PM                               │   │
│ │ Annual checkup                                  │   │
│ │ 📍 Medical Center                               │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Appointment Card Details

Each appointment shows:
- **Title** - Event name
- **Time** - Start and end time (or "All Day")
- **Description** - Event notes/details
- **Location** - Where the event takes place
- **Attendees** - Number of people invited
- **Color bar** - Google Calendar color coding

### Interactive Features

- **Click appointment** - Opens in Google Calendar (if link available)
- **Refresh button** - Syncs latest appointments from calendar
- **Hide/Show toggle** - Collapse/expand appointments section
- **Auto-hide** - Section doesn't appear if no appointments exist

---

## Setup Instructions

### Prerequisites

- Google Calendar account
- Google Cloud project with Calendar API enabled
- OAuth 2.0 credentials

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Note your project name

### Step 2: Enable Calendar API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click **Enable**

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: "Support Management System"
5. Authorized redirect URIs:
   - `http://localhost:3000/oauth/callback` (for development)
   - `https://your-domain.com/oauth/callback` (for production)
6. Click **Create**

### Step 4: Download Credentials

1. Click the download icon next to your OAuth client
2. Save the JSON file
3. Rename it to `client_secrets.json`
4. Place it in the `/backend/` directory

### Step 5: Environment Variables

Create or update `/backend/.env`:

```env
GOOGLE_CLIENT_SECRETS_FILE=client_secrets.json
```

### Step 6: Authorize Access

1. Start your backend server
2. Navigate to any week tab in the frontend
3. You'll see "Could not load calendar appointments" initially
4. Use the OAuth flow to authorize (implementation may vary based on your auth setup)

---

## How It Works

### Date Range Calculation

The calendar automatically fetches appointments for the correct week:

- **Week A**: Previous week (Monday 7 days ago → Sunday)
- **Week B**: Current week (This Monday → Sunday)
- **Next A**: Next week (Monday 7 days ahead → Sunday)
- **Next B**: Week after next (Monday 14 days ahead → Sunday)

### API Flow

```
Frontend (CalendarAppointments)
    ↓
    GET /api/calendar/appointments?startDate=...&endDate=...&weekType=weekA
    ↓
Backend (server.py)
    ↓
    calendar_service.get_appointments(start, end)
    ↓
Google Calendar API
    ↓
    Returns appointments list
    ↓
Frontend displays as cards
```

### Data Privacy

- **Read-only access** - Only reads calendar, never writes
- **Week-specific** - Only fetches appointments for the selected week
- **No storage** - Appointments are not saved in the database
- **Real-time** - Always shows current calendar data (with Refresh)

---

## Features

### ✅ Currently Supported

- View appointments from Google Calendar
- Group by date
- Show event details (title, time, location, description, attendees)
- Color-coded events (Google Calendar colors)
- Click to open in Google Calendar
- Refresh to sync latest
- Hide/Show toggle
- Auto-hide when no appointments
- Week-specific date ranges

### ❌ Not Included

- Creating/editing calendar events
- Exporting shifts to calendar
- Two-way sync
- Multiple calendar sources
- Filtering by calendar

---

## Troubleshooting

### No appointments showing

**Possible causes:**
1. No appointments exist for that week
2. Calendar not authorized
3. OAuth credentials not configured
4. API not enabled

**Solutions:**
1. Check your Google Calendar for the specific week
2. Complete OAuth authorization
3. Verify `client_secrets.json` exists in `/backend/`
4. Enable Calendar API in Google Cloud Console

### "Could not load calendar appointments"

**Possible causes:**
1. Backend not running
2. OAuth not configured
3. API rate limit reached
4. Network connection issue

**Solutions:**
1. Start backend server: `python server.py`
2. Complete OAuth setup steps above
3. Wait a few minutes and try again
4. Check internet connection

### Appointments not refreshing

**Solution:**
- Click the **Refresh** button manually
- Appointments are cached for performance
- Refresh fetches latest from Google Calendar

---

## API Endpoints

### GET `/api/calendar/appointments`

Fetch appointments from Google Calendar.

**Query Parameters:**
- `startDate`: ISO 8601 date string (e.g., "2025-10-01T00:00:00Z")
- `endDate`: ISO 8601 date string
- `weekType`: "weekA", "weekB", "nextA", or "nextB"

**Response:**
```json
{
  "success": true,
  "appointments": [
    {
      "id": "event_id_123",
      "summary": "Team Meeting",
      "description": "Weekly sync",
      "location": "Conference Room A",
      "start": "2025-10-01T09:00:00Z",
      "end": "2025-10-01T10:00:00Z",
      "htmlLink": "https://calendar.google.com/...",
      "colorId": "1",
      "attendees": [...]
    }
  ],
  "count": 1
}
```

### GET `/api/calendar/auth-url`

Get OAuth authorization URL.

**Query Parameters:**
- `redirect_uri`: URL to redirect after authorization

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### POST `/api/calendar/authorize`

Complete OAuth authorization.

**Request Body:**
```json
{
  "code": "authorization_code",
  "redirect_uri": "http://localhost:3000/oauth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Calendar authorized successfully"
}
```

---

## Usage Tips

### Tip 1: Check Appointments Before Scheduling

Before creating new shifts, check the Calendar Appointments card to see if there are any conflicts with existing events.

### Tip 2: Use Week Navigation

Navigate between Week A, Week B, Next A, and Next B to see appointments for different weeks.

### Tip 3: Hide When Not Needed

Use the **Hide** button to collapse the appointments section when you don't need to see it.

### Tip 4: Refresh Regularly

Click **Refresh** to ensure you're seeing the latest appointments, especially after adding events in Google Calendar.

---

## Technical Details

### Component: CalendarAppointments.js

**Location:** `/frontend/src/components/CalendarAppointments.js`

**Props:**
- `weekType`: Current week type (weekA, weekB, nextA, nextB)

**State:**
- `appointments`: Array of calendar events
- `isLoading`: Loading state
- `lastSync`: Timestamp of last refresh
- `showAppointments`: Visibility toggle

### Service: calendar_service.py

**Location:** `/backend/calendar_service.py`

**Key Methods:**
- `get_appointments(start_date, end_date, calendar_id)`: Fetch events from Google Calendar
- `get_authorization_url(redirect_uri)`: Generate OAuth URL
- `authorize_with_code(code, redirect_uri)`: Complete OAuth flow
- `set_credentials(credentials_dict)`: Set user credentials

### Permissions

The integration uses **read-only** calendar scope:
- `https://www.googleapis.com/auth/calendar.readonly`
- Can only read calendar data
- Cannot create, modify, or delete events

---

## Future Enhancements

Potential features for future updates:

1. **Multiple Calendars** - View appointments from multiple Google Calendars
2. **Calendar Selection** - Choose which calendar(s) to display
3. **Conflict Detection** - Warn if shifts conflict with appointments
4. **Calendar Filtering** - Filter appointments by type/category
5. **Sync Status** - Show last sync time and auto-refresh

---

## Support

For issues or questions:

1. Check this documentation
2. Verify OAuth setup is complete
3. Check backend logs: `/backend/server.log`
4. Ensure Calendar API is enabled in Google Cloud Console
5. Test with a different Google account

---

**Note:** This feature only READS calendar appointments. To add shifts to your calendar, use a separate export feature or manually add events to your Google Calendar.


