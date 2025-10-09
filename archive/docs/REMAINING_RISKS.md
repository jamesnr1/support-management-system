# Remaining Risks & Potential Issues
**Date:** October 4, 2025  
**Status:** Post-Manual Testing Analysis

## 🔴 HIGH PRIORITY - Core Features to Test

### 1. Worker Availability System (JUST FIXED)
- ✅ **Fixed:** useMemo dependency issue
- ⚠️ **Still Need to Test:**
  - Set worker unavailable → Check if they're filtered from dropdown
  - Worker with conflicting shift → Check if filtered for that time
  - Worker availability schedule (Mon-Sun times) → Check if respected

### 2. Hours Tracking & Calculations
- ⚠️ **Needs Testing:**
  - Add shift → Hours tab updates correctly
  - Delete shift → Hours reduce correctly
  - Week A vs Week B → Correct hours tracked separately
  - Grace's daily hours (special logic)
  - 2:3 shared support calculation for night shifts
  - NDIS time bands (Day 6am-6pm, Evening 6pm-10pm, Night 10pm-6am)

### 3. Copy to Planner
- ⚠️ **Needs Testing:**
  - Copy from Roster → Data appears in Planner
  - Week type flips correctly (A→B or B→A)
  - Ace/Grace/Milan locations flip correctly
  - Original Roster data unchanged

### 4. Week Pattern Logic
- ⚠️ **Needs Testing:**
  - Planner Week A/B toggle works
  - Week A: Libby shares night support with Ace/Grace
  - Week B: James shares night support with Ace/Grace
  - Locations: Ace/Grace at Glandore Week A, Mile End Week B
  - Milan opposite: Mile End Week A, Glandore Week B

### 5. Validation Rules
- ⚠️ **Needs Testing:**
  - Worker double-booking warning (same worker, 2 participants, same time)
  - Insufficient workers warning (2:1 ratio but only 1 worker assigned)
  - Long shift warning (>10 hours)
  - Excessive hours warning (worker >16h continuous)
  - Max hours warning (worker approaching/exceeding weekly limit)
  - Break time validation (minimum 30min between shifts)

### 6. Lock/Unlock Shifts
- ✅ **Fixed:** Data loss bug
- ⚠️ **Needs Testing:**
  - Lock shift → Can't edit/delete
  - Unlock shift → Can edit/delete
  - Lock status persists after reload

### 7. Export Functions
- ⚠️ **Needs Testing:**
  - Export Payroll → CSV format correct, organized by worker
  - Export Shifts → CSV format correct, organized by participant
  - Funding codes correct (SCWD, CPWE, etc based on time/day)

### 8. Delete Shift
- ✅ **Fixed:** Data loss bug
- ⚠️ **Needs Testing:**
  - Delete shift → Only that shift removed
  - Delete from participant with multiple shifts → Others remain
  - Other participants unaffected

---

## 🟡 MEDIUM PRIORITY - Secondary Features

### 9. Calendar Integration
- ⚠️ **Untested:**
  - Calendar appointments display
  - Refresh works
  - Hide/Show toggle
  - Doesn't interfere with roster data

### 10. Telegram Messaging
- ⚠️ **Untested:**
  - Can select workers
  - Send message works
  - Messages delivered

### 11. AI Chat
- ⚠️ **Untested:**
  - Opens correctly
  - Queries work (if OpenAI key set)
  - Doesn't break other features

### 12. Worker Management
- ⚠️ **Needs Testing:**
  - Add worker → Appears immediately in shift forms
  - Edit worker details → Updates everywhere
  - Delete worker → Removed from system
  - Availability schedule saved correctly
  - Unavailability periods saved correctly

---

## 🟢 LOW PRIORITY - UI/UX

### 13. Layout & Spacing
- ✅ **Fixed:** Cards under calendar
- ✅ **Fixed:** Spacing between calendar and cards
- ⚠️ **Needs Visual Check:**
  - Responsive on different screen sizes
  - All tabs display correctly

### 14. Time Format Display
- ✅ **Fixed:** 12-hour format with AM/PM
- ⚠️ **Needs Visual Check:**
  - Consistent across all components
  - Duration displayed correctly

---

## ❓ UNKNOWN - Needs Investigation

### 15. React Query Cache Invalidation
- **Potential Issue:** Are all mutations properly invalidating caches?
- **Files to check:**
  - `RosteringSystem.js` - updateRosterMutation
  - `WorkerManagement.js` - createWorkerMutation, updateWorkerMutation
  - `ParticipantSchedule.js` - handleShiftSave, handleDeleteShift

### 16. Date Handling & Timezone
- **Potential Issue:** Are dates handled consistently?
- **Known Fixed:** UTC timezone in copyToTemplate
- **Needs Check:** Other date operations use correct timezone

### 17. Worker ID vs Worker Object Consistency
- **Potential Issue:** Some places use worker.id (number), some use workerId (string)
- **Known Pattern:** String(w) === String(workerId) comparisons everywhere
- **Risk:** Low (seems handled correctly)

---

## 🐛 Known Bug Patterns to Watch For

1. **Missing Dependencies in Hooks**
   - useMemo/useCallback/useEffect without all dependencies
   - Leads to stale data (like the availability bug)

2. **Data Structure Mismatches**
   - Expecting array but getting object (shifts.forEach bug)
   - Expecting participant wrapper but not there

3. **Type Mismatches**
   - Returning string when number expected (calculateDuration bug)
   - Can cause NaN, undefined, crashes

4. **Full Page Reloads**
   - window.location.reload() is bad UX
   - Should use React Query invalidation

5. **Props Not Passed Through**
   - ParticipantSchedule needs fullRosterData for ShiftForm
   - Missing props break child components

---

## 📋 Testing Priority Order

**MUST TEST BEFORE ROSTER CREATION:**
1. Worker availability filtering (just fixed - #1)
2. Add shift works without data loss (#8)
3. Edit shift works without crash (#6, #8)
4. Delete shift works without data loss (#8)
5. Hours tracking calculates correctly (#2)

**SHOULD TEST SOON:**
6. Copy to Planner (#3)
7. Week pattern logic (#4)
8. Validation warnings (#5)
9. Lock/Unlock (#6)
10. Export functions (#7)

**CAN TEST LATER:**
11-14. Secondary features and UI

---

## 🎯 What's Next

**Immediate Action:**
1. Test worker availability filtering NOW (just fixed)
2. Complete TEST 1 & TEST 2 (add/edit shift)
3. Try TEST 3-8 from FUNCTIONAL_AUDIT_OCT4.md

**If All Tests Pass:**
- System is safe to use for roster creation
- Monitor for any other issues during real use
- Keep backup before making changes

**If Tests Fail:**
- Report issue immediately
- I'll fix and commit
- Re-test before proceeding

---

## 💡 Lessons Learned

1. **Code audits find structural bugs** (data loss, wrong props)
2. **Manual testing finds runtime bugs** (stale memos, filtering broken)
3. **End-to-end tests would catch both** (should add in future)
4. **Core features MUST be tested manually** before declaring "ready"

The availability filtering bug proves: **Looking at code ≠ Testing code**

