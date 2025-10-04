# Functional Audit - October 4, 2025
## Pre-Roster Creation System Check

**Purpose:** Verify all critical workflows work before creating the actual roster  
**Scope:** Roster/Planner tabs, Hours tracking, Worker management  
**Status:** IN PROGRESS

---

## Test Results Summary
- ✅ PASS: 0
- ⚠️ NEEDS TESTING: 0  
- ❌ FAIL: 0
- 🔧 FIXED: 3 (ShiftForm init, Data loss, Worker hours calculation)

---

## 1. ROSTER TAB (Current Active Week)

### 1.1 View Existing Shifts
- [ ] Participant cards display correctly
- [ ] Shift cards show all details (time, workers, location, notes)
- [ ] Empty state shows correctly if no shifts
- [ ] Week pattern logic applies correctly (Ace/Grace locations)

### 1.2 Add New Shift
- [ ] Click "+" button opens ShiftForm
- [ ] All fields populate correctly (date, participant, default ratio)
- [ ] Worker dropdown shows available workers
- [ ] Worker hours display correctly in dropdown
- [ ] Can select 1 or 2 workers based on ratio
- [ ] Location dropdown works
- [ ] Support type dropdown works
- [ ] Time pickers work (24-hour format)
- [ ] Duration calculates automatically
- [ ] Validation warnings appear when needed
- [ ] Save button works
- [ ] New shift appears immediately after save
- [ ] Hours tab updates after shift added

### 1.3 Edit Existing Shift
- [ ] Click shift card opens ShiftForm in edit mode
- [ ] All existing values pre-populate correctly
- [ ] Can modify any field
- [ ] Validation works on edit
- [ ] Save updates the shift
- [ ] Changes reflect immediately
- [ ] Hours tab updates after edit

### 1.4 Delete Shift
- [ ] Delete button appears on shift cards
- [ ] Confirmation prompt appears
- [ ] Shift removes after confirmation
- [ ] Hours tab updates after delete

### 1.5 Copy to Planner
- [ ] "Copy to Planner" button visible in tab row
- [ ] Click copies roster data to planner
- [ ] Week type flips correctly (A→B or B→A)
- [ ] Ace/Grace locations flip correctly
- [ ] Automatically switches to Planner tab
- [ ] Planner shows copied data

### 1.6 Export Functions
- [ ] "Export Payroll" button works
- [ ] "Export Shifts" button works
- [ ] Downloaded files contain correct data

### 1.7 Edit Mode Toggle
- [ ] Edit Mode button toggles on/off
- [ ] Edit mode enables shift editing
- [ ] Non-edit mode is read-only

---

## 2. PLANNER TAB (Build Future Weeks)

### 2.1 Week Pattern Selection
- [ ] Week A / Week B toggle buttons visible
- [ ] Clicking Week A loads/creates Week A pattern
- [ ] Clicking Week B loads/creates Week B pattern
- [ ] Explanation text matches selected pattern
- [ ] Pattern applies to Ace/Grace/Milan locations correctly

### 2.2 Add Shifts for Future Week
- [ ] Click "+" button opens ShiftForm
- [ ] Correct week pattern passed to form
- [ ] Worker availability checked for future dates
- [ ] Can add shifts successfully
- [ ] Shifts save to correct week pattern

### 2.3 Edit Shifts
- [ ] Can edit shifts in planner
- [ ] Changes save correctly
- [ ] Week pattern maintained

### 2.4 Worker Availability Checking
- [ ] Unavailable workers are filtered out or marked
- [ ] Worker hours from current roster + planner shown
- [ ] Warnings appear for over-allocated workers

### 2.5 Data Persistence
- [ ] Planner data persists when switching tabs
- [ ] Planner data separate from roster data
- [ ] Can have different data in Week A vs Week B pattern

### 2.6 Export Functions
- [ ] Export Payroll works from planner
- [ ] Export Shifts works from planner
- [ ] Exports contain correct week pattern data

---

## 3. HOURS TAB

### 3.1 Calculations
- ✅ NDIS time bands correct (verified previously)
- ✅ Shared support 2:3 ratio correct (verified previously)
- ✅ Grace daily hours correct (verified previously)

