# Support Management System - NDIS Rostering Application

**Last Updated:** October 8, 2025
**Status:** ✅ Fully Operational - 3-Week Rolling Roster
**Database:** PostgreSQL via Supabase
**Branch:** `feature/current-planning-tabs`

---

## 🎯 SYSTEM OVERVIEW

### What This System Does

This is a **specialized rostering system** for managing NDIS (National Disability Insurance Scheme) support services across 5 participants with complex support needs.

**The Challenge:**
- 5 participants with varying support needs (1:1, 2:1 ratios)
- ~100+ worker assignments per week
- Alternating week patterns (Week A vs Week B)
- 30+ active support workers
- NDIS compliance requirements (12hr/day, 50hr/week limits)
- Real-time availability tracking

**The Solution:**
- **Roster Tab:** 3-week rolling view (Current Week, Next Week, Week After)
- **Staff Tab:** Manage workers, availability, and worker cards
- **Tracking Tab:** Track participant hours by NDIS funding categories

---

## 🚀 QUICK START

### Current Running State
- **Backend:** Render (FastAPI + Supabase PostgreSQL)
- **Frontend:** Vercel (React)
- **Database:** Supabase PostgreSQL with 24 workers, 5 participants

### Start Servers

**Backend:**
```bash
cd backend
source venv/bin/activate
python server.py
```

**Frontend:**
```bash
cd frontend
yarn start
```

---

## 📊 TABS & FUNCTIONALITY

### 🗓️ **Roster Tab** (3-Week Rolling View)
**Purpose:** View and edit rosters across a 3-week rolling window

**Week Selector:**
- **Current Week** - The active roster (dates auto-update daily)
- **Next Week** - Planning for next week
- **Week After** - Planning for 2 weeks ahead

**Features:**
- ✅ Edit Mode - Modify shifts in real-time
- ✅ Week Toggle - Switch between Current/Next/After weeks
- ✅ Export Payroll CSV - Organized by date/participant for payroll
- ✅ Export Shift Report CSV - Detailed shift information with shift numbers
- ✅ Participant cards with shift details (Monday-Sunday view)
- ✅ Google Calendar integration (appointments display)
- ✅ Shift locking (🔒/🔓) - Prevent accidental changes
- ✅ Auto-location assignment (James→Plympton Park, Libby→Glandore)
- ✅ Worker filtering (only shows available workers based on availability rules)

**Validation Rules:**
- ❌ No breaks between shifts on same day (removed)
- ✅ 12-hour daily maximum per worker
- ✅ 50-hour weekly maximum per worker (configurable)
- ✅ 8-hour rest period between shifts on adjacent days
- ✅ No double-booking (same worker, different participants, overlapping times)
- ✅ Split shifts allowed (same worker, same participant, back-to-back times)

**Use Case:** This week, Grace calls in sick. Edit her shifts immediately and assign replacement workers. Lock completed shifts to prevent changes.

---

### 👥 **Staff Tab** (Worker Management)
**Purpose:** Manage support workers and their availability

**Features:**
- ✅ Worker Cards - View all active workers with their weekly availability
- ✅ Availability Modal - Set worker availability:
  - Weekly schedule (Monday-Sunday)
  - Multiple time ranges per day (e.g., 06:00-14:00, 18:00-22:00)
  - All-day availability option
- ✅ Worker Details:
  - Contact info (email, phone, Telegram ID)
  - Max hours per week
  - Skills & qualifications
  - Car availability
- ✅ Quick view of shifts in compact format

**Worker Filtering Logic:**
Workers are automatically hidden from shift assignment if:
- They have no availability set for that day
- They already have a shift that day
- They would violate the 8-hour rest rule from previous/next day
- They are on leave/unavailable

**Use Case:** Sarah can only work mornings now. Update her availability (Mon-Fri, 06:00-14:00) and she'll only appear for morning shifts.

---

### ⏱️ **Tracking Tab** (NDIS Hours Tracking)
**Purpose:** Track participant hours by NDIS funding categories

**Features:**
- ✅ Automatic hour calculation from roster data
- ✅ NDIS funding categories:
  - **SCWD** - Self Care Weekday
  - **CPWD** - Core Participation Weekday
  - **CSCP** - Core Social Community Participation
  - **DTAP** - Day Time Activity Participation
  - **CDSC** - Core Daily Social Capacity
