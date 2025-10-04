# Shift Lock/Unlock Feature

## ✅ Implementation Complete

### Overview
Individual shifts can now be locked and unlocked to prevent accidental changes while still being copied when using the "Copy Template" function.

---

## 🔒 How It Works

### **Lock Status**
- Each shift has a `locked` property (boolean)
- `locked: true` = Shift is protected from editing/deletion
- `locked: false` or undefined = Shift can be edited/deleted normally

### **Visual Indicators**
When a shift is locked:
- **Lock button** changes from 🔓 "Lock" to 🔒 "Locked" 
- Button color changes to **amber/orange** (#d97706) with white text
- **Edit and Delete buttons** become disabled (grayed out, 50% opacity)
- Cursor changes to "not-allowed" when hovering over Edit/Delete

When a shift is unlocked:
- **Unlock button** shows 🔓 "Lock"
- Button uses normal styling
- **Edit and Delete buttons** are fully enabled

---

## 🎯 Features

### **1. Lock/Unlock Toggle**
- Click the lock button to toggle between locked and unlocked states
- Instant visual feedback
- Changes are saved automatically to roster data

### **2. Protection from Editing**
- Locked shifts cannot be edited
- Clicking "Edit" on a locked shift shows alert: "⚠️ This shift is locked. Please unlock it before editing."
- Edit button is disabled (grayed out) when shift is locked

### **3. Protection from Deletion**
- Locked shifts cannot be deleted
- Clicking "Delete" on a locked shift shows alert: "⚠️ This shift is locked. Please unlock it before deleting."
- Delete button is disabled (grayed out) when shift is locked

### **4. Copy Template Behavior**
- **Locked shifts ARE copied** when using "Copy Template"
- The `locked` property is preserved in the copied shift
- This allows you to create template shifts that are protected from accidental changes

---

## 📋 Use Cases

### **1. Protect Important Shifts**
Lock critical shifts that should not be changed:
- Regular recurring appointments
- Fixed schedule commitments
- Confirmed shifts that have been approved

### **2. Template Protection**
Lock template shifts so they don't get accidentally modified:
- Create a template week with locked shifts
- Copy the template to other weeks
- The copied shifts maintain their locked status
- Prevents team members from accidentally changing the template

### **3. Prevent Accidental Changes**
- Lock completed shifts to preserve historical records
- Lock shifts during busy periods to prevent mistakes
- Unlock only when intentional changes are needed

---

## 🚀 How to Use

### **Locking a Shift**
1. Navigate to any participant's schedule
2. Click the **"Edit Mode"** toggle (top-right)
3. Find the shift you want to lock
4. Click the **🔓 "Lock"** button
5. Button changes to **🔒 "Locked"** (amber color)
6. Edit and Delete buttons become disabled

### **Unlocking a Shift**
1. In Edit Mode, find the locked shift (amber lock button)
2. Click the **🔒 "Locked"** button
3. Button changes to **🔓 "Lock"** (normal color)
4. Edit and Delete buttons become enabled

### **Copying Locked Shifts**
1. Lock the shifts you want to protect in your template week
2. Use "Copy Template" function (in Rostering System)
3. Locked shifts are copied with their locked status intact
4. Copied shifts remain locked in the new week

---

## 💾 Data Structure

The `locked` property is stored in the shift object:

```json
{
  "id": "1759299438463_1",
  "date": "2025-09-27",
  "shiftNumber": "A2025092701",
  "startTime": "06:00",
  "endTime": "14:00",
  "supportType": "Self-Care",
  "ratio": "1:1",
  "workers": ["127"],
  "location": "2",
  "notes": "",
  "duration": "8.0",
  "locked": true
}
```

---

## 🎨 UI/UX Details

### **Button States**

#### Unlocked State:
```
🔓 Lock
- Background: var(--bg-secondary) (normal gray)
- Color: inherit
- Cursor: pointer
```

#### Locked State:
```
🔒 Locked
- Background: #d97706 (amber/orange)
- Color: #fff (white)
- Cursor: pointer
```

### **Disabled Buttons (When Shift is Locked)**
```
Edit Button:
- Opacity: 0.5 (50% transparency)
- Cursor: not-allowed
- Disabled: true

Delete Button:
- Opacity: 0.5 (50% transparency)
- Cursor: not-allowed
- Disabled: true
```

---

## ⚙️ Technical Implementation

### **Files Modified**
1. `/frontend/src/components/ParticipantSchedule.js`
   - Added `Lock` and `Unlock` icons from lucide-react
   - Added `handleToggleLock` function
   - Updated `handleEditShift` to check lock status
   - Updated `handleDeleteShift` to check lock status
   - Added lock/unlock button to shift display
   - Added disabled styling for Edit/Delete when locked

### **Functions Added**

#### `handleToggleLock(shiftIndex, shiftDate)`
```javascript
const handleToggleLock = async (shiftIndex, shiftDate) => {
  try {
    const currentRoster = JSON.parse(JSON.stringify(rosterData || {}));
    const shift = currentRoster[participant.code][shiftDate][shiftIndex];
    
    // Toggle the locked state
    shift.locked = !shift.locked;
    
    console.log(`Shift ${shift.locked ? 'locked 🔒' : 'unlocked 🔓'}:`, shift.shiftNumber);
    await onRosterUpdate(currentRoster);
  } catch (error) {
    console.error('Error toggling lock:', error);
  }
};
```

### **Validation Checks**
```javascript
// In handleEditShift
if (shift.locked) {
  alert('⚠️ This shift is locked. Please unlock it before editing.');
  return;
}

// In handleDeleteShift
if (shift?.locked) {
  alert('⚠️ This shift is locked. Please unlock it before deleting.');
  return;
}
```

---

## 🧪 Testing Checklist

- [ ] Lock a shift - button changes to "Locked" with amber color
- [ ] Try to edit a locked shift - shows warning message
- [ ] Try to delete a locked shift - shows warning message
- [ ] Edit and Delete buttons are disabled (grayed out) when locked
- [ ] Unlock a shift - button changes back to "Lock"
- [ ] Can edit and delete after unlocking
- [ ] Lock multiple shifts in a template week
- [ ] Copy template to another week
- [ ] Verify locked shifts are copied with locked status
- [ ] Verify locked shifts in copied week remain locked
- [ ] Unlock a copied shift - works correctly

---

## 💡 Tips

1. **Use for Templates**: Lock all shifts in your base template week to prevent accidental modifications
2. **Selective Locking**: Only lock the shifts that need protection - leave flexible shifts unlocked
3. **Visual Scanning**: The amber color makes it easy to identify locked shifts at a glance
4. **Bulk Lock**: Before copying a template, lock all the shifts you want to preserve
5. **Unlock to Modify**: Remember to unlock shifts before trying to edit them

---

## 🔮 Future Enhancements (Optional)

1. **Bulk Lock/Unlock**: Add buttons to lock/unlock all shifts for a participant or date
2. **Lock Indicator on Shift**: Show a small 🔒 icon on the shift itself (not just the button)
3. **Lock Reasons**: Allow users to add a reason why a shift is locked
4. **Lock History**: Track who locked/unlocked a shift and when
5. **Permission Levels**: Only allow certain users to lock/unlock shifts
6. **Lock Expiry**: Automatically unlock shifts after a certain date

---

## 📞 Support

If you encounter any issues with the lock/unlock feature:
1. Check browser console (F12) for error messages
2. Verify roster data is loading correctly
3. Try refreshing the page
4. Check that Edit Mode is enabled
5. Ensure you're clicking the correct lock button

---

## ✅ Summary

The shift lock/unlock feature provides a simple but powerful way to protect important shifts from accidental changes while maintaining the flexibility to copy them via templates. The visual indicators make it easy to see which shifts are protected, and the disabled buttons prevent users from accidentally attempting to modify locked shifts.

