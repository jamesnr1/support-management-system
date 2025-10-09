# CRITICAL SYSTEM REQUIREMENTS - DO NOT LOSE THIS

*Last Updated: October 2024*
*User has explained this multiple times - DO NOT make assumptions*

## 1. WEEK A/B LOGIC - LEGISLATIVE COMPLIANCE (NOT OPTIONAL)

### **This is for NDIS COMPLIANCE - Required by law**

**Current Situation:**
- Libby is in hospital
- Operating as **Week B every week** (Ace, Grace, Milan with James)
- NO automation - manual selection needed

**How Shared Support Works:**
- 8 hours × 2 support workers ÷ 3 participants = 2:3 ratio
- Cost is split between the 3 participants

**Support Ratios:**
- **James & Libby:** 2:1 (two workers to one participant)
- **Ace, Grace, Milan:** 1:1 (one worker to one participant)

**Week Patterns:**
- **Week A:** Libby shares night support with Ace & Grace
- **Week B:** James shares night support with Ace & Grace

### **Funding Categories to Track (SEPARATELY):**
1. Day hours (6am-6pm)
2. Night hours (10pm-6am)
3. Evening hours (6pm-10pm)
4. Weekend rates
5. Weekday rates
6. Public holiday rates
7. Self-care support
8. Community participation

**MUST HAVE:** Functionality to update when NDIS issues new plans

---

## 2. PLANNER TAB REQUIREMENTS

### **Remove "Current Week" Option**
- Only show: **"Next Week"** and **"Week After"**

### **Automatic Transition (Sunday 2-3am):**
- Next Week → becomes Roster (active)
- Week After → becomes Next Week
- User can then create new "Week After"

### **Save Functionality:**
- Must save multiple roster versions
- Workers numbers increasing (30+ workers)
- Common for circumstances to change
- Need edit capability for saved rosters

---

## 3. CALENDAR REQUIREMENTS

- **Collapsible** with icon (top right)
- **NO space** between calendar and participant cards
- Remember user preference (collapsed/visible)
- Roster tab: Show remaining days only
- Planner tab: Show full week

---

## 4. VALIDATION RULES (CRITICAL - LEGAL REQUIREMENTS)

### **MANDATORY RULES:**
1. **10-hour rest** between shifts (LEGAL REQUIREMENT)
2. **No double-booking** - same worker cannot be with 2 participants at same time
3. **Maximum hours** - Legal limit per worker (CANNOT EXCEED)
4. **48 hours max** - Keep everyone under 48 hours/week

### **SOFT PREFERENCES:**
- Grace & Libby prefer female workers (not hard requirement)

---

## 5. PERFORMANCE FIXES NEEDED

**CRITICAL:** All worker cards refresh when editing one
- This is causing major slowness
- Fix immediately

---

## 6. WORKER CARD REQUIREMENTS

### **Must Display:**
- **Gender** (M/F indicator)
- **Car** availability (Yes/No)
- **Telegram** status (for messaging)
- **Current hours** this week
- **Max hours** allowed

### **Visual Requirements:**
- All cards same height
- Clear, readable text
- Professional appearance (no emojis)

---

## 7. BUTTONS NEXT TO TABS (IMPORTANT)

### **Check these buttons - they are critical:**
- Edit Mode
- Copy to Planner
- Export Payroll
- Export Shifts
- Calendar toggle
- Week A/B selector (Planner only)
- Refresh

**DO NOT remove or hide these without asking**

---

## 8. DATA STRUCTURE

```javascript
{
  "roster": {        // Current active week
    "week_type": "weekB",  // Currently always B (Libby in hospital)
    "data": { ... }
  },
  "planner_next": {  // Next week planning
    "week_type": "weekB",
    "data": { ... }
  },
  "planner_after": { // Week after planning
    "week_type": "weekB",
    "data": { ... }
  }
}
```

---

## 9. PARTICIPANT REQUIREMENTS

### **James (JAM001)**
- 2:1 support ratio
- 24/7 coverage required
- Currently has Ace, Grace, Milan nights (Week B)

### **Grace (GRA001)**
- 1:1 support ratio
- Prefers female workers
- 6h day + 2h evening on weekdays
- 16h on weekends

### **Ace (ACE001)**
- 1:1 support ratio
- Weekend support only
- Shares night support with Grace

### **Milan (MIL001)**
- 1:1 support ratio
- Weekend support only
- 3h self-care + 3h community (separate shifts)

### **Libby (LIB001)**
- 2:1 support ratio
- **Currently in hospital**
- Prefers female workers

---

## DO NOT:
- Make assumptions about requirements
- Remove features without asking
- Change Week A/B logic (it's legislative)
- Ignore validation rules (legal requirements)
- Add unnecessary features
- Create documentation unless asked

## DO:
- Ask for clarification
- Fix performance issues
- Maintain NDIS compliance
- Test validation thoroughly
- Keep interface simple
- Focus on what user needs
