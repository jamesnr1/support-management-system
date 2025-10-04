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

### ❌ Mistake #4: Not Checking Female Requirement
**WRONG:** Assigning male workers to Grace
**RIGHT:** Grace MUST have female workers only

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
- [ ] **FEMALE WORKERS ONLY**
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

## 💡 WHEN IN DOUBT

- Check `PARTICIPANT_REQUIREMENTS.json` first
- Ask user to clarify before guessing
- Run validation script before committing
- Show calculations explicitly

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