- ✅ Time bands (Day: 6am-6pm, Evening: 6pm-10pm, Night: 10pm-6am)
- ✅ Week A/B pattern awareness
- ✅ Support ratio calculations (1:1, 2:1)
- ✅ CSV export for funding claims

**Use Case:** Generate monthly NDIS reports showing Libby's hour breakdown across all funding categories.

---

## 🏗️ ARCHITECTURE

### Backend (`/backend`)
- **Framework:** FastAPI
- **Database:** Supabase PostgreSQL
- **Port:** 8001
- **Key Files:**
  - `server.py` - Main API server (28 endpoints)
  - `database.py` - Supabase database operations
  - `models.py` - Pydantic data models
  - `validation_rules.py` - NDIS compliance validation
  - `calendar_service.py` - Google Calendar integration
  - `telegram_service.py` - Telegram bot for worker notifications
  - `roster_data.json` - Roster data storage (file-based cache)

### Frontend (`/frontend`)
- **Framework:** React 18
- **Styling:** Custom CSS with dark theme + Lucide React icons
- **Data Fetching:** @tanstack/react-query + Axios
- **Port:** 3000
- **Key Components:**
  - `RosteringSystem.js` - Main app (tabs, roster management)
  - `ParticipantSchedule.js` - Individual participant schedules
  - `ShiftForm.js` - Shift creation/editing
  - `WorkerManagement.js` - Admin tab
  - `HoursTracker.js` - Hours calculation
  - `CalendarAppointments.js` - Google Calendar integration
  - `AIChat.js` - AI assistant for roster queries
  - `AI_HANDOVER.md` - consolidated reference for AI integration and roster workflows
  - `Login.js` - Simple authentication

---

## 🔌 API ENDPOINTS

### Roster Management
```
GET    /api/roster/{roster|planner}      Get roster or planner data
POST   /api/roster/{roster|planner}      Update roster or planner data
POST   /api/roster/copy_to_planner       Copy roster → planner (flip week_type)
POST   /api/roster/transition_to_roster  Move planner → roster (Sunday automation)
POST   /api/roster/{week_type}/validate  Validate roster for NDIS compliance
```

### Workers
```
GET    /api/workers                      Get all workers
POST   /api/workers                      Create worker
PUT    /api/workers/{worker_id}          Update worker
DELETE /api/workers/{worker_id}          Delete (deactivate) worker
GET    /api/workers/{worker_id}/availability       Get availability schedule
POST   /api/workers/{worker_id}/availability       Save availability schedule
GET    /api/workers/{worker_id}/unavailability     Get unavailability periods
POST   /api/workers/{worker_id}/unavailability     Add unavailability period
DELETE /api/unavailability/{period_id}             Delete unavailability period
```

### Participants & Locations
```
GET    /api/participants                 Get all participants
GET    /api/locations                    Get all locations
```

### Google Calendar
```
GET    /api/calendar/appointments        Get calendar appointments
GET    /api/calendar/auth-url            Get OAuth authorization URL
POST   /api/calendar/authorize           Complete OAuth authorization
GET    /api/calendar/status              Get calendar connection status
```

### Telegram
```
GET    /api/telegram/status              Get bot configuration status
POST   /api/telegram/send-message        Send message to specific workers
POST   /api/telegram/broadcast           Broadcast to all workers
POST   /api/telegram/notify-coordinators Send notification to coordinators
POST   /api/telegram/shift-notification  Send shift notification
```

### AI Chat
```
POST   /api/chat                         Chat with AI assistant (OpenAI GPT-4)
```
Reference: `AI_HANDOVER.md`

---

## 📦 DATA STRUCTURE

### Roster/Planner Format
```json
{
  "roster": {
    "week_type": "weekB",
    "start_date": "2025-09-29",
    "end_date": "2025-10-05",
    "data": {
      "LIB001": {
        "2025-09-29": [
          {
            "id": "L2025092901",
            "shiftNumber": "L2025092901",
            "startTime": "06:00",
            "endTime": "10:00",
            "duration": "4",
            "ratio": "2:1",
            "supportType": "SCWD",
            "workers": [123, 456],
            "location": 1,
            "locked": false
          }
        ]
      }
    }
  },
  "planner": {
    "week_type": "weekA",
    "start_date": "",
    "end_date": "",
    "data": {}
  }
}
```

