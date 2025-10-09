# CURRENT TAB STRUCTURE - What Each Tab Does

Based on the actual code review, here's what each tab currently does:

## **5 TABS IN THE SYSTEM:**

### **1. ROSTER TAB**
**Purpose:** Display and edit the CURRENT WEEK's active roster
- Shows participant cards (Grace, James, Ace, Milan)
- Each participant shows their shifts for the week
- **EDITABLE** - Add/edit/delete shifts in Edit Mode
- **Has Calendar** - Shows appointments (filtered to remaining days only)
- **Has Export buttons** - Export Payroll, Export Shifts
- **Has Copy button** - Copy current roster to Planner

### **2. PLANNER TAB**  
**Purpose:** Plan and build FUTURE rosters
- Same layout as Roster tab but for planning ahead
- **Week Selector Dropdown** - Choose which week to plan:
  - Current Week (as template)
  - Next Week
  - Week After
- **Week A/B Toggle** - Select support pattern (who gets shared night support)
- **EDITABLE** - Build new rosters before they go live
- **Has Calendar** - Shows full week appointments
- **Has Export buttons** - Can export planned rosters

### **3. SHIFTS TAB**
**Purpose:** Worker-centric view of shifts + Telegram messaging
- **Week Selector** - View shifts for Current/Next/Week After
- Shows shifts grouped by WORKER (not participant)
- Display format: Worker name, their shifts, total hours
- **Telegram Panel** - Send messages to workers about their shifts
- Only shows workers who HAVE shifts that week

### **4. PROFILES TAB** (formerly Admin)
**Purpose:** Manage worker profiles and availability
- **Worker Cards** - Display all 24 workers
- Each card shows:
  - Worker name, gender, car, Telegram status
  - Weekly availability schedule
  - Edit and Availability buttons
  - Delete button
- **Add New Worker** functionality
- **Set worker availability** (weekly schedule + unavailable periods)

### **5. TRACKING TAB** (formerly Hours)
**Purpose:** Track hours and NDIS funding
- Shows participant hours breakdown
- Calculates based on Week A/B patterns
- Tracks:
  - Day hours (6am-6pm)
  - Evening hours (6pm-10pm)  
  - Night hours (10pm-6am)
  - Shared support calculations
- Budget vs actual comparison

---

## **KEY FEATURES BY TAB:**

| Tab | Calendar | Export | Edit Mode | Week Selector | 
|-----|----------|--------|-----------|---------------|
| **Roster** | ✓ (remaining days) | ✓ | ✓ | ✗ |
| **Planner** | ✓ (full week) | ✓ | ✓ | ✓ (3 weeks) |
| **Shifts** | ✗ | ✗ | ✗ | ✓ (3 weeks) |
| **Profiles** | ✗ | ✗ | ✓ (workers) | ✗ |
| **Tracking** | ✗ | ✗ | ✗ | ✗ |

---

## **CURRENT ISSUES/QUESTIONS:**

1. **Performance:** All worker cards refresh when editing one (cardsRefreshKey issue)
2. **Calendar:** Takes too much vertical space, poorly configured
3. **Week A/B Logic:** Confusing display - should we simplify?
4. **Validation:** Missing critical checks (10-hour rest, double-booking)
5. **AI Assistant:** Not configured (missing OpenAI key)
6. **Colors:** Need earthy tones that are gentle on eyes

---

## **DATA FLOW:**

```
roster_data.json structure:
{
  "roster": {        // Current active roster
    "week_type": "weekA",
    "data": { ... }
  },
  "planner": {       // Planning space (empty)
    "week_type": "weekB", 
    "data": {}
  },
  "planner_next": {  // Next week planning
    "data": {}
  },
  "planner_after": { // Week after planning
    "data": {}
  }
}
```

---

## **QUESTIONS TO CLARIFY:**

1. **Roster Tab:** Should this always show the current active week?
2. **Planner Tab:** Is the 3-week ahead planning enough?
3. **Week A/B:** Is this for calculating shared night support costs?
4. **Auto-transition:** Should Planner → Roster happen automatically on Sundays?
5. **Shifts Tab:** Is the worker-centric view helpful for scheduling?
6. **Validation:** Which rules are most critical to enforce?
