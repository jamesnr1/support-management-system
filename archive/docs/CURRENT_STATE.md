# CURRENT SYSTEM STATE - October 4, 2025

## ⚠️ CRITICAL - READ THIS TO UNDERSTAND THE SYSTEM

This document clarifies what the system IS and what it is NOT, to prevent confusion.

---

## 🚫 WHAT THIS IS **NOT**

### ❌ OLD SYSTEM (Deprecated)
```
❌ Week A Tab    (removed)
❌ Week B Tab    (removed)
❌ Next A Tab    (removed)
❌ Next B Tab    (removed)
```

**This 4-tab system NO LONGER EXISTS in the UI.**

While you may see references to `weekA`, `weekB`, `nextA`, `nextB` in:
- Backend code (`server.py`, `database.py`)
- Data files (`roster_data.json`)
- Old documentation

**These are INTERNAL data structure labels only.**

---

## ✅ WHAT THIS **IS**

### ✅ CURRENT SYSTEM (Active)
```
✅ Roster Tab    → Current active roster
✅ Planner Tab   → Build future rosters
✅ Admin Tab     → Manage workers
✅ Hours Tab     → Track participant hours
```

**This is the ONLY tab structure users see.**

---

## 🔄 HOW THEY RELATE

### The Mapping

| User Sees (Frontend) | Backend Stores As | Purpose |
|---------------------|-------------------|---------|
| **Roster Tab** | `roster` object | Current active week |
| **Planner Tab** | `planner` object | Future week being planned |
| *Not visible* | `week_type: "weekA"` or `"weekB"` | Which pattern is applied |

### What is Week A/B?

**Week A and Week B are NOT tabs. They are PATTERNS.**

Think of them like "Plan A" and "Plan B" for scheduling:

**Week A Pattern:**
- Libby gets 2:3 shared night support with Ace & Grace
- James gets individual 2:1 night support

**Week B Pattern:**
- James gets 2:3 shared night support with Ace & Grace
- Libby gets individual 2:1 night support

**In the Planner tab**, users toggle between Week A and Week B patterns to select which one they want for the next week.

**In the Roster tab**, the pattern is already selected and applied.

---

## 📊 DATA STRUCTURE EXPLAINED

### Example `roster_data.json`
```json
{
  "roster": {
    "week_type": "weekB",         ← This means "using Week B pattern"
    "start_date": "2025-09-29",
    "end_date": "2025-10-05",
    "data": {
      "LIB001": { /* Libby's shifts */ },
      "JAM001": { /* James's shifts */ }
    }
  },
  "planner": {
    "week_type": "weekA",         ← This means "planning with Week A pattern"
    "start_date": "",
    "end_date": "",
    "data": {
      "LIB001": { /* Libby's planned shifts */ },
      "JAM001": { /* James's planned shifts */ }
    }
  }
}
```

**Key Point:** `week_type` is a PROPERTY of the roster/planner data, not a separate roster.

---

## 🎯 USER WORKFLOW

### Scenario: Planning Next Week

**Step 1: Current Week (Roster Tab)**
- User views the **Roster** tab
- Sees current week's roster (e.g., Week B pattern)
- Makes any necessary edits for this week

**Step 2: Plan Next Week (Planner Tab)**
- User clicks **Planner** tab
- Sees **Week: [A] [B]** toggle buttons
- User clicks **[A]** to select Week A pattern
  - System shows: "(Libby shared support)"
  - This means Libby will get 2:3 shared nights next week
- User builds next week's roster with Week A pattern

**Step 3: Copy from Current (Optional)**
- User clicks **📋 Copy** button in Roster tab
- System copies Roster → Planner
- System **automatically flips** the pattern (Week B → Week A)
  - Why? Because weeks alternate!
  - If this week is B, next week must be A
- User refines the copied roster in Planner

**Step 4: Export & Confirm**
- User exports **💰 Payroll** or **📄 Shifts** from Planner
- Reviews and confirms next week's plan

**Step 5: Sunday Transition (Planned Automation)**
- On Sunday at 3 AM, system automatically:
  - Moves Planner → Roster
  - Clears Planner
  - Ready for next planning cycle

---

## 🔧 TECHNICAL DETAILS

### Backend Endpoints

**New Structure (Current):**
```
GET  /api/roster/roster    ← Get current roster
GET  /api/roster/planner   ← Get planner data
POST /api/roster/roster    ← Update current roster
POST /api/roster/planner   ← Update planner data
```

**Legacy Support (Still Works):**
```
GET  /api/roster/weekA     ← Returns data with week_type="weekA"
GET  /api/roster/weekB     ← Returns data with week_type="weekB"
```

The backend maintains backward compatibility for data migration and testing.

### Frontend API Calls

```javascript
// ✅ CORRECT - Current system
const rosterData = await axios.get('/api/roster/roster')
const plannerData = await axios.get('/api/roster/planner')

// ❌ OUTDATED - Old system (don't use in new code)
const weekAData = await axios.get('/api/roster/weekA')
const weekBData = await axios.get('/api/roster/weekB')
```

---

## 💡 WHY THIS MATTERS

### For Developers

**When you see `weekA` or `weekB` in code:**
- **Don't think:** "This is a tab" ❌
- **Do think:** "This is a pattern identifier" ✅

**When you see `roster` or `planner` in code:**
- **Don't think:** "This is just a label" ❌
- **Do think:** "This is what users actually interact with" ✅

