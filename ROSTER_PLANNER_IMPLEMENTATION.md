# Roster/Planner Implementation - Next Steps

## ✅ **Completed (Backend)**
- ✅ Data structure migrated to roster/planner format
- ✅ Backend endpoints updated
- ✅ Automatic week_type tracking (A/B alternates)
- ✅ Backups created
- ✅ Server restarted and tested

## ⏳ **Remaining (Frontend ~30-40 min)**

### **1. Update Tab Structure (5 min)**
**File:** `frontend/src/components/RosteringSystem.js`

**Change tabs state:**
```javascript
// OLD
const [activeTab, setActiveTab] = useState(() => {
  return localStorage.getItem('activeTab') || 'weekA';
});

// NEW
const [activeTab, setActiveTab] = useState(() => {
  return localStorage.getItem('activeTab') || 'roster';
});
```

**Update tab rendering:**
```javascript
// OLD
<button className={`tab-btn ${activeTab === 'weekA' ? 'active' : ''}`} onClick={() => setActiveTab('weekA')}>
  Week A
</button>

// NEW
<button className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>
  Roster
</button>
<button className={`tab-btn ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>
  Planner
</button>
```

---

### **2. Update Data Fetching (10 min)**
**File:** `frontend/src/components/RosteringSystem.js`

**Update rosterQuery:**
```javascript
// OLD
const { data: rosterData, isLoading: rosterLoading, error: rosterError } = useQuery({
  queryKey: ['rosterData', activeTab],
  queryFn: async () => {
    const weeks = ['weekA', 'weekB', 'nextA', 'nextB'];
    // ...
  }
});

// NEW
const { data: rosterData, isLoading: rosterLoading, error: rosterError } = useQuery({
  queryKey: ['rosterData', activeTab],
  queryFn: async () => {
    if (activeTab === 'admin' || activeTab === 'hours') {
      return { roster: {}, planner: {} };
    }
    
    const response = await axios.get(`${API}/roster/${activeTab}`);
    const weekData = response.data;
    
    return {
      week_type: weekData.week_type,
      start_date: weekData.start_date,
      end_date: weekData.end_date,
      data: weekData.data || {}
    };
  },
  enabled: !!activeTab,
  staleTime: 30000
});
```

---

### **3. Display Week Type in UI (5 min)**
**File:** `frontend/src/components/RosteringSystem.js`

Add week type display:
```javascript
{activeTab === 'roster' && rosterData?.week_type && (
  <div style={{ 
    position: 'absolute', 
    top: '85px', 
    right: '1.5rem', 
    color: '#8B9A7B', 
    fontSize: '0.9rem',
    fontWeight: '500'
  }}>
    Week {rosterData.week_type === 'weekA' ? 'A' : 'B'} Pattern
  </div>
)}
```

---

### **4. Update Copy Function (10 min)**
**File:** `frontend/src/components/RosteringSystem.js`

**Update copyToTemplate:**
```javascript
// OLD
const copyToTemplate = async () => {
  if (activeTab === 'weekA') {
    // Copy to nextA
  } else if (activeTab === 'weekB') {
    // Copy to nextB
  }
};

// NEW
const copyToPlanner = async () => {
  if (activeTab !== 'roster') return;
  
  try {
    setCopyTemplateRunning(true);
    
    // Fetch current roster
    const rosterResponse = await axios.get(`${API}/roster/roster`);
    const roster = rosterResponse.data;
    
    // Flip week type
    const newWeekType = roster.week_type === 'weekA' ? 'weekB' : 'weekA';
    
    // Calculate next week dates (7 days ahead)
    const rosterStart = new Date(roster.start_date);
    const plannerStart = new Date(rosterStart);
    plannerStart.setDate(plannerStart.getDate() + 7);
    const plannerEnd = new Date(plannerStart);
    plannerEnd.setDate(plannerEnd.getDate() + 6);
    
    // Deep copy data and update dates
    const copiedData = JSON.parse(JSON.stringify(roster.data));
    const updatedData = {};
    
    for (const [participantCode, dates] of Object.entries(copiedData)) {
      updatedData[participantCode] = {};
      for (const [dateStr, shifts] of Object.entries(dates)) {
        const oldDate = new Date(dateStr);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + 7);
        const newDateStr = newDate.toISOString().split('T')[0];
        
        updatedData[participantCode][newDateStr] = shifts.map(shift => ({
          ...shift,
          date: newDateStr
        }));
      }
    }
    
    // POST to planner
    await axios.post(`${API}/roster/planner`, {
      week_type: newWeekType,
      start_date: plannerStart.toISOString().split('T')[0],
      end_date: plannerEnd.toISOString().split('T')[0],
      data: updatedData
    });
    
    toast.success('Roster copied to Planner!');
    queryClient.invalidateQueries(['rosterData']);
  } catch (error) {
    console.error('Copy error:', error);
    toast.error('Failed to copy roster');
  } finally {
    setCopyTemplateRunning(false);
  }
};
```

---

### **5. Update ParticipantSchedule (5 min)**
**File:** `frontend/src/components/ParticipantSchedule.js`

**Update prop usage:**
```javascript
// OLD
const participantShifts = rosterData[activeTab]?.[participant.code] || {};

// NEW
const participantShifts = rosterData?.data?.[participant.code] || {};
```

---

### **6. Update CalendarAppointments (3 min)**
**File:** `frontend/src/components/CalendarAppointments.js`

**Update props passed:**
```javascript
// Update weekType prop to handle roster/planner
// Change onCopyToTemplate to onCopyToPlanner
// Update condition: (weekType === 'roster') instead of (weekType === 'weekA' || weekType === 'weekB')
```

---

### **7. Remove Old Tabs (2 min)**
Remove all references to:
- `nextA`
- `nextB`
- Update any remaining `weekA`/`weekB` references to `roster`/`planner`

---

## 🧪 **Testing Checklist**

After frontend changes:
- [ ] Roster tab loads with correct data
- [ ] Week type displays correctly (A or B)
- [ ] Planner tab loads with correct data
- [ ] Copy to Planner works and flips week type
- [ ] Edit Mode works in both Roster and Planner
- [ ] Export Payroll uses correct week_type
- [ ] Hours tracking reads week_type correctly
- [ ] Calendar appointments still work
- [ ] Admin and Hours tabs unchanged

---

## 📦 **Quick Revert if Needed**

```bash
# Go back to main branch
git checkout main

# Restore old roster (if needed)
cp backend/roster_data_pre_migration_20251004_212448.json backend/roster_data.json

# Restart backend
cd backend && source venv/bin/activate && python server.py
```

---

## ⚡ **Resume Work**

```bash
# Make sure you're on the feature branch
git checkout feature/current-planning-tabs

# Start frontend dev server (if not running)
cd frontend && yarn start

# Start backend (if not running)
cd backend && source venv/bin/activate && python server.py
```

Then proceed with the frontend changes above in order 1-7.

---

**Status:** Backend complete, ~30-40 min of frontend work remaining
**Branch:** `feature/current-planning-tabs`
**Backups:** Multiple backups in `backend/` directory

