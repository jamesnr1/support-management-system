# Critical Bug Fix: Worker Hours Double-Counting

## Problem Description

When editing a 2:1 shift and changing one worker, the system incorrectly calculates hours for the unchanged worker, causing their hours to be added twice.

**Example:**
- Shift: 10am-2pm (4 hours) with Worker A + Worker B
- Worker A current hours: 10h
- Worker B current hours: 10h
- Edit shift to replace Worker A with Worker C
- **BUG:** Worker B shows 14h (10h + 4h) instead of 10h (unchanged)

## Root Cause

In `frontend/src/components/ShiftForm.js`, the `getAvailableWorkers` function (around line 125-170) has incorrect logic when checking if a worker who was in the original shift remains in the edited shift.

## Fix Location 1: getAvailableWorkers function

**File:** `frontend/src/components/ShiftForm.js`
**Line:** ~125-170

### BEFORE (Buggy Code):
```javascript
if (editingShift) {
  const wasInOriginalShift = editingShift.workers && editingShift.workers.some(w => String(w) === String(worker.id));
  const isInNewShift = formData.workers && formData.workers.some(w => String(w) === String(worker.id));
  
  if (wasInOriginalShift && isInNewShift) {
    // ❌ BUG: This doesn't account for duration changes!
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date);
    totalWithNew = weeklyHours; // No change in hours
  } else if (!wasInOriginalShift && isInNewShift) {
    // Worker being added - exclude current shift and add new duration
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date, editingShift.id);
    totalWithNew = weeklyHours + (newShiftMinutes / 60);
  } else {
    // Worker being removed or not involved - use current hours
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date);
    totalWithNew = weeklyHours;
  }
}
```

### AFTER (Fixed Code):
```javascript
if (editingShift) {
  const wasInOriginalShift = editingShift.workers?.some(w => String(w) === String(worker.id));
  const isInNewShift = currentFormData.workers?.some(w => String(w) === String(worker.id));
  
  if (wasInOriginalShift && isInNewShift) {
    // ✅ FIX: Worker STAYS in shift (may have different duration)
    // ALWAYS exclude the editing shift to prevent double-counting
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date, editingShift.id);
    // Then add the NEW duration (which may be different from original)
    totalWithNew = weeklyHours + (newShiftMinutes / 60);
  } else if (!wasInOriginalShift && isInNewShift) {
    // Worker being ADDED to shift
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date, editingShift.id);
    totalWithNew = weeklyHours + (newShiftMinutes / 60);
  } else {
    // Worker being REMOVED or not involved
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date);
    totalWithNew = weeklyHours;
  }
}
```

## Fix Location 2: validateShift function

**File:** `frontend/src/components/ShiftForm.js`
**Line:** ~630-660

### BEFORE (Buggy Code):
```javascript
// 4. CHECK MAXIMUM WEEKLY HOURS
if (worker.max_hours) {
  let currentHours, totalHours;
  
  if (editingShift) {
    const wasInOriginalShift = editingShift.workers && editingShift.workers.some(w => String(w) === String(workerId));
    const isInNewShift = shiftData.workers && shiftData.workers.some(w => String(w) === String(workerId));
    
    if (wasInOriginalShift && isInNewShift) {
      // ❌ BUG: Worker unchanged - use current hours without modification
      currentHours = calculateWorkerWeeklyHours(workerId, date);
      totalHours = currentHours; // No change in hours
    } else if (!wasInOriginalShift && isInNewShift) {
      // Worker being added - exclude current shift and add new duration
      currentHours = calculateWorkerWeeklyHours(workerId, date, editingShift.id);
      totalHours = currentHours + duration;
    }
  }
}
```