### For Users

**When you're in the Planner tab:**
- **Don't think:** "I'm editing Week A/Week B" ❌
- **Do think:** "I'm planning the next week, using either Pattern A or Pattern B" ✅

**When you toggle Week A/B:**
- **Don't think:** "I'm switching tabs" ❌
- **Do think:** "I'm choosing which pattern to use for planning" ✅

---

## 📖 TERMINOLOGY GUIDE

| ❌ Old/Confusing Term | ✅ Correct Term | Meaning |
|----------------------|----------------|---------|
| "Week A tab" | "Planner tab with Week A pattern selected" | Planning future roster using Pattern A |
| "Week B tab" | "Planner tab with Week B pattern selected" | Planning future roster using Pattern B |
| "Next A/Next B" | "Planner tab" | The tab for planning future weeks |
| "Current week" | "Roster tab" | The tab showing active roster |
| "Week type" | "Week pattern" or "Support pattern" | Which shared support configuration is used |

---

## 🎓 UNDERSTANDING WEEK PATTERNS

### Why Do We Have Week A and Week B?

**The Problem:**
- 5 participants need 24/7 support
- Libby and James both need 2:1 day support (2 workers)
- Both need night support, but we can't afford 2:1 for both at night
- Solution: They alternate who gets full 2:1 vs who shares with Ace & Grace

**Week A (Pattern A):**
```
Libby (Day):   2:1 individual       ← Gets 2 dedicated workers
Libby (Night): 2:3 shared          ← Shares 2 workers with Ace & Grace
James (Day):   2:1 individual       ← Gets 2 dedicated workers
James (Night): 2:1 individual       ← Gets 2 dedicated workers (full support)
```

**Week B (Pattern B):**
```
Libby (Day):   2:1 individual       ← Gets 2 dedicated workers
Libby (Night): 2:1 individual       ← Gets 2 dedicated workers (full support)
James (Day):   2:1 individual       ← Gets 2 dedicated workers
James (Night): 2:3 shared          ← Shares 2 workers with Ace & Grace
```

**The pattern alternates every week** to ensure:
- Both Libby and James get adequate support
- Costs stay within NDIS funding limits
- Worker hours are distributed fairly
- Ace & Grace consistently get their shared night support

---

## 🔍 HOW TO VERIFY CORRECT UNDERSTANDING

### Quick Test

**Question:** "What does Week A mean?"

**❌ Wrong Answer:** "It's the first week's tab"
**❌ Wrong Answer:** "It's the tab for planning Week A"
**✅ Correct Answer:** "It's the pattern where Libby gets 2:3 shared night support"

**Question:** "What does the Roster tab show?"

**❌ Wrong Answer:** "It shows Week A or Week B"
**✅ Correct Answer:** "It shows the current active roster, which uses either Week A or Week B pattern"

**Question:** "How do I plan next week's roster?"

**❌ Wrong Answer:** "I go to the Next A or Next B tab"
**✅ Correct Answer:** "I go to the Planner tab and toggle between Week A or Week B pattern"

---

## 🗂️ FILE & CODE REFERENCES

### Where You'll See Week A/B (Backend)

**File: `backend/roster_data.json`**
```json
{
  "roster": {...},
  "planner": {...},
  "weekA": {...},    ← Legacy data (being migrated)
  "weekB": {...},    ← Legacy data (being migrated)
  "nextA": {...},    ← Legacy data (being migrated)
  "nextB": {...}     ← Legacy data (being migrated)
}
```

**File: `backend/server.py`**
```python
# Legacy endpoints (still work for backward compatibility)
@api_router.get("/roster/weekA")
@api_router.get("/roster/weekB")
@api_router.get("/roster/nextA")
@api_router.get("/roster/nextB")

# New endpoints (current system)
@api_router.get("/roster/roster")
@api_router.get("/roster/planner")
```

### Where You'll See Roster/Planner (Frontend)

**File: `frontend/src/components/RosteringSystem.js`**
```javascript
const tabs = [
  { id: 'roster', label: 'Roster' },      ← USER SEES THIS
  { id: 'planner', label: 'Planner' },    ← USER SEES THIS
  { id: 'admin', label: 'Admin' },
  { id: 'hours', label: 'Hours' }
]

// Fetch roster data
const rosterData = await axios.get('/api/roster/roster')
const plannerData = await axios.get('/api/roster/planner')

// Week pattern is a property
const currentPattern = rosterData.week_type  // "weekA" or "weekB"
```

---

## 📝 SUMMARY

### In One Sentence

**"Roster and Planner are the two tabs users edit, and Week A/B are the two patterns they can choose between, determining who gets shared night support."**

### The Complete Picture

1. **Users interact with:** Roster tab & Planner tab
2. **Each roster/planner has a:** Week pattern (A or B)
3. **Week pattern determines:** Who gets 2:3 shared night support
4. **Pattern A:** Libby shares nights
5. **Pattern B:** James shares nights
6. **Users toggle patterns in:** Planner tab (using Week A/B buttons)
7. **System stores patterns as:** `week_type` property in data
8. **Old 4-tab system:** Deprecated, no longer in UI

---

**Date:** October 4, 2025
**Status:** This reflects the CURRENT system. If anything contradicts this document, this document is correct.
**For Questions:** Read `ROSTER_PLANNER_CONTEXT.md` for detailed technical info


