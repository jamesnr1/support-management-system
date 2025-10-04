# Roster/Planner Context - KEY INFORMATION

## ⚠️ CRITICAL - READ BEFORE MAKING CHANGES

### **Current System Design (Post-Refactor)**

**4 Tabs:** Roster | Planner | Admin | Hours

---

## **Tab Purposes**

### **Roster Tab (Current Active Roster)**
- Shows the CURRENT active roster that's in use
- **EDITABLE** - because changes happen constantly with 30+ workers
- **Currently EMPTY** - user is building roster in Planner first
- **NO Week Pattern Indicator** - clean interface for editing current week

### **Planner Tab (Build Future Rosters)**
- Where user BUILDS rosters before they go live
- Has **Week A / Week B toggle buttons** to SELECT which pattern to use
- Shows explanation: 
  - Week A: "Libby gets shared night support with Ace & Grace"
  - Week B: "James gets shared night support with Ace & Grace"
- NO week pattern indicator (uses toggle buttons instead)

### **Admin Tab**
- Worker management (unchanged)

### **Hours Tab**
- Hours tracking (unchanged)

---

## **Week A vs Week B Logic**

**From `plans.txt` - DO NOT GET THIS BACKWARDS AGAIN!**

### **Week A (Odd Weeks):**
- **Libby:** 2:1 day support, **2:3 SHARED night support with Ace & Grace** (37.3 hours)
- **James:** 2:1 day support, **INDIVIDUAL 2:1 night support** (56 hours)
- Ace & Grace: Individual day support, shared night support with Libby

### **Week B (Even Weeks):**
- **James:** 2:1 day support, **2:3 SHARED night support with Ace & Grace** (37.3 hours)
- **Libby:** 2:1 day support, **INDIVIDUAL 2:1 night support** (56 hours)
- Ace & Grace: Individual day support, shared night support with James

**KEY DIFFERENCE:** WHO gets the shared night support alternates between weeks!

---

## **UI Elements - What Shows Where**

### **Roster Tab:**
- ✅ Clean interface - NO week pattern indicators
- ✅ Participant cards WITHOUT week labels
- ✅ Edit Mode, Export buttons
- ✅ For editing current week (changes happen constantly)

### **Planner Tab:**
- ✅ Week Pattern Toggle Buttons: [Week A] [Week B]
- ✅ Explanation text: Shows who gets shared support
- ✅ Participant cards WITHOUT week labels
- ✅ Edit Mode, Export buttons
- ❌ NO Week Pattern Indicator (has toggle buttons instead)

### **Participant Cards (Both Tabs):**
- ❌ NO "Week A" or "Week B" labels on individual cards
- ✅ Shows participant name, location, ratio
- ✅ Shows days scheduled

---

## **Data Structure**

```json
{
  "roster": {
    "week_type": "weekB",  // Which pattern is applied
    "start_date": "2025-09-29",
    "end_date": "2025-10-05",
    "data": { /* participant shifts */ }
  },
  "planner": {
    "week_type": "weekA",  // User can toggle A/B
    "start_date": "",
    "end_date": "",
    "data": { /* participant shifts */ }
  }
}
```

---

## **Key Behaviors**

1. **Copy from Roster to Planner:**
   - Copies shifts
   - FLIPS week_type (A→B or B→A)
   - Updates Ace/Grace locations automatically

2. **Sunday Automation (3 AM):**
   - Planner moves to Roster
   - Planner cleared
   - Week_type preserved

3. **Hours Tracking:**
   - Reads `week_type` from each section
   - Applies correct calculation based on week pattern

---

## **What NOT to Do**

❌ DON'T show week labels on individual participant cards  
❌ DON'T show Week Pattern Indicator on Roster tab (removed entirely)
❌ DON'T show Week Pattern Indicator on Planner tab (uses toggle buttons instead)
❌ DON'T confuse which person gets shared support (check plans.txt!)  
❌ DON'T change week logic without checking plans.txt first  

---

## **Common Mistakes to Avoid**

1. **Getting Week A/B logic backwards**
   - Always check: Who gets SHARED night support?
   - Week A = Libby shares
   - Week B = James shares

2. **Showing indicators in wrong places**
   - Roster = NO indicators (clean editing interface)
   - Planner = Toggle buttons only (no indicators)

3. **Adding week labels back to participant cards**
   - They were removed intentionally!
   - Only show at page level

---

**Last Updated:** October 4, 2025  
**Branch:** `feature/current-planning-tabs`  
**Status:** Fully functional, ready for use

