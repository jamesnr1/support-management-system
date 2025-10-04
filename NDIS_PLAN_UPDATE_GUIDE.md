# 📋 NDIS Plan Update Guide

**What to do when NDIS issues a new or updated plan for a participant**

---

## 🔄 WHEN DO NDIS PLANS CHANGE?

NDIS plans can be updated or reissued at any time:
- **Scheduled review** (typically annual)
- **Plan review request** by participant/family
- **Change in circumstances** (needs increase/decrease)
- **Funding adjustment** (hours, categories, ratios)

---

## ✅ CHECKLIST: What to Update in the System

When you receive a new NDIS plan, follow this checklist:

### 1. **Update `PARTICIPANT_REQUIREMENTS.json`** 📄

This is the **single source of truth** for participant requirements.

**What to update:**

#### Total Weekly Hours:
```json
"total_hours_per_week": 107.33  ← UPDATE THIS
```

#### Daily/Weekly Schedule Breakdown:
```json
"weekday_schedule": {
  "day": {
    "hours_per_day": 6.5,  ← UPDATE THIS
    "total_hours": 32.5     ← UPDATE THIS
  }
}
```

#### Support Ratios:
```json
"ratio": "2:1"  ← UPDATE if ratio changes (1:1, 2:1, 2:3)
```

#### Gender Requirements:
```json
"gender_requirement": "prefer_female"  ← UPDATE if preferences change
```

#### Time Windows:
```json
"time_window": "06:00-20:00"  ← UPDATE if funding time bands change
```

---

### 2. **Update Database (if applicable)** 💾

If participant data is stored in the database:

**Database Tables to Update:**
- `participants` table: hours, ratios, funding categories
- `roster_data` table: may need adjustment if current roster affected

**SQL Example:**
```sql
-- Update participant hours
UPDATE participants 
SET weekly_hours = 107.33,
    funding_category = 'High Intensity',
    support_ratio = '1:1',
    updated_at = NOW()
WHERE code = 'GRA001';
```

---

### 3. **Review Current Roster** 📅

Check if the current roster needs adjustment:

**Questions to Ask:**
- Does current week's roster fit within new hours?
- Has the ratio changed? (e.g., 2:1 → 1:1)
- Do locked shifts still align with new plan?
- Are workers over/under-allocated based on new hours?

**Actions:**
- If current week affected: Adjust immediately
- If future weeks affected: Update Planner tab
- If ratios changed: May need to add/remove workers from shifts

---

### 4. **Update Hours Tracking Logic** 📊

If time bands or ratios changed, update `HoursTracker.js`:

**Example Changes:**
```javascript
// If day hours changed
const dayHours = 6.5;  // ← UPDATE THIS

// If ratio changed
const ratio = '2:1';   // ← UPDATE THIS

// If shared support changed
const sharedNightHours = 37.33;  // ← UPDATE THIS
```

**Location:** `frontend/src/components/HoursTracker.js`

---

### 5. **Update Validation Rules** ✅

If ratios or time bands changed, update `validation_rules.py`:

**Location:** `backend/validation_rules.py`

**Example:**
```python
# If ratio changed for participant
PARTICIPANT_RATIOS = {
    'GRA001': '1:1',  # ← UPDATE THIS
    'JAM001': '2:1',
}
```

---

### 6. **Update AI Helper Files** 🤖

Update documentation so AI helpers create correct rosters:

**Files to Update:**

1. **`PARTICIPANT_REQUIREMENTS.json`** (already covered above)
2. **`AI_ROSTER_GUIDE.md`** - Update examples if needed
3. **`plans.txt`** - Update original requirements document

---

### 7. **Communicate Changes** 📢

**Who to notify:**
- Support workers (if their hours/shifts affected)
- Family/participant (confirmation of changes)
- Team members managing rosters

**What to communicate:**
- New weekly hours
- Ratio changes (affects number of workers per shift)
- Time band changes
- Effective date of new plan

---

## 🎯 EXAMPLE: Grace's Plan Changed

**Scenario:** Grace's new NDIS plan increases weekday hours from 6.5h to 8h per day.

### Step-by-Step Update:

#### 1. Update `PARTICIPANT_REQUIREMENTS.json`:
```json
"weekday_schedule": {
  "day": {
    "time_window": "06:00-20:00",
    "hours_per_day": 8,           // ← CHANGED from 6.5
    "total_hours": 40,             // ← CHANGED from 32.5
    "ratio": "1:1"
  }
}
```

#### 2. Calculate new weekly total:
- Old: 32.5 (weekday day) + 10 (weekday evening) + 32 (weekend) + 37.33 (night) = 111.83h
- New: 40 (weekday day) + 10 (weekday evening) + 32 (weekend) + 37.33 (night) = 119.33h

```json
"total_hours_per_week": 119.33  // ← UPDATE THIS
```

#### 3. Update current roster:
- Review Grace's Mon-Fri shifts
- Extend from 6.5h to 8h per day
- Assign additional 1.5h per day (7.5h total for week)

#### 4. Update `HoursTracker.js`:
```javascript
case 'GRA001':
  weekdayDayHours = 8;  // ← CHANGED from 6.5
```

#### 5. Communicate to workers:
"Grace's plan has been updated. Weekday shifts now 8 hours instead of 6.5 hours, effective [date]."

---

## 🚨 CRITICAL REMINDERS

### Don't Forget:
- ✅ Update `PARTICIPANT_REQUIREMENTS.json` FIRST (source of truth)
- ✅ Check if current week roster needs adjustment
- ✅ Update Planner for future weeks
- ✅ Verify worker hours still balanced
- ✅ Check locked shifts still valid
- ✅ Test hours tracking calculations
- ✅ Communicate changes to workers

### Common Mistakes:
- ❌ Only updating roster without updating requirements file
- ❌ Forgetting to update hours tracking logic
- ❌ Not checking locked shifts against new plan
- ❌ Not communicating changes to affected workers

---

## 📞 WHEN TO ASK FOR HELP

Ask user/manager if:
- Unclear if plan change affects current week
- New ratio requires adding/removing workers from shifts
- Not sure how to handle locked shifts with new plan
- Time bands changed significantly
- Funding categories restructured

---

## ✅ VERIFICATION CHECKLIST

After updating everything, verify:

- [ ] `PARTICIPANT_REQUIREMENTS.json` updated
- [ ] Database updated (if applicable)
- [ ] Current roster reviewed and adjusted if needed
- [ ] Future rosters in Planner updated
- [ ] `HoursTracker.js` updated (if logic changed)
- [ ] `validation_rules.py` updated (if ratios changed)
- [ ] Worker hours still balanced
- [ ] Locked shifts still valid
- [ ] AI helper files updated
- [ ] Workers/family notified of changes
- [ ] Test roster creation with new requirements
- [ ] Test hours tracking calculations

---

## 🔧 TOOLS TO USE

**Validation after update:**
```bash
cd backend
python3 validate_roster_requirements.py
```

**Test hours calculation:**
- Open Hours Tracker tab
- Verify calculations match new plan

**Test roster creation:**
- Create a test shift in Planner
- Verify ratios, time bands, hours all correct

---

**Remember: NDIS plan changes affect the entire system. Update systematically and verify thoroughly!** 🎯

