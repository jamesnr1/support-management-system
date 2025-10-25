# Installation & Integration Guide

## Step 1: Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install required packages
npm install react-big-calendar moment react-icons

# Verify installation
npm list react-big-calendar moment react-icons
```

## Step 2: Apply Critical Bug Fix

The worker hours double-counting bug needs to be fixed in **two places**:

### 2.1 Update ShiftForm.js - getAvailableWorkers function

**File:** `frontend/src/components/ShiftForm.js`

**Location:** Around line 125-170

**Find this code:**
```javascript
if (editingShift) {
  const wasInOriginalShift = editingShift.workers && editingShift.workers.some(w => String(w) === String(worker.id));
  const isInNewShift = formData.workers && formData.workers.some(w => String(w) === String(worker.id));
  
  if (wasInOriginalShift && isInNewShift) {
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date);
    totalWithNew = weeklyHours; // ❌ BUG: Doesn't account for duration changes
  }
}
```

**Replace with:**
```javascript
if (editingShift) {
  const wasInOriginalShift = editingShift.workers?.some(w => String(w) === String(worker.id));
  const isInNewShift = currentFormData.workers?.some(w => String(w) === String(worker.id));
  
  if (wasInOriginalShift && isInNewShift) {
    // ✅ FIX: Always exclude the editing shift to prevent double-counting
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date, editingShift.id);
    // Then add the NEW duration (which may be different from original)
    totalWithNew = weeklyHours + (newShiftMinutes / 60);
  } else if (!wasInOriginalShift && isInNewShift) {
    // Worker being added
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date, editingShift.id);
    totalWithNew = weeklyHours + (newShiftMinutes / 60);
  } else {
    // Worker being removed or not involved
    weeklyHours = calculateWorkerWeeklyHours(worker.id, date);
    totalWithNew = weeklyHours;
  }
}
```

### 2.2 Update ShiftForm.js - validateShift function

**File:** `frontend/src/components/ShiftForm.js`

**Location:** Around line 630-660

**Find similar code in the validateShift function and apply the same fix.**

### 2.3 Import the new utility

**File:** `frontend/src/components/ShiftForm.js`

**At the top of the file, add:**
```javascript
import { 
  calculateWorkerWeeklyHours, 
  calculateEditedShiftHours,
  checkWeeklyHourLimit,
  getHoursColorCode,
  formatHours
} from '../utils/workerHoursCalculation';
```

**Then replace the existing `calculateWorkerWeeklyHours` function** (around line 700-750) with a call to the imported utility:

```javascript
// REMOVE the old calculateWorkerWeeklyHours function definition
// REPLACE all calls to calculateWorkerWeeklyHours with the imported version
```

## Step 3: Integrate Enhanced Worker Selection

### 3.1 Import WorkerSelectionDropdown

**File:** `frontend/src/components/ShiftForm.js`

**Add import:**
```javascript
import WorkerSelectionDropdown from './WorkerSelectionDropdown';
```

### 3.2 Replace Worker Selection UI

**Find the worker selection section** (around line 900-1000) where workers are selected with a basic dropdown or checkboxes.

**Replace with:**
```javascript
<WorkerSelectionDropdown
  workers={availableWorkers}
  selectedWorkers={formData.workers || []}
  onChange={(workers) => setFormData({ ...formData, workers })}
  date={date}
  rosterData={rosterData}
  editingShift={editingShift}
  shiftDuration={calculateDuration(formData.startTime, formData.endTime)}
  unavailableWorkerIds={Array.from(unavailableWorkerPeriods.keys())}
  multiSelect={true}
  label="Assign Workers"
  placeholder="Select workers for this shift..."
/>
```

## Step 4: Integrate Availability Calendar

### 4.1 Import AvailabilityCalendar

**File:** `frontend/src/components/StaffTab.js`

**Add import:**
```javascript
import AvailabilityCalendar from './AvailabilityCalendar';
```

### 4.2 Replace the Availability Modal

**Find the AvailabilityModal component** (around line 600-900)

**Replace the entire modal content with:**
```javascript
{showAvailabilityModal && selectedWorker && (
  <AvailabilityCalendar
    worker={selectedWorker}
    onClose={() => {
      setShowAvailabilityModal(false);
      setSelectedWorker(null);
    }}
    onSave={(newRules) => {
      // Refresh workers data
      queryClient.invalidateQueries(['workers']);
    }}
    initialAvailability={selectedWorkerAvailabilityData?.weeklyAvailability || {}}
    unavailabilityPeriods={selectedWorkerAvailabilityData?.unavailabilityPeriods || []}
  />
)}
```

### 4.3 Add Calendar CSS

**File:** `frontend/src/index.css` or `frontend/src/App.css`

**Add at the end:**
```css
/* React Big Calendar Customization */
.rbc-calendar {
  font-family: inherit;
}

.rbc-event {
  padding: 2px 5px;
  border-radius: 4px;
  cursor: pointer;
}

.rbc-event:hover {
  opacity: 0.8;
}

.rbc-day-slot .rbc-time-slot {
  border-top: 1px solid #f0f0f0;
}

.rbc-time-header-content {
  border-left: 1px solid #ddd;
}

.rbc-time-content {
  border-top: 2px solid #ddd;
}