### Week Type Logic
- **`week_type`** field determines which pattern is applied
- **Week A (`weekA`)**: Libby gets 2:3 shared night support with Ace & Grace
- **Week B (`weekB`)**: James gets 2:3 shared night support with Ace & Grace
- **Copy to Planner**: Automatically flips week_type (A→B or B→A)
- **Hours Tracker**: Reads `week_type` to apply correct calculations

---

## 🎨 UI/UX DESIGN

### Color Palette
```css
/* Warm Dark Theme */
--bg-primary: #2D2B28      /* Warm dark brown */
--bg-secondary: #3E3B37    /* Lighter warm gray */
--bg-tertiary: #4A4641     /* Even lighter gray */
--accent-primary: #D4A574  /* Gold */
--accent-secondary: #8B9A7B /* Sage green */
--text-primary: #E8DDD4    /* Cream */
--text-secondary: #C4A088  /* Muted cream */
```

### Space-Saving Optimizations
- **Compact tab row:** All controls (Edit, Export, Week toggle, Calendar controls) in one row
- **Collapsible calendar:** Hide/show to maximize roster space
- **Thin borders & padding:** Tasteful but space-efficient
- **Readable fonts:** 0.9rem for buttons/labels (row height stays same regardless)

---

## ✅ KEY FEATURES

### 1. **Copy to Planner** ✅
- Copies Roster → Planner
- **Flips week_type** (A→B or B→A)
- Updates Ace/Grace locations automatically
- Preserves shift numbers and locked status

### 2. **Export Functionality** ✅
- **Payroll CSV:** Worker hours for payroll processing
- **Shifts CSV:** Detailed shift report for coordination

### 3. **NDIS Validation** ✅
- Detects double bookings (different participants, overlapping times)
- Allows split shifts (same participant, back-to-back times)
- Flags 12+ hour shifts per day
- Checks support ratios (e.g., 2:1 shift with only 1 worker)
- Validates 8h rest between adjacent days
- Validates weekly max hours (50h default, configurable per worker)

### 4. **Google Calendar Integration** ✅
- Displays participant appointments
- OAuth 2.0 authentication
- Auto-refresh on tab switch
- Week-based filtering

### 5. **Telegram Notifications** ✅
- Individual messages
- Group broadcasts
- Coordinator notifications
- Shift reminders

### 6. **AI Assistant** ✅
- Roster queries (powered by OpenAI GPT-4)
- Worker availability suggestions
- Hours calculations
- Compliance checks

### 7. **Automatic Week Transition** ✅
- Frontend checks every minute for Sunday 3am
- Backend endpoint `/api/roster/transition_to_roster` handles rotation:
  - Next Week → Current Week
  - Week After → Next Week
  - New empty Week After is created
- Dates automatically recalculate based on current date

---

## 🔧 RECENT CHANGES (Oct 8, 2025)

### Validation & UI Improvements ✅
1. ✅ **Removed break time rules** - No more 30min/2hr break requirements between shifts
2. ✅ **Updated hours limits** - 12hrs/day (was 16), 50hrs/week (was 35)
3. ✅ **Re-added shift locking** - Lock/unlock buttons (🔒/🔓) now visible on shift cards
4. ✅ **Fixed CSV exports** - Payroll CSV organized by date/participant, Shift Report includes shift numbers
5. ✅ **UI polish** - Removed location pin (📍), fixed dropdown widths, prevented text wrapping
6. ✅ **Worker dropdown sizing** - Fixed to 140px width with smaller font
7. ✅ **Location display** - Auto-assigned, compact display without wrapping

### Tab Structure ✅
```
[Roster] [Staff] [Tracking]    View: [Current Week ▾] (Oct 6 - Oct 12) | ✏️ Edit 💰 Payroll 📄 Shifts    🔄 Refresh 👁️ Hide
```

**Week Selector Options:**
- Current Week (auto-updates dates)
- Next Week
- Week After

---

## 🧪 TESTING

