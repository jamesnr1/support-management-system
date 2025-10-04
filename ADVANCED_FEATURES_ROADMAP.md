# Advanced Features Roadmap

## Current System vs Advanced System Comparison

**Last Updated:** October 1, 2025

---

## 📊 Current System (MongoDB - Simple Version)

### What We Have Now:
- ✅ Basic participants, workers, locations tables
- ✅ Simple roster data stored as JSON (weekA, weekB, nextA, nextB)
- ✅ Basic shift CRUD operations
- ✅ Worker management (add/edit/delete)
- ✅ Copy Template functionality (Week A/B → Next A/B)
- ✅ Simple CSV export
- ✅ Hours tracker (frontend calculations only)
- ✅ Basic availability management (weekly schedule)

### Current Data Model:
```
participants (id, code, full_name, ndis_number, location_id, default_ratio, plan_start, plan_end)
support_workers (id, code, full_name, email, phone, status, max_hours, car, skills, sex, telegram)
locations (id, name, address)
roster_data (id, week_type, data as JSONB)
shifts (id, participant_id, worker_id, shift_date, start_time, end_time, support_type, ratio, location_id, notes, shift_number, duration)
```

---

## 🚀 Advanced System Features (From supabase_real.sql)

### 1️⃣ **Template System** ❌ NOT IMPLEMENTED
**Purpose:** Create reusable roster templates for Week A/B patterns

**New Tables Needed:**
- `roster_templates` - Store template definitions (name, week_type, is_draft)
- `template_shifts` - Template shifts using day offsets (0-6) instead of actual dates
- `applied_rosters` - Track when templates are applied to actual weeks

**Functionality:**
- Create a Week A template with all shifts as a pattern
- Create a Week B template with all shifts as a pattern
- Apply template to any week range (e.g., apply Week A template to weeks 1, 3, 5, 7)
- Modify template without affecting already-applied rosters
- Draft templates before finalizing

**UI Needs:**
- Template management tab
- Template editor (similar to current roster but pattern-based)
- "Apply Template" button with date range picker
- Template version history

---

### 2️⃣ **Unavailability Tracking** ⚠️ PARTIALLY IMPLEMENTED
**Purpose:** Track when workers are unavailable (holidays, sick leave, etc.)

**New Table Needed:**
- `unavailability_periods` (worker_id, from_date, to_date, reason, created_at)

**Current Status:**
- ✅ UI exists in availability modal (from_date, to_date, reason fields)
- ❌ NOT saving to database - currently just shows a toast notification
- ❌ NOT preventing shift assignments during unavailable periods
- ❌ NOT showing unavailable periods in worker cards

**What's Needed:**
- Backend API: `POST /api/workers/{worker_id}/unavailability`
- Backend API: `GET /api/workers/{worker_id}/unavailability`
- Backend API: `DELETE /api/unavailability/{id}`
- Frontend: Actually save unavailability data to backend
- Frontend: Display unavailability periods on worker cards
- Frontend: Prevent assigning unavailable workers to shifts
- Frontend: Show warning when scheduling conflicts with unavailability

---

### 3️⃣ **Google Calendar Integration** ❌ NOT IMPLEMENTED
**Purpose:** Sync participant appointments from Google Calendar

**New Table Needed:**
- `appointments` (participant_id, title, start_time, end_time, location, google_event_id, synced_at)

**Functionality:**
- OAuth integration with Google Calendar API
- Sync appointments for each participant
- Show appointments in roster view (conflict detection)
- Prevent scheduling shifts during appointments
- Two-way sync (create shifts → create calendar events)

**UI Needs:**
- Google Calendar connection settings
- Appointment overlay on roster
- Conflict warnings when adding shifts
- Manual sync button

---

### 4️⃣ **Funding & Billing System** ❌ NOT IMPLEMENTED
**Purpose:** Track NDIS funding codes and calculate billing

**New Tables Needed:**
- `funding_items` (code, description, service_domain, rate_category, effective_from, effective_to, is_active)
- `plan_info` (participant_id, service_domain, effective_from, effective_to, week_type, weekly_weekday_hours, weekly_evening_hours, weekly_night_hours, weekly_saturday_hours, weekly_sunday_hours, weekly_public_holiday_hours)

**Functionality:**
- Track participant plan hours by category (weekday, evening, night, Saturday, Sunday, public holiday)
- Automatically categorize shifts by time/day
- Calculate hours used per category
- Track plan depletion percentage
- Alert when approaching plan limits
- Generate proper NDIS billing codes (SCWD, SCWE, SCWN, SCSat, SCSun, SCPH, CPWD, CPWE, CPSat, CPSun, CPPH)