.rbc-current-time-indicator {
  background-color: #dc3545;
  height: 2px;
}
```

## Step 5: Integrate Enhanced Validation

### 5.1 Update API Endpoint

**File:** `backend/server.py`

**Add import:**
```python
from services.enhanced_validation import validate_roster_data
```

**Find the validation endpoint** (search for `/api/validate` or similar)

**Replace validation logic:**
```python
@app.post('/api/validate-roster')
async def validate_roster_endpoint(roster_data: dict):
    """Validate roster with enhanced error reporting"""
    try:
        # Get workers data
        workers_response = supabase.table('workers').select('*').execute()
        workers = {str(w['id']): w for w in workers_response.data}
        
        # Validate using enhanced validator
        result = validate_roster_data(roster_data, workers)
        
        return result
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {
            'valid': False,
            'errors': [{'type': 'SYSTEM_ERROR', 'message': str(e)}],
            'warnings': [],
            'suggestions': []
        }
```

### 5.2 Update Frontend Validation Calls

**File:** `frontend/src/components/ShiftForm.js`

**Find where validation is called** and update to use new format:

```javascript
const validationResult = await validateRosterAPI(rosterData);

// Handle enhanced error format
if (!validationResult.valid) {
  validationResult.errors.forEach(error => {
    toast.error(error.message);
    if (error.suggestion) {
      toast.info(`💡 ${error.suggestion}`, { duration: 5000 });
    }
  });
}

// Show warnings
validationResult.warnings.forEach(warning => {
  toast.warning(warning.message);
});

// Show suggestions
validationResult.suggestions.forEach(suggestion => {
  toast.info(suggestion.message, { duration: 4000 });
});
```

## Step 6: Testing

### 6.1 Test Worker Hours Fix

```bash
# Start backend
cd backend
python server.py

# Start frontend
cd frontend
npm start
```

**Test Case 1: Create 2:1 Shift**
1. Create a shift with Worker A and Worker B (2:1 ratio)
2. Note their hours (e.g., A: 10h, B: 10h)
3. Edit the shift and replace Worker A with Worker C
4. Verify:
   - Worker A's hours decreased by shift duration
   - Worker B's hours remain THE SAME (not doubled!)
   - Worker C's hours increased by shift duration

**Test Case 2: Change Shift Duration**
1. Create a 4-hour shift with Worker A
2. Edit to 6 hours with same worker
3. Verify hours show correct delta (+2h, not +6h)

### 6.2 Test Availability Calendar

**Test Case 1: Set Weekly Availability**
1. Open worker availability modal
2. Click and drag on Monday 9am-5pm
3. Set Tuesday as 24h available
4. Save and verify in database

**Test Case 2: Edit Existing Slot**
1. Click existing availability slot
2. Change hours from 9-5 to 6-10
3. Save and verify

**Test Case 3: Add Unavailability**
1. Add unavailability period (7 days from now for 1 week)
2. Try to create shift during that period
3. Verify worker doesn't appear in dropdown

### 6.3 Test Enhanced Validation

**Test Case 1: Split Shift**
1. Create morning shift (6-10am) with different funding category A
2. Create afternoon shift (2-6pm) with different funding category B
3. Verify: Shows as INFO suggestion, not error

**Test Case 2: Conflict**
1. Create shift for Participant A with Worker X at 10-2
2. Try to create shift for Participant B with Worker X at 12-4
3. Verify: Shows error with suggestion to adjust times

## Step 7: Deployment

### 7.1 Create Git Branch

```bash
git checkout -b feature/short-term-improvements
git add .
git commit -m "Implement short-term improvements: worker hours fix, availability calendar, enhanced validation"
```

### 7.2 Deploy to Staging

```bash
# Deploy backend
git push origin feature/short-term-improvements

# Build frontend
cd frontend
npm run build

# Deploy to your hosting (Vercel/Heroku/etc)
```

### 7.3 Monitor Logs

```bash
# Backend logs
tail -f backend/server.log

# Frontend console
# Open browser DevTools -> Console
```

## Step 8: Rollback Procedure (If Needed)

```bash
# Revert to previous commit
git revert HEAD

# Clear browser cache
# In browser: Ctrl+Shift+Delete -> Clear cache

# Restart backend
cd backend
pkill -f "python server.py"
python server.py
```

## Common Issues & Solutions

### Issue: Calendar not displaying

**Solution:**
```bash
# Verify react-big-calendar is installed
npm list react-big-calendar

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Worker hours still double-counting

**Solution:**
- Verify BOTH locations in ShiftForm.js were updated
- Check browser console for errors
- Verify calculateWorkerWeeklyHours is correctly excluding editingShift.id

### Issue: Validation not showing suggestions

**Solution:**
- Check backend is using enhanced_validation.py
- Verify API response includes 'suggestions' array
- Check toast notification library is configured correctly

## Next Steps

After successful deployment:

1. ✅ Monitor error rates for 48 hours
2. ✅ Gather user feedback on availability calendar
3. ✅ Document any edge cases discovered
4. ✅ Plan medium-term enhancements (templates, batch operations, etc.)

## Support

For issues during implementation:
1. Check browser console for errors
2. Check backend logs: `tail -f backend/server.log`
3. Review this guide step-by-step
4. Test in isolation (one component at a time)