### 3.2 Dynamic Updates
- [ ] Hours update when shift added in Roster
- [ ] Hours update when shift edited in Roster
- [ ] Hours update when shift deleted in Roster
- [ ] Hours update when shift added in Planner
- [ ] Week A/B patterns tracked separately

### 3.3 Display
- [ ] All participants show correct totals
- [ ] Day/Evening/Night breakdown correct
- [ ] Color coding works (green/yellow/red)
- [ ] Week selector works

---

## 4. ADMIN TAB (Worker Management)

### 4.1 Worker Cards Display
- ✅ Cards load quickly (fixed previously)
- [ ] All worker info displays correctly
- [ ] Availability times show in 12-hour format
- [ ] Unavailability displays correctly

### 4.2 Add Unavailability
- [ ] Click "Set Unavailable" opens modal
- [ ] Date pickers work (entire field clickable)
- [ ] Time inputs work (12-hour format)
- [ ] Daily schedule checkboxes work
- [ ] Save creates unavailability period
- [ ] Worker card updates to show "UNAVAILABLE NOW" if applicable
- [ ] Unavailability filters workers in ShiftForm

### 4.3 Edit Availability
- [ ] Click "Edit Availability" opens modal
- [ ] Existing schedule pre-populates
- [ ] Can modify times
- [ ] Days of week order: Mon-Sun (not Sun-Sat)
- [ ] Save updates availability
- [ ] Worker card reflects new times

### 4.4 Telegram Integration
- [ ] Worker cards show Telegram icon if connected
- [ ] Telegram panel displays correctly
- [ ] Can select workers to message
- [ ] Can send message
- [ ] Styling matches theme

### 4.5 Add/Edit/Delete Workers
- [ ] Add worker form works
- [ ] Edit worker updates correctly
- [ ] Delete worker removes from system
- [ ] Changes reflect in shift forms immediately

---

## 5. CALENDAR INTEGRATION

### 5.1 Calendar Display
- [ ] Calendar button toggles visibility
- [ ] Calendar collapses completely when hidden
- [ ] Appointments display correctly
- [ ] Styling matches participant cards

### 5.2 Calendar Updates
- [ ] Refresh button fetches latest data
- [ ] "Updated" timestamp shows last sync
- [ ] Calendar data doesn't interfere with roster

---

## 6. AUTHENTICATION

### 6.1 Login Flow
- [ ] Login page displays on fresh load
- [ ] Correct credentials grant access
- [ ] Incorrect credentials rejected
- [ ] Session persists on refresh

### 6.2 Logout
- [ ] Logout button works
- [ ] Returns to login page
- [ ] Session cleared

---

## 7. DATA INTEGRITY

### 7.1 Data Separation
- [ ] Roster data separate from Planner data
- [ ] Week A pattern separate from Week B pattern
- [ ] No data bleeding between tabs

### 7.2 Data Persistence
- [ ] All changes save to backend
- [ ] Refresh doesn't lose data
- [ ] roster_data.json updates correctly

### 7.3 Validation
- [ ] Can't assign unavailable workers
- [ ] Can't create overlapping shifts for same worker
- [ ] Can't exceed worker hour limits (warnings appear)
- [ ] Required fields enforced

---

## Critical Issues Found

### 🔧 FIXED
1. **ShiftForm initialization error** - React Hooks violation causing crash when adding shifts
   - Moved state declarations to top of component
   - Removed duplicate state declarations
   - Fixed in commit: 3dd263c

2. **CRITICAL: Data loss when saving shifts** - Would delete all participants except the one being edited
   - ParticipantSchedule was only sending ONE participant's data back to backend
   - Backend would replace entire roster with that one participant
   - Fixed by merging updated participant data with existing full roster before POST
   - Fixed in commit: 9867ee5

3. **CRITICAL: Incorrect worker hours in ShiftForm dropdown** - Would show much lower hours than actual
   - ShiftForm's calculateWorkerHours expected ALL participants' data
   - Was only receiving ONE participant's data
   - Result: Worker hours appeared as 5h instead of 30h, risking massive over-allocation
   - Fixed by passing fullRosterData prop through ParticipantSchedule to ShiftForm
   - Fixed in commit: a5613f9

### ❌ OPEN ISSUES
(To be populated as audit progresses)

---

## Audit Progress
- **Started:** October 4, 2025
- **Current Section:** Starting Section 1.1
- **Estimated Completion:** TBD

