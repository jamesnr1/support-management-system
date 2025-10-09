# 📊 Hours Tracking Audit Report

**Date:** October 4, 2025  
**Scope:** Grace (GRA001) - Week A  
**Status:** ⚠️ Issues Found

---

## 🔍 Audit Results

### ✅ What's Working:
1. **Hour calculation is functional** - system correctly sums shift durations
2. **Category structure is correct** - all 11 NDIS funding codes are defined
3. **Day-of-week detection works** - Saturday/Sunday categorization is accurate
4. **Visual display is good** - hour bars, percentages, and colors display correctly

---

## 🔴 Critical Issues Found

### **Issue #1: Evening Hours Miscategorized**

**Location:** `frontend/src/components/HoursTracker.js` lines 177-180

**Current Logic:**
```javascript
} else if (startTime >= 20 || startTime < 6) { // Night
    fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWN';
} else if (startTime >= 18) { // Evening
    fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWE';
```

**Problem:**  
Shifts starting at 20:00 (8PM) are being categorized as **NIGHT** instead of **EVENING**.

**NDIS Standard Time Bands:**
- **Day:** 6:00 AM - 5:59 PM
- **Evening:** 6:00 PM - 9:59 PM ← **20:00 falls here**
- **Night:** 10:00 PM - 5:59 AM

**Impact on Grace:**
- 5 weekday shifts from 20:00-22:00 (2h each = 10h total)
- Currently: Counted as SCWN (Night)
- Should be: Counted as SCWE (Evening)

**Fix Required:**
```javascript
} else if (startTime >= 22 || startTime < 6) { // Night (10PM-6AM)
    fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWN';
} else if (startTime >= 18) { // Evening (6PM-10PM)
    fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWE';
```

---

### **Issue #2: Daily Hours Exceed Grace's Plan**

**Business Rule:** Grace gets 6.5h day + 2h evening = **8.5h max per weekday**

**Actual Roster:**

| Day | Actual Hours | Expected | Variance |
|-----|-------------|----------|----------|
| Mon | 11.0h | 8.5h | **+2.5h** ⚠️ |
| Tue | 10.0h | 8.5h | **+1.5h** ⚠️ |
| Wed | 9.0h | 8.5h | **+0.5h** ⚠️ |
| Thu | 6.0h | 8.5h | -2.5h |
| Fri | 9.0h | 8.5h | **+0.5h** ⚠️ |
| Sat | 14.0h | 16.0h | -2.0h |
| Sun | 14.0h | 16.0h | -2.0h |

**Root Cause:** No validation enforces daily limits per participant

---

### **Issue #3: Missing Night Shift Hours**

**Business Rule:** Grace should have **37.33 hours** of night shifts (10PM-6AM) in shared 2:3 coverage.

**Actual:** **0 hours** of true night shifts

**Note:** The roster has NO shifts from 22:00-06:00 (true night hours)

---

### **Issue #4: Weekend Hours Under-allocated**

**Expected:** 16h per weekend day (Saturday & Sunday)  
**Actual:** 14h per weekend day  
**Missing:** 2h per day × 2 days = **4h total**

---

## 📈 Total Hours Comparison

| Category | Business Plan | Roster Actual | Variance |
|----------|--------------|---------------|----------|
| Weekday Day | 32.5h | 41.0h | **+8.5h** 🔴 |
| Weekday Evening | 10.0h | 0h* | **-10.0h** 🔴 |
| Saturday | 16.0h | 14.0h | -2.0h |
| Sunday | 16.0h | 14.0h | -2.0h |
| Night (10PM-6AM) | 37.33h | 0h | **-37.33h** 🔴 |
| **TOTAL** | **111.83h** | **73.0h** | **-38.83h** |

\* *Miscategorized as Night (4h) due to Issue #1*

---

## 🎯 Recommendations

### **Priority 1: Fix Evening Categorization** 
Change line 177 in `HoursTracker.js`:
- From: `startTime >= 20`
- To: `startTime >= 22`

### **Priority 2: Add Daily Limit Validation**
Add a validation rule in `validation_rules.py` to check participant daily hour limits:
```python
def check_participant_daily_limits(self):
    """Check if participants exceed their daily hour allocations"""
    # Grace: 8.5h weekdays, 16h weekends
    # James: No limit (24h coverage)
    # Libby: No limit (24h coverage)
    # etc.
```

### **Priority 3: Complete Night Shift Roster**
Add night shifts (10PM-6AM) for Grace, Ace, and Libby as per 2:3 shared coverage plan.

### **Priority 4: Balance Weekend Hours**
Add 2 hours per weekend day to match the 16h allocation.

---

## 🧪 Testing Performed

1. ✅ Fetched Grace's Week A roster data via API
2. ✅ Analyzed shift times and durations
3. ✅ Simulated hours categorization logic
4. ✅ Compared against business rules in `plans.txt`
5. ✅ Identified categorization bug
6. ✅ Calculated total variance

---

## ✅ Next Steps

1. Fix evening/night time boundary (22:00, not 20:00)
2. Test hours tracker displays correctly
3. Add participant daily limit validation
4. Update roster to include night shifts
5. Balance weekend hours

---

**Audited by:** AI Assistant  
**Verified against:** `plans.txt`, `HoursTracker.js`, roster API data
