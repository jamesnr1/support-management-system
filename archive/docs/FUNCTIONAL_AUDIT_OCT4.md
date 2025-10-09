# Functional Audit - October 4, 2025
## Pre-Roster Creation System Check

**Purpose:** Verify all critical workflows work before creating the actual roster  
**Scope:** Roster/Planner tabs, Hours tracking, Worker management  
**Status:** IN PROGRESS

---

## Test Results Summary
- ✅ PASS: 0
- ⚠️ NEEDS TESTING: Manual testing required (see section 8)
- ❌ FAIL: 0
- 🔧 FIXED: 4 CRITICAL BUGS (all would cause data loss or system failure!)

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

4. **CRITICAL: Data loss in delete and lock shift functions** - Would delete all participants when deleting/locking ANY shift
   - handleDeleteShift and handleToggleLock were accessing rosterData[participant.code]
   - But rosterData is already participant-specific (no wrapper)
   - Result: Only sent partial data structure to onRosterUpdate
   - Would delete ALL other participants' shifts!
   - Fixed by correctly wrapping data structure before calling onRosterUpdate
   - Fixed in commit: e1f3930

### ❌ OPEN ISSUES
(None found during code audit - manual testing required)

---

## Audit Progress
- **Started:** October 4, 2025
- **Code Review:** COMPLETE
- **Critical Bugs Found:** 4 (all fixed)
- **Manual Testing:** REQUIRED before roster creation

---

## 8. WHAT TO TEST NOW

### 🎯 Critical Path Testing (15 minutes)

Test these workflows to verify the fixes work:

**1. Add a shift in Roster tab:**
- Go to Roster tab
- Turn on Edit Mode
- Click "+" to add a shift to James
- Select workers, times, location
- Save
- ✅ CHECK: All other participants still have their shifts (not deleted)
- ✅ CHECK: Worker hours in dropdown are accurate (e.g., 30h not 5h)

**2. Edit an existing shift:**
- Click "Edit" on any shift
- Change time or worker
- Save
- ✅ CHECK: Only that shift changed, others unchanged

**3. Delete a shift:**
- Click "Delete" on a shift
- Confirm deletion
- ✅ CHECK: Only that shift deleted, all others remain

**4. Lock/Unlock a shift:**
- Click "Lock" on a shift
- ✅ CHECK: Shift is locked (can't edit/delete)
- Click "Unlock"
- ✅ CHECK: Can now edit/delete again
- ✅ CHECK: All other participants' shifts still exist

**5. Copy to Planner:**
- In Roster tab, click "Copy to Planner"
- Switch to Planner tab
- ✅ CHECK: Data copied correctly
- ✅ CHECK: Week type flipped (A→B or B→A)

**6. Add shift in Planner:**
- In Planner tab, add a shift
- ✅ CHECK: Shift saves correctly
- ✅ CHECK: Roster tab data unchanged

**7. Hours Tab:**
- Go to Hours tab
- ✅ CHECK: Hours display correctly
- Go back to Roster, add a shift
- Go to Hours tab
- ✅ CHECK: Hours updated with new shift

**8. Worker Availability:**
- Go to Admin tab
- Set a worker unavailable for a date
- Go to Roster, try to add shift on that date
- ✅ CHECK: Unavailable worker not shown or marked

### ⚠️ What Could Still Break

Based on the audit, these areas were NOT fully tested:
- Export Payroll/Shifts functions (should work, but verify CSV output)
- Calendar integration (separate system, unlikely to affect roster)
- Telegram messaging (separate system)
- AI Chat (separate system)
- Week pattern toggle in Planner (logic looks correct but not tested)

---

## CONCLUSION

**Status: READY FOR MANUAL TESTING**

✅ **4 Critical Bugs Fixed:**
1. ShiftForm crash (React Hooks)
2. Data loss on shift save
3. Incorrect worker hours  
4. Data loss on delete/lock

**Next Steps:**
1. Run the critical path testing above (15 min)
2. If all tests pass → Safe to create roster
3. If anything fails → Report issue for immediate fix

**Risk Assessment:**
- **Before Fixes:** 🔴 CRITICAL - Would lose all data on any shift operation
- **After Fixes:** 🟢 LOW - Core data operations should work correctly