### Backend Tests
```bash
cd backend
pytest  # Run all tests
```

**Coverage:**
- Roster CRUD operations
- Copy to planner logic
- Week type flipping
- Validation rules
- Export functionality

### Frontend Testing
- Manual testing in browser
- Console logging for debugging
- React Query DevTools for cache inspection

---

## ⚠️ IMPORTANT BEHAVIORS

### Copy to Planner
1. **Only available in Roster tab**
2. **Flips week_type** (if Roster is Week B, Planner becomes Week A)
3. **Why flip?** Week A and B alternate. If current week is B, next week must be A.
4. **Ace/Grace locations:** Automatically updated based on new week_type

### Hours Calculation
1. **Reads `week_type`** from roster/planner data
2. **Applies correct logic** for shared night support
3. **Week A:** Libby's night hours = 2:3 shared with Ace & Grace
4. **Week B:** James's night hours = 2:3 shared with Ace & Grace

### Sunday Automation (To Be Implemented)
- Runs at 3 AM every Sunday
- Moves Planner → Roster
- Clears Planner
- Ready for next planning cycle

---

## 📚 DOCUMENTATION FILES

**Must Read:**
- `ROSTER_PLANNER_CONTEXT.md` - Detailed system architecture (READ THIS FIRST!)
- `plans.txt` - Participant requirements & Week A/B breakdown
- `HOURS_TRACKING_AUDIT.md` - Hours calculation logic

**Setup Guides:**
- `DEPLOYMENT.md` - Deploy to Vercel + Google Cloud Run
- `LOCAL_SETUP.md` - Local development setup
- `GOOGLE_CALENDAR_SETUP.md` - Calendar OAuth setup
- `AI_CHAT_SETUP.md` - OpenAI API integration

**Historical Context:**
- `REFACTOR_COMPLETE.md` - Roster/Planner refactor summary
- `CURRENT_PLANNING_REFACTOR_PLAN.md` - Refactor planning notes

---

## 🐛 TROUBLESHOOTING

### Frontend Not Loading
1. Check backend is running: `curl http://localhost:8001/api/`
2. Check frontend is running: Open http://localhost:3000
3. Clear browser cache (Cmd+Shift+R on Mac)
4. Check browser console (F12) for errors

### Data Not Saving
1. Check backend logs for errors
2. Check `roster_data.json` file permissions
3. Verify Supabase connection in backend logs

### Calendar Not Showing
1. Check `GOOGLE_CALENDAR_SETUP.md` for OAuth setup
2. Verify credentials in `.env` file
3. Re-authenticate in UI

### Telegram Not Working
1. Check `TELEGRAM_BOT_TOKEN` in `.env`
2. Verify workers have valid Telegram IDs
3. Check backend logs for Telegram API errors

---

## 🔐 ENVIRONMENT VARIABLES

**Backend (Render Environment Variables):**
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
CORS_ORIGINS=https://your-vercel-domain.com
```

**Frontend (Vercel Environment Variables):**
```bash
REACT_APP_BACKEND_URL=https://your-render-backend-url.com
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 📈 FUTURE ENHANCEMENTS

### Planned Features
- [ ] Sunday automation (3 AM transition)
- [ ] Mobile-responsive design
- [ ] Shift swap requests (worker-initiated)
- [ ] Advanced conflict detection (travel time, skill matching)
- [ ] Push notifications for shift changes
- [ ] Automated worker allocation (AI-powered)

### Under Consideration
- Multi-tenant support (multiple organizations)
- Integration with NDIS pricing guides
- Participant family portal
- Time clock integration
- GPS check-in/check-out

---

## 📞 SUPPORT

### For AI Assistants
1. **READ FIRST:** `ROSTER_PLANNER_CONTEXT.md`
2. **Check:** `plans.txt` for Week A/B logic
3. **Reference:** This README for current state

### For Developers
- Check backend logs: Terminal where `python server.py` runs
- Check frontend logs: Browser console (F12)
- Check database: Supabase dashboard
- Check roster data: `backend/roster_data.json`

---

**System Status:** ✅ Production Ready
**Last Major Update:** October 8, 2025 - Validation rules & UI improvements
**Next Milestone:** Mobile-responsive design & advanced worker filtering