### AFTER (Fixed Code):
```javascript
// 4. CHECK MAXIMUM WEEKLY HOURS
if (worker.max_hours) {
  let currentHours, totalHours;
  
  if (editingShift) {
    const wasInOriginalShift = editingShift.workers?.some(w => String(w) === String(workerId));
    const isInNewShift = shiftData.workers?.some(w => String(w) === String(workerId));
    
    if (wasInOriginalShift && isInNewShift) {
      // ✅ FIX: Worker unchanged - ALWAYS exclude editing shift to prevent double-counting
      currentHours = calculateWorkerWeeklyHours(workerId, date, editingShift.id);
      totalHours = currentHours + duration; // Add NEW duration
    } else if (!wasInOriginalShift && isInNewShift) {
      // Worker being added - exclude current shift and add new duration
      currentHours = calculateWorkerWeeklyHours(workerId, date, editingShift.id);
      totalHours = currentHours + duration;
    } else if (wasInOriginalShift && !isInNewShift) {
      // Worker being removed - exclude current shift (hours will decrease)
      currentHours = calculateWorkerWeeklyHours(workerId, date, editingShift.id);
      totalHours = currentHours; // Hours will decrease, no warning needed
    } else {
      // Worker not involved in this shift
      currentHours = calculateWorkerWeeklyHours(workerId, date);
      totalHours = currentHours;
    }
  } else {
    // New shift - add duration to current hours
    currentHours = calculateWorkerWeeklyHours(workerId, date);
    totalHours = currentHours + duration;
  }
}
```

## Key Changes Explained

### Change 1: Always Exclude Editing Shift
**Old Logic:** When a worker stays in the shift, just use current hours
**New Logic:** When a worker stays in the shift, exclude the old shift and add the new duration

**Why:** The "current hours" already include the old shift's hours. If we don't exclude it, we count it twice (once in current hours, once in the new duration).

### Change 2: Handle Duration Changes
**Old Logic:** Assumed if a worker stays in shift, hours don't change
**New Logic:** Recognize that shift duration might change even if worker stays

**Why:** User might change shift from 4 hours to 6 hours. The 2-hour difference needs to be reflected.

### Change 3: Use Optional Chaining
**Old Logic:** `editingShift.workers && editingShift.workers.some(...)`
**New Logic:** `editingShift.workers?.some(...)`

**Why:** Cleaner, more modern JavaScript. Prevents null reference errors.

## Test Cases

### Test Case 1: Replace One Worker in 2:1 Shift
```
Initial State:
- Shift: 10am-2pm (4h) with Worker A + Worker B
- Worker A: 20h weekly
- Worker B: 15h weekly

Action: Replace Worker A with Worker C

Expected Result:
- Worker A: 16h weekly (20h - 4h)
- Worker B: 15h weekly (UNCHANGED!)
- Worker C: 4h weekly (0h + 4h)
```

### Test Case 2: Change Shift Duration
```
Initial State:
- Shift: 10am-2pm (4h) with Worker A
- Worker A: 20h weekly

Action: Edit shift to 10am-4pm (6h) with Worker A

Expected Result:
- Worker A: 22h weekly (20h - 4h + 6h = 22h)
```

### Test Case 3: Add Worker to Existing Shift
```
Initial State:
- Shift: 10am-2pm (4h) with Worker A
- Worker A: 20h weekly
- Worker B: 15h weekly

Action: Add Worker B to shift (now 2:1)

Expected Result:
- Worker A: 20h weekly (unchanged)
- Worker B: 19h weekly (15h + 4h)
```

## Verification Steps

1. **Apply the fix** to both locations in ShiftForm.js
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Restart backend** server
4. **Test each scenario** above
5. **Check browser console** for any errors
6. **Verify in database** that hours are correct

## Command to Apply Fix

```bash
# Create backup
cp frontend/src/components/ShiftForm.js frontend/src/components/ShiftForm.js.backup

# Open file in editor
code frontend/src/components/ShiftForm.js

# Search for "wasInOriginalShift && isInNewShift"
# Replace with fixed code (2 locations)

# Save and test
```

## Rollback if Needed

```bash
# Restore backup
cp frontend/src/components/ShiftForm.js.backup frontend/src/components/ShiftForm.js

# Clear browser cache
# Restart server
```

## Impact

**Files Changed:** 1
**Lines Changed:** ~30
**Risk Level:** Low (isolated to worker hours calculation)
**Estimated Testing Time:** 30 minutes

## Success Criteria

✅ Worker hours display correctly when editing 2:1 shifts
✅ Changing one worker doesn't affect other worker's hours
✅ Duration changes are correctly reflected
✅ No console errors
✅ Database shows correct hours
