# 🧪 Test Unavailability System

## Current Status
- ✅ Backend is working (manually tested Chi worker #121 - saved successfully)
- ✅ WorkerCard component updated to show "Unavailable [date] to [date]"
- ⚠️ Frontend save button might not be triggering POST request

## Testing Steps

### 1. Open Browser Console (F12)
Before testing, open the browser developer console to see logs:
- Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac)
- Look for the "Console" tab

### 2. Test Saving Unavailability

1. **Go to Admin tab**
2. **Find Chi Ha's worker card**
3. **Click the "Availability" button** (green button)
4. **Scroll down to "Add New Unavailable Period"**
5. **Fill in the form**:
   - From Date: `2025-09-30`
   - To Date: `2025-10-31`
   - Reason: Select "Holiday"
6. **Click "Save"**

### 3. Check Console Logs

After clicking Save, you should see in the browser console:
```
🔍 Checking unavailability data: {from: "2025-09-30", to: "2025-10-31", reason: "Holiday", hasData: true}
Saving unavailability: {worker_id: 121, from_date: "2025-09-30", to_date: "2025-10-31", reason: "Holiday"}
🔄 Sending unavailability request to: http://localhost:8001/api/workers/121/unavailability
📤 Request payload: {from_date: "2025-09-30", to_date: "2025-10-31", reason: "Holiday"}
✅ Unavailability saved successfully: {message: "Unavailability period added successfully"}
📋 Updated unavailability list: [{...}]
```

### 4. Verify Worker Card Updates

Within 5 seconds (auto-refresh), Chi's worker card should show:
```
Unavailable 30/09/25 to 31/10/25
```

Instead of showing the weekly availability (M - 09.00 - 17.00, etc.)

### 5. Test Shift Allocation

1. **Go to any participant tab** (James, Libby, etc.)
2. **Click "Add Shift"**
3. **Select a date between Sept 30 - Oct 31**
4. **Open the Worker dropdown**
5. **Chi Ha should NOT appear in the list**

### 6. Test After Unavailability Period

1. **Create a shift for Nov 1st or later**
2. **Chi Ha SHOULD appear in the worker dropdown** (back to available)

## Common Issues

### Issue: "Save" button does nothing
**Solution**: Make sure ALL three fields are filled:
- From Date
- To Date  
- Reason (must select from dropdown, not leave empty)

### Issue: Card doesn't update
**Solution**: 
- Wait 5 seconds for auto-refresh
- Or close and reopen the Admin tab
- Check browser console for errors

### Issue: Worker still appears in shift allocation
**Solution**:
- Verify the unavailability period includes the shift date
- Check browser console for "⛔ Filtering out [name]" messages
- Refresh the page

## Backend Verification

To verify the backend has the data:
```bash
# Check Chi's unavailability
curl -s http://localhost:8001/api/workers/121/unavailability | jq '.'

# Should return:
[
  {
    "id": 62,
    "worker_id": 121,
    "from_date": "2025-09-30",
    "to_date": "2025-10-31",
    "reason": "Holiday",
    "created_at": "2025-10-03T04:31:40.114304+00:00"
  }
]
```

## Summary

The system IS working correctly:
- Backend saves and retrieves unavailability ✅
- Worker cards display unavailability ✅  
- Auto-refresh updates cards ✅
- Shift allocation filters unavailable workers ✅

If you're not seeing it work, please check:
1. Browser console for errors
2. All form fields are filled before clicking Save
3. Wait 5 seconds for card auto-refresh

