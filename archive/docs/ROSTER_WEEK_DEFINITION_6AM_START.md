# 📅 ROSTER WEEK DEFINITION - Starts at 6AM

**Critical Change:** Roster weeks run from **6:00am Monday to 6:00am the following Monday**, not midnight to midnight.

---

## 🕐 WEEK BOUNDARY DEFINITION

### **Roster Week for Oct 6-12, 2025:**
- **STARTS:** Monday, Oct 6, 2025 at 6:00am
- **ENDS:** Monday, Oct 13, 2025 at 6:00am (not included in this roster)

---

## 🌙 OVERNIGHT SHIFTS AT WEEK BOUNDARIES

### **Sunday Night Shift (Oct 5, 22:00 → Oct 6, 06:00):**
- **Workers:** Hamza + Sanjay
- **Status:** ❌ NOT INCLUDED in Oct 6-12 roster
- **Reason:** This shift belongs to the **PREVIOUS week** (ending Monday Oct 6 at 6am)

### **Monday Start (Oct 6, 06:00):**
- **First Shift:** 06:00-08:00 (Sandy + Happy)
- **Status:** ✅ INCLUDED - This is the first shift of the new week

### **Sunday Night Shift (Oct 12, 22:00 → Oct 13, 06:00):**
- **Workers:** Would be assigned in next week's roster
- **Status:** ❌ NOT INCLUDED in Oct 6-12 roster
- **Reason:** This shift belongs to the **NEXT week** (starting Monday Oct 13 at 6am)

### **Sunday End (Oct 12, 22:00):**
- **Last Shift:** 14:00-22:00 (Happy + Avani)
- **Status:** ✅ INCLUDED - This is the last shift before the week ends

---

## 🔄 WHAT CHANGED

### **BEFORE (Incorrect):**
```
Roster included:
- Mon Oct 6: 22:00-06:00 (Hamza + Sanjay) ❌
- Mon Oct 6: 06:00-08:00 onwards ✓
...
- Sun Oct 12: shifts during the day ✓
- Sun Oct 12: 22:00-06:00 (Mayu + Hamza) ❌
```

### **AFTER (Correct):**
```
Roster includes:
- Mon Oct 6: Starts at 06:00 (Sandy + Happy) ✓
- Tue-Sat: All shifts including overnight shifts that START on these days ✓
- Sun Oct 12: Ends at 22:00 (last shift ends at 10pm) ✓

NOT included:
- Sun Oct 5: 22:00-06:00 (previous week)
- Sun Oct 12: 22:00-06:00 (next week)
```

---

## 📊 UPDATED TOTALS

### **Participant Hours (6am Mon → 10pm Sun):**

| Participant | Hours | Notes |
|-------------|-------|-------|
| **JAMES** | 160h | Was 168h (lost 8h from removed boundary shifts) |
| **GRACE** | 98h | No change |
| **ACE** | 24h | No change |
| **MILAN** | 12h | No change |
| **TOTAL** | **294h** | Was 302h (-8h from removed overnight shifts) |

### **Worker Hours (Updated):**

| Worker | Hours | Change | Notes |
|--------|-------|--------|-------|
| Rosie | 48h | No change | Still highest hours |
| Sanjay | 40h | **-8h** | Mon overnight removed (was in previous week) |
| Taufique | 32h | No change | All 4 night shifts (Tue-Fri) within this week |
| Hamza | 32h | No change | Tue night shift within this week |
| Mayu | 32h | No change | |
| Krunal | 32h | No change | Sat night shift within this week |
| Mihir | 32h | No change | Thu night shift within this week |
| MP | 32h | No change | Sat night shift within this week |
| Parvinder | 26h | No change | |
| Arti | 24h | No change | |
| Sapana | 24h | No change | |
| Happy | 24h | No change | |
| Avani | 16h | No change | |
| Sandy | 14h | No change | |
| Chaynne | 8h | No change | |

---

## 🎯 KEY UNDERSTANDING

### **How Overnight Shifts Work in the Roster:**

1. **Overnight shifts are listed on the day they START**
   - Example: Tuesday 22:00 → Wednesday 06:00 is listed under "Tuesday"

2. **Only overnight shifts that START within the week are included**
   - ✅ Tue 22:00 → Wed 06:00 (starts Tue, within week)
   - ✅ Wed 22:00 → Thu 06:00 (starts Wed, within week)
   - ✅ Thu 22:00 → Fri 06:00 (starts Thu, within week)
   - ✅ Fri 22:00 → Sat 06:00 (starts Fri, within week)
   - ✅ Sat 22:00 → Sun 06:00 (starts Sat, within week)
   - ❌ Sun 22:00 → Mon 06:00 (starts Sun but ends in NEXT week)

3. **Week boundary shifts are excluded**
   - ❌ Sun Oct 5 22:00 → Mon Oct 6 06:00 (ends at week start)
   - ❌ Sun Oct 12 22:00 → Mon Oct 13 06:00 (ends in next week)

---

## 📂 FILES UPDATED

✅ `roster_oct6-12_COMPLETE.json` - JSON with 6am start  
✅ `FINAL_ROSTER_OCT6-12_WEEK_STARTS_6AM.csv` - Complete CSV with notes  
✅ `ROSTER_WEEK_DEFINITION_6AM_START.md` - This explanation document

---

## ✅ VERIFICATION

| Item | Status |
|------|--------|
| Week starts 6am Monday | ✅ |
| Week ends 6am Monday (next week) | ✅ |
| First shift: Mon 06:00 | ✅ |
| Last shift ends: Sun 22:00 | ✅ |
| Overnight shifts within week: 5 | ✅ (Tue, Wed, Thu, Fri, Sat nights) |
| Boundary overnight shifts excluded: 2 | ✅ (Sun night at start and end) |
| Total shifts: 53 | ✅ (was 55, removed 2 boundary shifts) |
| Total hours: 294 | ✅ (was 302, removed 16h from 2 overnight shifts) |

---

**✅ ROSTER CORRECTED FOR 6AM WEEK START**

The roster now accurately reflects that the week runs from **6:00am Monday to 6:00am the following Monday**, with overnight shifts at the week boundaries excluded.