**Complex Views:**
- `v_shift_rate_category` - Categorize shift segments by rate category
- `v_shift_hours_by_category` - Sum hours by participant and rate category
- `v_plan_depletion` - Show hours used vs planned by category

**UI Needs:**
- Plan management tab for participants
- Hours breakdown by category (weekday, evening, night, etc.)
- Visual plan depletion indicators (progress bars)
- Billing report with NDIS codes
- Alerts when exceeding category hours

---

### 5️⃣ **Public Holidays** ❌ NOT IMPLEMENTED
**Purpose:** Track public holidays for proper rate calculations

**New Table Needed:**
- `public_holidays` (holiday_date, description)

**Functionality:**
- Pre-populated with 2025 South Australia public holidays
- Automatically apply public holiday rates to shifts on those dates
- Show public holidays in roster calendar
- Different funding codes for public holiday shifts

**UI Needs:**
- Public holiday markers on calendar
- Holiday management (add/edit/delete)
- Public holiday rate indicator on shifts

---

### 6️⃣ **Shift Tracking & Logging** ❌ NOT IMPLEMENTED
**Purpose:** Track shift lifecycle events

**New Tables Needed:**
- `shift_logs` (shift_id, log_type, message, created_at)
- `shift_cancellations` (shift_id, worker_id, cancel_time, reason_short, location_id)
- `shift_late_starts` (shift_id, worker_id, actual_start, created_at)

**Functionality:**
- Log all shift changes (created, modified, cancelled)
- Track cancellations with reason
- Track late starts
- Audit trail for shifts
- Analytics on cancellation patterns

**UI Needs:**
- Shift history/log viewer
- Cancellation reason modal
- Late start tracking
- Report on cancellations by worker

---

### 7️⃣ **Many-to-Many Shift Relationships** ⚠️ PARTIALLY IMPLEMENTED
**Purpose:** Support multiple workers and participants per shift

**New Tables Needed:**
- `shift_workers` (shift_id, worker_id, role, alloc_status, created_at)
- `shift_participants` (shift_id, participant_id)

**Current Status:**
- ✅ UI supports multiple workers per shift (array in ShiftForm)
- ❌ Backend still uses single worker_id foreign key
- ❌ NOT using junction tables

**What's Needed:**
- Migrate from `shifts.worker_id` to `shift_workers` junction table
- Support multiple participants per shift (shared shifts)
- Track worker role in shift (lead, support, shadow, etc.)
- Track allocation status (assigned, accepted, declined, cancelled)

---

### 8️⃣ **Advanced Reporting & Views** ❌ NOT IMPLEMENTED
**Purpose:** Complex SQL views for reporting

**Views Needed:**
- `v_csv_payroll_export` - Payroll export with proper NDIS codes and rate categories
- `v_csv_support_worker_shift_report` - Detailed shift report for workers
- `v_shift_report_overview` - Overview of all shifts with aggregated data
- `v_worker_effective_intervals` - Worker availability by day/time with midnight wrap handling

**Functionality:**
- One-click CSV export with all proper formatting
- Payroll ready files for accounting
- Worker availability lookup for scheduling
- Comprehensive shift reports

**UI Needs:**
- Reports tab with multiple report types
- Date range selectors
- Export buttons for each report type
- Preview before export

---

### 9️⃣ **Shift Number Auto-Generation** ❌ NOT IMPLEMENTED
**Purpose:** Automatically generate unique shift numbers

**Database Objects Needed:**
- `shift_number_seq` - Sequence for incrementing numbers
- `generate_shift_number()` - Function to create formatted shift numbers (e.g., SH-2025-000001)
- `set_shift_number()` - Trigger function
- Trigger on `shifts` table before insert

**Current Status:**
- ✅ `shift_number` field exists in shifts table
- ❌ NOT auto-generated (currently manual or empty)

**What's Needed:**
- Backend: Implement auto-generation logic
- Format: `SH-YYYY-NNNNNN` (e.g., SH-2025-000042)
- Display shift number prominently in UI

---

### 🔟 **Enhanced Worker Availability** ⚠️ PARTIALLY IMPLEMENTED
**Purpose:** Detailed availability rules with complex patterns

**New Table Needed:**
- `availability_rule` (worker_id, weekday, from_time, to_time, is_full_day, wraps_midnight)

**Current Status:**
- ✅ UI has availability modal with weekly schedule
- ❌ NOT saving to database (no availability_rule table)
- ❌ NOT checking availability when assigning shifts

