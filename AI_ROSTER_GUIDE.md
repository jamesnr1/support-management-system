# 🤖 AI GUIDE: Creating Rosters

**READ THIS BEFORE CREATING ANY ROSTER!**

This guide exists because AI (including me) has repeatedly made the same mistakes. Follow this checklist religiously.

---

## 📋 BEFORE YOU START

### Step 1: Read Requirements File
```bash
cat PARTICIPANT_REQUIREMENTS.json
```

**DO NOT TRUST YOUR MEMORY. READ THE FILE EVERY TIME.**

### Step 2: Run Validation After Creation
```bash
cd backend
python3 validate_roster_requirements.py
```

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Mistake #1: Grace's Hours
**WRONG:** Giving Grace 12h weekdays (8am-8pm)
**RIGHT:** 
- **Weekdays:** 8.5h = 6.5h (6am-8pm window) + **2h EVENING (8pm-10pm)** ← DON'T FORGET THIS!
- **Saturday:** 16h (6am-10pm)
- **Sunday:** 16h (6am-10pm)

### ❌ Mistake #2: Milan Weekend
**WRONG:** One 6-hour shift
**RIGHT:** TWO separate 3-hour shifts (self-care + community), can be same worker

### ❌ Mistake #3: 10-Hour Rest
**WRONG:** Worker finishes night shift 6am, starts next shift 8am
**RIGHT:** Must have 10 hours rest (can't work before 4pm next day)

### ❌ Mistake #4: Not Checking Gender Preferences
**WRONG:** Assigning only male workers to Grace/Libby
**RIGHT:** Grace & Libby PREFER female (look for female first, but male OK if needed)
**NOTE:** This is a preference, not a blocking requirement

### ❌ Mistake #5: Forgetting Special Assignments
- Sandy: Early morning 6-8am shifts
- Chaynne: Specific Tue 9-1pm + Fri 12-4pm
- Mihir: EXACTLY 24 hours (not ~24, EXACTLY 24)

---

## ✅ CREATION CHECKLIST

Use this checklist EVERY TIME:

### James (JAM001):
- [ ] 24/7 coverage (168h total, 336 worker hours)
- [ ] All shifts are 2:1 ratio
- [ ] No gaps in coverage
- [ ] Mix of workers allowed

### Grace (GRA001):
- [ ] Mon-Fri: 6.5h during day (6am-8pm) ✅
- [ ] Mon-Fri: **2h EVENING (8pm-10pm)** ← CHECK THIS!
- [ ] Saturday: 16h (6am-10pm)
- [ ] Sunday: 16h (6am-10pm)
- [ ] **PREFER FEMALE WORKERS** (not mandatory, but prioritize female)
- [ ] All shifts 1:1 ratio

### Milan (MIL001):
- [ ] Weekend only (if current roster)
- [ ] Sat: 3h self-care + 3h community (SEPARATE shifts)
- [ ] Sun: 3h self-care + 3h community (SEPARATE shifts)
- [ ] Can use same worker for both shifts each day
- [ ] All shifts 1:1 ratio

### Validation:
- [ ] No worker works night (ends 6am) then morning same day
- [ ] 10-hour rest between adjacent day shifts
- [ ] 2-hour break between different participants (except split shifts)
- [ ] All special worker assignments included
- [ ] Worker hours match targets
- [ ] Locked shifts NOT changed (time or worker)
- [ ] Locked shift hours included in worker totals
- [ ] Hours balanced across workers (~10h of targets)
- [ ] Gender preferences honored (prefer female for Grace/Libby)

---

## 🔧 TOOLS AVAILABLE

1. **Requirements File:** `PARTICIPANT_REQUIREMENTS.json`
   - Participant hour breakdowns
   - Time windows
   - Ratios
   - Current roster constraints

2. **Validation Script:** `backend/validate_roster_requirements.py`
   - Checks Grace hours
   - Checks James 24/7 coverage
   - Checks Milan separate shifts
   - Reports errors and warnings

3. **Plans File:** `plans.txt`
   - Original requirements document
   - Week A/Week B logic
   - Full system overview

---

## 📝 CORRECT WORKFLOW

1. **READ** `PARTICIPANT_REQUIREMENTS.json`
2. **NOTE** special constraints for current roster
3. **CREATE** roster data
4. **CALCULATE** each participant's daily/weekly hours
5. **VERIFY** against requirements
6. **RUN** validation script
7. **FIX** all errors
8. **PRESENT** to user with hour breakdown

---

## 🔒 LOCKED SHIFTS

Some shifts may be locked (fixed time and worker). When working with locked shifts:

1. **DO NOT** change the time
2. **DO NOT** change the worker
3. **DO** include locked shift hours in worker calculations
4. Look for `"locked": true` in roster data

**Example:**
```json
{
  "id": "jam_mon_night",
  "startTime": "22:00",
  "endTime": "06:00",
  "duration": 8,
  "workers": [138],
  "locked": true  ← This shift is LOCKED
}
```

---

## ⚖️ HOUR BALANCING

Keep worker hours relatively balanced, with **PRIORITY for low-hour workers**:

### 🚨 CRITICAL: Low-Hour Workers FIRST
**Workers with low max hours (8-24h) have restrictions and RELY on these hours!**

- Student visas
- Other job commitments
- Personal restrictions
- **They cannot get more hours elsewhere**

**RULE: Give low-hour workers their FULL allocation BEFORE distributing to high-hour workers.**

**Priority Order:**
1. **Low-hour workers (8-24h):** Mihir (24h), Parvinder (24h), Sandy (20h), Chaynne (8h)
   - These workers MUST get close to/at their max hours
   
2. **Mid-hour workers (25-39h):** 
   - Fill to target before going to high-hour workers
   
3. **High-hour workers (40-48h):** 
   - These workers have flexibility
   - Can absorb hour variations
   - Use them to balance remaining hours

### General Balancing:
- Aim for workers within ~10h of their target hours
- Don't over-assign to some while under-utilizing others
- Account for locked shifts when calculating available hours
- Consider worker availability when balancing

**Example:**
- ✅ CORRECT: Mihir (24h max) gets 24h, Happy (48h max) gets 35h
- ❌ WRONG: Mihir (24h max) gets 16h, Happy (48h max) gets 48h

**Remember: High-hour workers have flexibility. Low-hour workers don't. Protect low-hour allocations!**

---

## 📋 NDIS PLAN CHANGES

NDIS can issue new/updated plans at any time:

- Participant hours may change
- Support ratios may be adjusted
- Funding categories may change
- Always check if `PARTICIPANT_REQUIREMENTS.json` is current
- Ask user if NDIS plan has been updated before creating roster

**📚 Full guide:** See `NDIS_PLAN_UPDATE_GUIDE.md` for complete checklist of what to update when plans change.

**Quick check before roster creation:**
- "Are all NDIS plans current?"
- "Have any participant hours/ratios changed recently?"
- "Is `PARTICIPANT_REQUIREMENTS.json` up to date?"

---

## 💡 WHEN IN DOUBT

- Check `PARTICIPANT_REQUIREMENTS.json` first
- Verify if NDIS plans are current
- Ask user to clarify before guessing
- Run validation script before committing
- Show calculations explicitly
- Check for locked shifts

---

## 🎯 EXAMPLE: Grace Weekday

**CORRECT BREAKDOWN:**
```
Monday:
- 10:00-16:30 (6.5h daytime, Arti)
- 20:00-22:00 (2h evening, Sapana)  ← DON'T FORGET!
Total: 8.5h ✅
```

**WRONG:**
```
Monday:
- 08:00-14:00 (6h, Arti)
- 14:00-20:00 (6h, Sapana)
Total: 12h ❌ (Missing evening, too many hours)
```

---

## 📊 VALIDATION COMMAND

After creating roster:
```bash
cd backend
python3 validate_roster_requirements.py
```

Fix ALL errors before presenting to user!

---

**Remember: The requirements file is the source of truth. Your memory is not.**

