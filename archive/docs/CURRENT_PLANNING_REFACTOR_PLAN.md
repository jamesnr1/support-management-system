# Current/Planning Tabs Refactoring Plan

## 🎯 **Objective**
Replace Week A/Week B/Next A/Next B tabs with:
- **Current Week** - Active roster (Monday-Sunday)
- **Planning** - Future roster with date picker + Week A/B logic templates

## 🛡️ **Protected Areas (NO CHANGES)**
- ✅ Admin tab (Worker management)
- ✅ Worker database tables
- ✅ Worker availability logic
- ✅ Hours tracking calculations
- ✅ All worker-related functionality

---

## 📊 **Phase 1: Data Structure Changes**

### **Backend Changes**

#### **1.1 Roster Data Structure**
**Before:**
```json
{
  "weekA": {
    "JAM001": { "2025-09-22": [...shifts...] }
  },
  "weekB": { ... },
  "nextA": { ... },
  "nextB": { ... }
}
```

**After:**
```json
{
  "current": {
    "start_date": "2025-10-06",
    "end_date": "2025-10-12",
    "data": {
      "JAM001": { "2025-10-06": [...shifts...] }
    }
  },
  "planning": {
    "start_date": "2025-10-13",
    "end_date": "2025-10-19",
    "data": {
      "JAM001": { "2025-10-13": [...shifts...] }
    }
  },
  "templates": {
    "weekA": { ... },  // Keep for "Apply Week A Logic"
    "weekB": { ... }   // Keep for "Apply Week B Logic"
  }
}
```

#### **1.2 API Endpoints Changes**
- **UPDATE:** `GET /api/roster/{week_type}` → `GET /api/roster/current` and `GET /api/roster/planning`
- **NEW:** `POST /api/roster/planning/set-dates` - Set planning week dates
- **NEW:** `POST /api/roster/planning/apply-template` - Apply Week A or Week B logic
- **UPDATE:** `POST /api/roster/copy` - Copy current → planning
- **KEEP:** Sunday automation (shift planning → current)

---

## 🎨 **Phase 2: Frontend Changes**

### **2.1 Tab Structure**
**Before:** Week A | Week B | Next A | Next B | Admin | Hours (6 tabs)  
**After:** Current Week | Planning | Admin | Hours (4 tabs)

### **2.2 Planning Tab UI**
```
┌─────────────────────────────────────────────────┐
│  Planning Week: [📅 Oct 13 - Oct 19, 2025 ▼]   │
│                                                  │
│  [Copy from Current] [Apply Week A Logic]       │
│                      [Apply Week B Logic]       │
└─────────────────────────────────────────────────┘
```

### **2.3 Component Changes**
- **RosteringSystem.js:** Update tab state (`current` | `planning` | `admin` | `hours`)
- **NEW:** `WeekPicker.js` component for date selection
- **ParticipantSchedule.js:** Accept dynamic date ranges
- **CalendarAppointments.js:** Update to use current/planning dates

---

## 🔄 **Phase 3: Migration**

### **3.1 Data Migration Script**
```python
# migrate_to_current_planning.py
# 1. Load existing roster_data.json
# 2. Identify current week (Week A or Week B based on date)
# 3. Move to "current" structure
# 4. Move Next A or Next B to "planning" structure
# 5. Save Week A and Week B as templates
# 6. Create backup before overwriting
```

### **3.2 Migration Safety**
- ✅ Backup created before migration
- ✅ Validate all shifts preserved
- ✅ Verify shift counts match
- ✅ Test hours calculations unchanged

---

## ⚙️ **Phase 4: Sunday Automation Update**

**Current:** Next A → Week A, Next B → Week B, clear Next A/B  
**New:** Planning → Current, clear Planning

Update `sunday_copy_scheduler.py`:
- Check if Sunday 3 AM
- Copy planning → current
- Clear planning data
- Update current week dates to next Monday-Sunday

---

## 🧪 **Testing Checklist**

### **Critical Tests**
- [ ] All existing shifts visible in Current Week
- [ ] Worker management unchanged
- [ ] Hours tracking calculations correct
- [ ] Copy Current → Planning works
- [ ] Apply Week A Logic works
- [ ] Apply Week B Logic works
- [ ] Sunday automation tested
- [ ] Date picker Monday-Sunday validation
- [ ] Export functions work with new structure

### **Data Integrity**
- [ ] No shifts lost in migration
- [ ] Shift numbers preserved
- [ ] Locked shifts remain locked
- [ ] Worker assignments intact

---

## 📦 **Rollback Plan**

If issues occur:
```bash
# Switch back to main branch
git checkout main

# Restore roster backup
cp backend/roster_data_backup_TIMESTAMP.json backend/roster_data.json

# Restart services
```

---

## 📈 **Implementation Order**

1. ✅ **Backup & Branch** (DONE)
2. **Backend:** Update data structure + migration script (30 min)
3. **Backend:** Update API endpoints (30 min)
4. **Backend:** Test with Postman/curl (15 min)
5. **Frontend:** Update tab structure (20 min)
6. **Frontend:** Add week picker (30 min)
7. **Frontend:** Apply template buttons (20 min)
8. **Frontend:** Update components for dynamic dates (30 min)
9. **Testing:** Full system test (30 min)
10. **Sunday automation:** Update script (15 min)

**Total Estimated Time:** ~3.5 hours

---

## ✨ **Benefits After Completion**

- ✅ Clearer UX ("Current Week" vs confusing "Week A")
- ✅ Plan any week in the future (not just 2 weeks ahead)
- ✅ Fewer tabs (6 → 4)
- ✅ Fewer buttons in UI
- ✅ Easier for new users to understand
- ✅ Still has Week A/B logic templates when needed

---

**Status:** Ready to implement  
**Branch:** `feature/current-planning-tabs`  
**Backup:** `roster_data_backup_TIMESTAMP.json`