**Features:**
- Full day availability (00:00-23:59)
- Overnight shifts (wraps midnight, e.g., 18:00-06:00)
- Different availability per weekday
- Prevent scheduling outside available hours

**What's Needed:**
- Create `availability_rule` table
- Backend APIs for CRUD operations
- Save availability data from modal
- Check availability when creating shifts
- Show availability warnings in UI

---

## 📈 Implementation Priority

### 🔴 HIGH PRIORITY (Core Functionality Gaps)
1. **Unavailability Tracking** - UI exists but not connected to backend
2. **Enhanced Worker Availability** - UI exists but not persisting data
3. **Many-to-Many Shift Relationships** - UI supports it, backend doesn't
4. **Shift Number Auto-Generation** - Simple but important for tracking

### 🟡 MEDIUM PRIORITY (Important Business Features)
5. **Funding & Billing System** - Critical for NDIS compliance and plan management
6. **Public Holidays** - Needed for correct billing and rate calculation
7. **Template System** - Saves time in roster creation

### 🟢 LOW PRIORITY (Nice to Have)
8. **Shift Tracking & Logging** - Audit trail and analytics
9. **Google Calendar Integration** - Convenience feature
10. **Advanced Reporting & Views** - Can use current simple export for now

---

## 🎯 Recommended Implementation Order

### Phase 1: Fix Existing UI (Week 1)
1. ✅ Connect unavailability UI to backend
   - Create `unavailability_periods` table
   - Add backend APIs
   - Save/display unavailability data
   - Show in worker cards
   
2. ✅ Connect availability UI to backend
   - Create `availability_rule` table
   - Add backend APIs
   - Save weekly schedule data
   - Validate shifts against availability

3. ✅ Implement shift number auto-generation
   - Add sequence and function
   - Display prominently in UI

### Phase 2: Fix Data Model (Week 2)
4. ✅ Migrate to many-to-many shift relationships
   - Create `shift_workers` and `shift_participants` tables
   - Update backend APIs
   - Support multiple workers per shift properly

### Phase 3: Add Core Business Features (Weeks 3-4)
5. ✅ Add public holidays support
   - Create `public_holidays` table
   - Populate with 2025 SA holidays
   - Show in calendar UI
   
6. ✅ Implement funding & billing system
   - Create `funding_items` and `plan_info` tables
   - Add plan management UI
   - Create billing views
   - Add hours tracking by category

### Phase 4: Advanced Features (Weeks 5-6)
7. ✅ Implement template system
   - Create template tables
   - Add template management UI
   - Apply templates to weeks
   
8. ✅ Add shift tracking & logging
   - Create logging tables
   - Add audit trail UI

### Phase 5: Integrations (Week 7+)
9. ✅ Google Calendar integration (if needed)
10. ✅ Advanced reporting views

---

## 💾 Database Migration Path

### Option A: Gradual Migration (Recommended)
- Keep MongoDB for current roster_data
- Add PostgreSQL/Supabase for new features
- Dual-write to both databases
- Gradually migrate data over time

### Option B: Full Migration
- Export all data from MongoDB
- Create all tables in Supabase
- Import data
- Update all backend APIs
- Switch frontend to new endpoints

### Option C: Hybrid Approach
- Use Supabase for new advanced features
- Keep MongoDB for simple roster operations
- Best of both worlds

---

## 🛠️ Technical Requirements

### Backend Changes Needed:
- [ ] Add PostgreSQL/Supabase connection (currently only MongoDB)
- [ ] Create migration scripts
- [ ] Add new API endpoints for advanced features
- [ ] Update existing endpoints for many-to-many relationships
- [ ] Implement complex views and queries

### Frontend Changes Needed:
- [ ] Connect existing unavailability UI to backend
- [ ] Connect existing availability UI to backend
- [ ] Add plan management UI
- [ ] Add template management UI
- [ ] Add reports tab
- [ ] Show plan depletion indicators
- [ ] Add public holiday markers

### Infrastructure:
- [ ] Supabase project setup (or PostgreSQL server)
- [ ] Environment variables for dual database
- [ ] Backup strategy
- [ ] Migration rollback plan

---

## 📝 Summary

**Current System:** Basic rostering with manual scheduling  
**Advanced System:** Full NDIS-compliant workforce management with:
- Automated plan tracking & billing
- Template-based roster creation
- Availability & unavailability management
- Multi-participant shifts
- Comprehensive reporting
- Audit trails
- Calendar integration

**Estimated Implementation Time:** 6-8 weeks for full advanced system  
**Next Step:** Choose which features to implement first based on business priorities



