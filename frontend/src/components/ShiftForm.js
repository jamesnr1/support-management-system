import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { validateRosterAPI } from '../utils/shiftValidation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ShiftForm = ({ 
  participant, 
  date, 
  editingShift, 
  workers: allWorkers, 
  locations, 
  onSave, 
  onCancel,
  onDelete,
  existingShifts = [],
  weekType,
  rosterData = {}
}) => {
  // ===== ALL HOOKS MUST BE AT THE TOP - React Rules =====
  const [workers, setWorkers] = useState(allWorkers || []);
  const [isFormReady, setIsFormReady] = useState(false);
  const [unavailableWorkers, setUnavailableWorkers] = React.useState(new Set());
  const [unavailabilityCheckComplete, setUnavailabilityCheckComplete] = useState(false);
  const [workerAvailabilityRules, setWorkerAvailabilityRules] = React.useState({}); // Store availability rules for each worker

  // Helper functions for name formatting
  const getDisplayName = (fullName) => {
    if (!fullName) return '';
    const match = fullName.match(/\(([^)]+)\)/);
    return match ? match[1] : fullName.split(' ')[0]; // Use preferred name or first name
  };

  // Calculate worker hours for the current week type
  const calculateWorkerHours = (workerId, currentWeekType) => {
    if (!rosterData || !workerId) return 0;
    
    let totalHours = 0;
    
    // Iterate through all participants in the current week (week-specific structure)
    Object.keys(rosterData).forEach(participantCode => {
      const participantData = rosterData[participantCode];
      if (!participantData) return;
      
      // Iterate through all dates for this participant
      Object.keys(participantData).forEach(date => {
        const shifts = Array.isArray(participantData[date]) ? participantData[date] : [];
        
        // Check each shift for this worker
        shifts.forEach(shift => {
          const hasWorker = Array.isArray(shift.workers) && shift.workers.some(w => String(w) === String(workerId));
          if (hasWorker) {
            const duration = parseFloat(shift.duration || 0);
            totalHours += duration;
          }
        });
      });
    });
    
    return totalHours;
  };

  // Format hours display with color coding
  const formatWorkerHours = (hours) => {
    const roundedHours = Math.round(hours * 10) / 10; // Round to 1 decimal
    let color = "#28a745"; // Green for normal
    
    if (hours >= 50) {
      color = "#dc3545"; // Red for over weekly limit
    } else if (hours >= 12) {
      color = "#ffc107"; // Yellow for daily limit
    }
    
    return { hours: roundedHours, color };
  };


  // Early return if critical data is missing
  if (!participant || !Array.isArray(allWorkers) || !Array.isArray(locations)) {
    return (
      <div className="shift-row" style={{
        background: 'var(--bg-tertiary)',
        borderLeft: '4px solid var(--accent-primary)',
        marginBottom: '0.5rem',
        borderRadius: '4px',
        padding: '0.6rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '98%',
        boxSizing: 'border-box'
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>Loading form...</span>
      </div>
    );
  }

  // Generate time options starting from 6am with hourly increments
  const generateTimeOptions = () => {
    const times = [];
    // Generate times from 6am to 11pm (6-23)
    for (let hour = 6; hour <= 23; hour++) {
      const time24 = `${hour.toString().padStart(2, '0')}:00`;
      times.push({
        value: time24,
        label: time24
      });
    }
    // Add midnight (00:00)
    times.push({
      value: '00:00',
      label: '00:00'
    });
    // Add early morning hours (1am to 5am)
    for (let hour = 1; hour <= 5; hour++) {
      const time24 = `${hour.toString().padStart(2, '0')}:00`;
      times.push({
        value: time24,
        label: time24
      });
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Generate shift report number in format: L2025092201 (Letter + Date + Sequence)
  function generateShiftNumber() {
    const dateStr = date ? date.replace(/-/g, '') : '00000000';
    const participantInitial = participant?.full_name ? participant.full_name.charAt(0).toUpperCase() : 'X';
    const sequenceNum = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // 2-digit sequence
    return `${participantInitial}${dateStr}${sequenceNum}`; // Format: L2025092201
  }
  
  // Fetch unavailability status and availability rules for all workers
  React.useEffect(() => {
    // CRITICAL: Reset state immediately when date changes
    setUnavailabilityCheckComplete(false);
    setUnavailableWorkers(new Set());
    setWorkerAvailabilityRules({}); // Reset rules as well
    
    const fetchAvailabilityData = async () => {
      if (!workers || workers.length === 0 || !date) {
        console.log('⏭️ Skipping availability fetch:', { workersCount: workers?.length, date });
        setUnavailabilityCheckComplete(true); // Mark as complete even if skipping
        return;
      }
      
      console.log('🔄 Starting availability fetch for', workers.length, 'workers on', date);
      
      try {
        const shiftDate = new Date(date);
        shiftDate.setHours(0, 0, 0, 0);
        const dayOfWeek = shiftDate.getDay();
        
        const unavailableIds = new Set();
        
        // Fetch unavailability periods in a SINGLE batch query (much faster)
        try {
          const unavailabilityResponse = await axios.get(`${BACKEND_URL}/api/unavailability-periods`, {
            params: { check_date: date }
          });
          
          const unavailableWorkers = unavailabilityResponse.data || [];
          unavailableWorkers.forEach(period => {
            unavailableIds.add(String(period.worker_id));
          });
          
          console.log(`🚫 Found ${unavailableIds.size} unavailable workers on ${date}`);
        } catch (error) {
          console.error('Error fetching unavailability periods:', error);
          // Continue without unavailability check - allow all workers
        }
        
        // Fetch ALL availability rules for this day of week in a SINGLE batch query
        // This is much faster than individual queries per worker
        try {
          const rulesResponse = await axios.get(`${BACKEND_URL}/api/availability-rules`, {
            params: { weekday: dayOfWeek }
          });
          
          const allRules = rulesResponse.data || [];
          
          // Group rules by worker ID (convert to string for consistency)
          const rulesByWorker = {};
          allRules.forEach(rule => {
            const workerId = String(rule.worker_id);
            if (!rulesByWorker[workerId]) {
              rulesByWorker[workerId] = [];
            }
            rulesByWorker[workerId].push(rule);
          });
          
          console.log(`📋 Fetched ${allRules.length} availability rules for weekday ${dayOfWeek}`);
          console.log(`📋 Rules grouped for ${Object.keys(rulesByWorker).length} workers`);
          console.log('📋 Sample rules:', Object.entries(rulesByWorker).slice(0, 3));
          
          setWorkerAvailabilityRules(rulesByWorker);
        } catch (error) {
          console.error('Error fetching availability rules:', error);
          // Continue without availability rules - allow all workers
          setWorkerAvailabilityRules({});
        }
        
        console.log('✅ Availability fetch complete. Unavailable workers:', Array.from(unavailableIds));
        setUnavailableWorkers(unavailableIds);
        setUnavailabilityCheckComplete(true);
      } catch (error) {
        console.error('Error fetching availability:', error);
        setUnavailabilityCheckComplete(true);
      }
    };
    
    fetchAvailabilityData();
  }, [workers, date]);
  
  // Filter available workers based on time and date
  const getAvailableWorkers = useCallback((currentFormData, workersList = []) => {
    console.log('🔄 getAvailableWorkers called with:', {
      formData: currentFormData,
      workersCount: workersList?.length,
      date,
      unavailabilityCheckComplete,
      rulesLoaded: Object.keys(workerAvailabilityRules).length
    });
    
    if (!currentFormData?.startTime || !currentFormData?.endTime || !date) return workersList || [];
    
    // Wait for unavailability check to complete before showing any workers
    // This prevents showing unavailable workers on first click
    if (!unavailabilityCheckComplete) {
      console.log('⏳ Waiting for unavailability check to complete');
      return [];
    }
    
    const startTime = currentFormData.startTime;
    const endTime = currentFormData.endTime;
    const shiftDate = new Date(date);
    const dayOfWeek = shiftDate.getDay();
    
    // Helper function to convert time to minutes for comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    // Helper function to check if two time ranges overlap
    const timeRangesOverlap = (start1, end1, start2, end2) => {
      const start1Min = timeToMinutes(start1);
      const end1Min = timeToMinutes(end1);
      const start2Min = timeToMinutes(start2);
      const end2Min = timeToMinutes(end2);
      
      // Handle overnight shifts
      const isOvernight1 = end1Min < start1Min;
      const isOvernight2 = end2Min < start2Min;
      
      if (isOvernight1 && isOvernight2) {
        // Both overnight - check if they overlap
        return !(end1Min >= start2Min && end2Min >= start1Min);
      } else if (isOvernight1) {
        // First is overnight, second is not
        return !(end1Min >= start2Min && end2Min >= start1Min);
      } else if (isOvernight2) {
        // Second is overnight, first is not
        return !(end2Min >= start1Min && end1Min >= start2Min);
      } else {
        // Neither is overnight
        return start1Min < end2Min && start2Min < end1Min;
      }
    };
    
    // Helper function to check insufficient rest time with previous day's shifts
    const hasInsufficientRest = (worker) => {
      // Calculate previous date
      const currentDate = new Date(date);
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const prevDateStr = previousDate.toISOString().split('T')[0];
      
      // Check all participants for this worker on previous day
      for (const participantCode in rosterData) {
        const participantShifts = rosterData[participantCode];
        if (participantShifts && participantShifts[prevDateStr]) {
          for (const prevShift of participantShifts[prevDateStr]) {
            const hasWorker = Array.isArray(prevShift.workers) 
              ? prevShift.workers.some(w => String(w) === String(worker.id))
              : String(prevShift.workers) === String(worker.id) || String(prevShift.worker_id) === String(worker.id);
            
            if (hasWorker) {
              // Get previous shift end time and current shift start time
              const prevEndTime = prevShift.endTime || prevShift.end_time;
              const currentStartTime = startTime;
              
              // Calculate hours between shifts (cross-day rest period)
              const prevEndMin = timeToMinutes(prevEndTime);
              const currentStartMin = timeToMinutes(currentStartTime);
              
              // For cross-day rest: previous day end to next day start
              // This is always a full day minus the time from midnight to current start
              const hoursFromMidnightToCurrentStart = currentStartMin / 60;
              const hoursFromPrevEndToMidnight = (1440 - prevEndMin) / 60;
              const totalRestHours = hoursFromPrevEndToMidnight + hoursFromMidnightToCurrentStart;
              
              // Require at least 8 hours rest between shifts
              const minRestHours = 8;
              if (totalRestHours < minRestHours) {
                console.log(`⚠️ Worker ${worker.id} has insufficient rest: ${totalRestHours.toFixed(1)}h between ${prevEndTime} (${prevDateStr}) and ${currentStartTime} (${date})`);
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    return (workersList || []).filter(worker => {
      // Exclude workers who are unavailable on this date
      if (unavailableWorkers.has(String(worker.id))) { // Ensure ID is compared as string
        return false;
      }
      
      // Check availability rules for this worker (ensure string ID comparison)
      const rules = workerAvailabilityRules[String(worker.id)] || [];
      
      // If worker has rules for this day, check them
      if (rules.length > 0) {
        const dayOfWeekRule = rules[0]; // We already filtered by weekday in the fetch
        
        console.log(`🔍 Checking ${worker.full_name} (ID: ${worker.id}):`, {
          rule: dayOfWeekRule,
          shift: `${startTime}-${endTime}`
        });
        
        // Check if worker is available during the shift time
        if (dayOfWeekRule.is_full_day || dayOfWeekRule.wraps_midnight) {
          // Worker is available 24/7 on this day
          console.log(`✅ ${worker.full_name} is available (full day or wraps midnight)`);
          // Continue to other checks
        } else {
          // Check if shift time falls within worker's available hours
          const shiftStartMin = timeToMinutes(startTime);
          const shiftEndMin = timeToMinutes(endTime);
          const ruleStartMin = timeToMinutes(dayOfWeekRule.from_time);
          const ruleEndMin = timeToMinutes(dayOfWeekRule.to_time);
          
          // Handle overnight shifts
          const isShiftOvernight = shiftEndMin < shiftStartMin;
          const isRuleOvernight = ruleEndMin < ruleStartMin;
          
          if (isShiftOvernight || isRuleOvernight) {
            // Complex overnight logic - for now, allow if worker has any availability
            console.log(`✅ ${worker.full_name} allowed (overnight shift logic)`);
            // This can be refined later
          } else {
            // Normal (same-day) shift and rule
            // Shift must be entirely within worker's available hours
            if (shiftStartMin < ruleStartMin || shiftEndMin > ruleEndMin) {
              console.log(`❌ ${worker.full_name} filtered out: shift ${startTime}-${endTime} outside rule ${dayOfWeekRule.from_time}-${dayOfWeekRule.to_time}`);
              return false; // Shift is outside worker's available hours
            }
            console.log(`✅ ${worker.full_name} is available (within hours)`);
          }
        }
      } else {
        console.log(`❌ ${worker.full_name} (ID: ${worker.id}) has no availability rules - not available`);
        return false; // No rules = not available
      }
      
      // Check if worker has ANY shift on this date (regardless of time)
      const hasShiftOnDate = existingShifts.some(existingShift => {
        // CRITICAL: Skip the shift we're currently editing
        if (editingShift && existingShift.id === editingShift.id) {
          return false;
        }
        
        // Check if worker is assigned to this existing shift
        const isAssigned = Array.isArray(existingShift.workers) && existingShift.workers.some(w => String(w) === String(worker.id));
        
        if (isAssigned) {
          console.log(`🚫 Worker ${worker.full_name} filtered out: already has shift ${existingShift.startTime}-${existingShift.endTime} on ${date}`);
          return true;
        }
        
        return false;
      });
      
      if (hasShiftOnDate) {
        return false;
      }
      
      // Check for insufficient rest from previous day
      if (hasInsufficientRest(worker)) {
        return false;
      }
      
      // Check for insufficient rest TO next day (NEW)
      const currentDate = new Date(date);
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      
      // Check all participants for this worker on next day
      for (const participantCode in rosterData) {
        const participantShifts = rosterData[participantCode];
        if (participantShifts && participantShifts[nextDateStr]) {
          for (const nextShift of participantShifts[nextDateStr]) {
            const hasWorker = Array.isArray(nextShift.workers) 
              ? nextShift.workers.some(w => String(w) === String(worker.id))
              : String(nextShift.workers) === String(worker.id) || String(nextShift.worker_id) === String(worker.id);
            
            if (hasWorker) {
              const nextStartTime = nextShift.startTime || nextShift.start_time;
              const currentEndTime = endTime;
              
              const currentEndMin = timeToMinutes(currentEndTime);
              const nextStartMin = timeToMinutes(nextStartTime);
              
              const hoursFromCurrentEndToMidnight = (1440 - currentEndMin) / 60;
              const hoursFromMidnightToNextStart = nextStartMin / 60;
              const totalRestHours = hoursFromCurrentEndToMidnight + hoursFromMidnightToNextStart;
              
              const minRestHours = 8;
              if (totalRestHours < minRestHours) {
                console.log(`🚫 Worker ${worker.full_name} filtered out: insufficient rest before next day shift (${totalRestHours.toFixed(1)}h < ${minRestHours}h)`);
                return false;
              }
            }
          }
        }
      }
      
      // Worker is available
      return true;
    });
  }, [unavailableWorkers, date, existingShifts, unavailabilityCheckComplete, rosterData, editingShift, workerAvailabilityRules]);

  // Helper: Check if worker is assigned to another participant at the same time
  const checkCrossParticipantConflicts = (workerId, shiftDate, startTime, endTime, currentShiftId) => {
    const conflicts = [];
    
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const timeRangesOverlap = (start1, end1, start2, end2) => {
      const start1Min = timeToMinutes(start1);
      let end1Min = timeToMinutes(end1);
      const start2Min = timeToMinutes(start2);
      let end2Min = timeToMinutes(end2);
      
      // Handle overnight (e.g., 22:00-06:00)
      if (end1Min < start1Min) end1Min += 1440;
      if (end2Min < start2Min) end2Min += 1440;
      
      return start1Min < end2Min && start2Min < end1Min;
    };
    
    // Check ALL participants in rosterData
    Object.keys(rosterData || {}).forEach(participantCode => {
      const participantShifts = rosterData[participantCode];
      if (participantShifts && participantShifts[shiftDate]) {
        participantShifts[shiftDate].forEach(existingShift => {
          if (currentShiftId && existingShift.id === currentShiftId) return;
          const hasWorker = Array.isArray(existingShift.workers) && existingShift.workers.some(w => String(w) === String(workerId));
          if (hasWorker) {
            if (timeRangesOverlap(startTime, endTime, existingShift.startTime, existingShift.endTime)) {
              conflicts.push({
                participant: participantCode,
                time: `${existingShift.startTime}-${existingShift.endTime}`,
                shiftNumber: existingShift.shiftNumber
              });
            }
          }
        });
      }
    });
    
    return conflicts;
  };
  
  // Helper: Check for back-to-back shifts (no break between)
  const checkBackToBackShifts = (workerId, shiftDate, startTime, endTime, currentShiftId) => {
    const backToBack = [];
    
    Object.keys(rosterData || {}).forEach(participantCode => {
      const participantShifts = rosterData[participantCode];
      if (participantShifts && participantShifts[shiftDate]) {
        participantShifts[shiftDate].forEach(existingShift => {
          if (currentShiftId && existingShift.id === currentShiftId) return;
          const hasWorker = Array.isArray(existingShift.workers) && existingShift.workers.some(w => String(w) === String(workerId));
          if (hasWorker) {
            if (existingShift.endTime === startTime || existingShift.startTime === endTime) {
              backToBack.push({
                prevEnd: existingShift.endTime,
                nextStart: startTime
              });
            }
          }
        });
      }
    });
    
    return backToBack;
  };
  
  // Helper: Calculate total continuous hours for a worker
  const checkContinuousHours = (workerId, shiftDate, startTime, endTime, currentShiftId) => {
    let totalContinuousHours = calculateDuration(startTime, endTime);
    
    // Look for connected shifts (where one ends and next begins immediately)
    const findConnectedShifts = (date, time, direction) => {
      let hours = 0;
    Object.keys(rosterData || {}).forEach(participantCode => {
      const participantShifts = rosterData[participantCode];
      if (participantShifts && participantShifts[date]) {
        participantShifts[date].forEach(shift => {
          if (currentShiftId && shift.id === currentShiftId) return;
          const hasWorker = Array.isArray(shift.workers) && shift.workers.some(w => String(w) === String(workerId));
          if (hasWorker) {
              if (direction === 'before' && shift.endTime === time) {
                hours += calculateDuration(shift.startTime, shift.endTime);
                hours += findConnectedShifts(date, shift.startTime, 'before');
              } else if (direction === 'after' && shift.startTime === time) {
                hours += calculateDuration(shift.startTime, shift.endTime);
                hours += findConnectedShifts(date, shift.endTime, 'after');
              }
            }
          });
        }
      });
      return hours;
    };
    
    totalContinuousHours += findConnectedShifts(shiftDate, startTime, 'before');
    totalContinuousHours += findConnectedShifts(shiftDate, endTime, 'after');
    
    return totalContinuousHours;
  };

  // Validate shift before saving
  const validateShift = (shiftData) => {
    const errors = [];
    const warnings = [];
    
    // Workers are optional - shifts can be created without workers
    // This allows for planning shifts before worker assignment
    
    // Calculate shift duration
    const startTime = shiftData.startTime;
    const endTime = shiftData.endTime;
    const duration = calculateDuration(startTime, endTime);
    
    // Check for very long shifts
    if (duration > 10) {
      warnings.push(`Shift is very long: ${duration.toFixed(1)} hours`);
    }
    
    // ⚠️ CHECK WORKER COUNT vs RATIO (e.g., 2:1 should have 2 workers)
    if (shiftData.ratio) {
      const requiredWorkers = parseInt(shiftData.ratio.split(':')[0]) || 1;
      const actualWorkers = (shiftData.workers || []).filter(w => w).length;
      
      if (actualWorkers < requiredWorkers) {
        warnings.push(`⚠️ INSUFFICIENT WORKERS: This is a ${shiftData.ratio} shift but only ${actualWorkers} worker(s) assigned. Required: ${requiredWorkers} workers.`);
      }
    }
    
    // Enhanced worker validations (only if workers are selected)
    if (shiftData.workers && shiftData.workers.length > 0) {
      shiftData.workers.forEach(workerId => {
        const worker = (workers || []).find(w => w.id === workerId);
        if (!worker) return;
        
        const workerName = getDisplayName(worker.full_name);
        
        // 1. CHECK CROSS-PARTICIPANT CONFLICTS (same worker, same time, different participants)
        const conflicts = checkCrossParticipantConflicts(workerId, date, startTime, endTime, shiftData.id);
        if (conflicts.length > 0) {
          errors.push(`❌ ${workerName} DOUBLE-BOOKED: Already assigned to ${conflicts[0].participant} (${conflicts[0].shiftNumber}) at ${conflicts[0].time}`);
        }
        
        // 2. CHECK FOR BACK-TO-BACK SHIFTS (no break)
        const backToBackShifts = checkBackToBackShifts(workerId, date, startTime, endTime, shiftData.id);
        if (backToBackShifts.length > 0) {
          warnings.push(`⚠️ ${workerName} DOUBLE SHIFT: Working ${backToBackShifts[0].prevEnd}-${startTime} then ${startTime}-${endTime} (no break)`);
        }
        
        // 3. CHECK FOR CONTINUOUS LONG SHIFTS (16+ hours)
        const continuousHours = checkContinuousHours(workerId, date, startTime, endTime, shiftData.id);
        if (continuousHours >= 16) {
          errors.push(`❌ ${workerName} EXCESSIVE HOURS: ${continuousHours.toFixed(1)} continuous hours without adequate break`);
        } else if (continuousHours >= 12) {
          warnings.push(`⚠️ ${workerName} LONG SHIFT: ${continuousHours.toFixed(1)} continuous hours`);
        }
        
        // 4. CHECK MAXIMUM WEEKLY HOURS
        if (worker.max_hours) {
          const currentHours = calculateWorkerWeeklyHours(workerId);
          const totalHours = currentHours + duration;
          
          if (totalHours > worker.max_hours) {
            errors.push(`❌ ${workerName} would exceed maximum hours: ${totalHours.toFixed(1)}/${worker.max_hours}`);
          }
          // Removed "approaching maximum" warning - only warn when actually exceeding
        }
      });
    }
    
    // Check for minimum break time between shifts
    const breakTimeIssues = checkBreakTimeValidation(shiftData);
    if (breakTimeIssues.length > 0) {
      warnings.push(...breakTimeIssues);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };
  
  // Calculate worker's current weekly hours
  const calculateWorkerWeeklyHours = (workerId) => {
    // Get current week (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    let totalHours = 0;
    
    // Check all roster data for this worker's shifts in current week
    Object.keys(rosterData || {}).forEach(participantCode => {
      const participantData = rosterData[participantCode];
      if (participantData) {
        Object.keys(participantData).forEach(shiftDate => {
          const shiftDateObj = new Date(shiftDate);
          if (shiftDateObj >= startOfWeek && shiftDateObj < endOfWeek) {
            const shifts = Array.isArray(participantData[shiftDate]) ? participantData[shiftDate] : [];
            shifts.forEach(shift => {
              const hasWorker = Array.isArray(shift.workers) && shift.workers.some(w => String(w) === String(workerId));
              if (hasWorker) {
                totalHours += parseFloat(shift.duration || 0);
              }
            });
          }
        });
      }
    });
    
    return totalHours;
  };
  
  // Check minimum break time between shifts
  const checkBreakTimeValidation = (shiftData) => {
    const issues = [];
      const ADJACENT_DAY_MIN_BREAK = 480; // 8 hours minimum between adjacent days
      const SPLIT_SHIFT_MIN_BREAK = 60; // 60 minutes for split shifts (relaxed rule)
    
    // Only check break times if workers are selected
    if (!shiftData.workers || shiftData.workers.length === 0) {
      return issues;
    }
    
    const workerName = (workerId) => getDisplayName((workers || []).find(w => w.id === workerId)?.full_name);
    const currentParticipantCode = participant?.code; // The participant for the NEW shift being created
    
    shiftData.workers.forEach(workerId => {
      // Check for shifts on the same day or adjacent days
      Object.keys(rosterData || {}).forEach(participantCode => {
        const participantData = rosterData[participantCode];
        if (participantData) {
          Object.keys(participantData).forEach(shiftDate => {
            const shifts = Array.isArray(participantData[shiftDate]) ? participantData[shiftDate] : [];
            shifts.forEach(existingShift => {
              const hasWorker = Array.isArray(existingShift.workers) && existingShift.workers.some(w => String(w) === String(workerId));
              if (hasWorker && existingShift.id !== shiftData.id) {
                
                // Calculate day difference
                const existingDate = new Date(shiftDate);
                const newDate = new Date(shiftData.date);
                const dayDiff = Math.abs((newDate - existingDate) / (1000 * 60 * 60 * 24));
                
                // SAME DAY: Check for sufficient break time
                if (dayDiff === 0) {
                  // SAME DAY: No break time rules - removed as requested
                }
                
                // ADJACENT DAYS: Check for 10-hour rest period
                else if (dayDiff === 1) {
                  let gapMinutes;
                  let earlierEnd, laterStart;
                  let earlierParticipant, laterParticipant;
                  
                  if (newDate > existingDate) {
                    // New shift is the next day
                    earlierEnd = existingShift.endTime;
                    laterStart = shiftData.startTime;
                    earlierParticipant = participantCode;
                    laterParticipant = currentParticipantCode;
                  } else {
                    // Existing shift is the next day
                    earlierEnd = shiftData.endTime;
                    laterStart = existingShift.startTime;
                    earlierParticipant = currentParticipantCode;
                    laterParticipant = participantCode;
                  }
                  
                  // Calculate cross-day gap
                  gapMinutes = calculateCrossDayBreak(earlierEnd, laterStart);
                  
                    if (gapMinutes < ADJACENT_DAY_MIN_BREAK) {
                      const gapHours = (gapMinutes / 60).toFixed(1);
                      issues.push(`❌ ${workerName(workerId)}: Only ${gapHours}h rest between days (need 8h) - ${earlierParticipant} ends ${earlierEnd} → ${laterParticipant} starts ${laterStart}`);
                    }
                }
              }
            });
          });
        }
      });
    });
    
    return issues;
  };
  
  // Detect if this is a split shift scenario
  const isSplitShiftScenario = (existingShift, newShift, existingDate) => {
    // Split shift indicators:
    // 1. Shifts explicitly marked as split shifts
    // 2. Same support type with significant gap (true split shift)
    // 3. NOT separate shifts with different support types (like Milan's self-care + community)
    
    const isSameDay = existingDate === newShift.date;
    
    if (!isSameDay) return false;
    
    // Check for explicit split shift marker - this always takes precedence
    if (existingShift.isSplitShift || newShift.isSplitShift) {
      return true;
    }
    
    // If support types are different, these are separate shifts (like Milan's self-care + community)
    // NOT split shifts - they should use regular break rules
    if (existingShift.supportType !== newShift.supportType) {
      return false;
    }
    
    // Only if support types are the same, check for split shift patterns
    if (existingShift.supportType === newShift.supportType) {
      const gapHours = calculateGapHours(existingShift.endTime, newShift.startTime);
      
      // If there's a 2+ hour gap with same support type, it's likely a split shift
      if (gapHours >= 2 && gapHours <= 8) {
        return true;
      }
      
      // Check total hours for the day with same support type
      const existingDuration = parseFloat(existingShift.duration || 0);
      const newDuration = parseFloat(newShift.duration || 0);
      const totalHours = existingDuration + newDuration;
      
      // If total hours exceed 8 with same support type, it's likely split shifts
      if (totalHours > 8) {
        return true;
      }
    }
    
    return false;
  };
  
  // Calculate gap hours between two times
  const calculateGapHours = (endTime1, startTime2) => {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const end1Min = timeToMinutes(endTime1);
    const start2Min = timeToMinutes(startTime2);
    
    // Handle overnight
    if (end1Min > start2Min) {
      return (start2Min + 24 * 60 - end1Min) / 60;
    }
    
    return (start2Min - end1Min) / 60;
  };

  // Calculate break time in minutes (same day only)
  const calculateBreakMinutes = (endTime, startTime) => {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const endMin = timeToMinutes(endTime);
    const startMin = timeToMinutes(startTime);
    
    // Handle overnight shifts
    if (startMin < endMin) {
      // Next shift is "tomorrow" within the same calendar day
      return (startMin + 24 * 60) - endMin;
    }
    
    return startMin - endMin;
  };
  
  // Calculate break time between shifts on adjacent days
  const calculateCrossDayBreak = (earlierEnd, laterStart) => {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const earlierEndMin = timeToMinutes(earlierEnd);
    const laterStartMin = timeToMinutes(laterStart);
    
    // Add 24 hours to the later start (next day) and subtract earlier end
    const gapMinutes = (laterStartMin + 24 * 60) - earlierEndMin;
    
    return gapMinutes;
  };

  // Get smart start time based on previous shifts
  const getSmartStartTime = () => {
    if (editingShift) return editingShift.startTime;
    
    if (!date || !Array.isArray(existingShifts)) return '06:00';
    
    const dayShifts = existingShifts.filter(s => s.date === date).sort((a, b) => a.endTime.localeCompare(b.endTime));
    if (dayShifts.length > 0) {
      const lastShift = dayShifts[dayShifts.length - 1];
      return lastShift.endTime;
    }
    return '06:00'; // Default 6am start
  };

  // Get smart end time based on start time to create standard 8-hour shifts
  const getSmartEndTime = (startTime) => {
    if (editingShift) return editingShift.endTime;
    
    if (!startTime) return '14:00';
    
    // Standard shift patterns: 06:00-14:00, 14:00-22:00, 22:00-06:00
    if (startTime === '06:00') return '14:00';
    if (startTime === '14:00') return '22:00';
    if (startTime === '22:00') return '06:00';
    
    // For custom start times, default to 8 hours later
    const [hours, minutes] = startTime.split(':').map(Number);
    let endHours = hours + 8;
    if (endHours >= 24) endHours -= 24;
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Get default location for participant
  const getDefaultLocation = () => {
    if (editingShift) return editingShift.location;
    
    if (!participant?.code || !Array.isArray(locations)) return '';
    
    // Default locations based on participant
    if (participant.code === 'LIB001') { // Libby
      const glandore = locations.find(l => l.name === 'Glandore');
      return glandore ? glandore.id : '';
    }
    if (participant.code === 'JAM001') { // James
      const plympton = locations.find(l => l.name === 'Plympton Park');
      return plympton ? plympton.id : '';
    }
    // For Ace, Grace, Milan - default to first location
    return locations.length > 0 ? locations[0].id : '';
  };

  const [formData, setFormData] = useState({
    startTime: '06:00',
    endTime: '14:00',
    supportType: 'Self-Care',
    ratio: '1:1',
    workers: [],
    location: '',
    notes: '',
    shiftNumber: 'TEMP',
    isSplitShift: false
  });

  // Get available workers - use useMemo to avoid initialization issues
  const availableWorkers = useMemo(() => {
    const filtered = getAvailableWorkers(formData, workers);
    // Sort by preferred name (in brackets) or first name
    return filtered.sort((a, b) => {
      const aDisplay = getDisplayName(a.full_name);
      const bDisplay = getDisplayName(b.full_name);
      return aDisplay.localeCompare(bDisplay);
    });
  }, [getAvailableWorkers, formData, workers]); // Dependencies: getAvailableWorkers (which includes unavailableWorkers), formData, workers

  // Fetch workers for the specific shift date
  useEffect(() => {
    const fetchWorkersForDate = async () => {
      if (!date) return;
      
      try {
        const response = await axios.get(`${BACKEND_URL}/api/workers?check_date=${date}`);
        setWorkers(response.data);
      } catch (error) {
        console.error('Error fetching workers for date:', error);
        // Fallback to all workers
        setWorkers(allWorkers || []);
      }
    };

    fetchWorkersForDate();
  }, [date, allWorkers]);

  // Update form data when editingShift changes
  useEffect(() => {
    console.log('ShiftForm useEffect triggered:', { editingShift, participant: participant?.code, locations: locations?.length });
    
    // Set form ready immediately
      setIsFormReady(true);
    
    try {
      if (editingShift && typeof editingShift === 'object') {
        console.log('Initializing form for editing shift:', editingShift);
        setFormData({
          startTime: editingShift.startTime || '06:00',
          endTime: editingShift.endTime || '14:00',
          supportType: editingShift.supportType || 'Self-Care',
          ratio: editingShift.ratio || participant?.default_ratio || '1:1',
          workers: Array.isArray(editingShift.workers) ? editingShift.workers : [],
          location: editingShift.location || getDefaultLocation(),
          notes: editingShift.notes || '',
          shiftNumber: editingShift.shiftNumber || generateShiftNumber(),
          isSplitShift: editingShift.isSplitShift || false
        });
      } else {
        console.log('Initializing form for new shift');
        const smartStartTime = getSmartStartTime();
        setFormData({
          startTime: smartStartTime,
          endTime: getSmartEndTime(smartStartTime),
          supportType: 'Self-Care',
          ratio: participant?.default_ratio || '1:1',
          workers: [],
          location: getDefaultLocation(),
          notes: '',
          shiftNumber: generateShiftNumber(),
          isSplitShift: false
        });
      }
    } catch (error) {
      console.error('Error initializing form data:', error);
      // Fallback to basic form
      setFormData({
        startTime: '06:00',
        endTime: '14:00',
        supportType: 'Self-Care',
        ratio: '1:1',
        workers: [],
        location: '',
        notes: '',
        shiftNumber: generateShiftNumber()
      });
    }
  }, [editingShift, participant, locations]);

  const handleInputChange = (field, value) => {
    console.log(`Form field changed: ${field} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWorkerChange = (index, workerId) => {
    console.log(`Worker changed: index ${index} = ${workerId}`);
    const newWorkers = [...formData.workers];
    
    // Prevent selecting the same worker for multiple positions
    if (workerId && workerId !== '') {
      // Check if this worker is already selected in another position
      const existingIndex = newWorkers.findIndex((id, i) => i !== index && id === workerId);
      if (existingIndex !== -1) {
        // Clear the other position if the same worker is selected
        newWorkers[existingIndex] = '';
      }
    }
    
    newWorkers[index] = workerId;
    setFormData(prev => ({
      ...prev,
      workers: newWorkers
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Debug form data
      console.log('Form submitted with data:', formData);
      
      // Validate required fields
      if (!formData.startTime || !formData.endTime) {
        alert('Please select both start and end times');
        return;
      }
      
      if (!formData.supportType) {
        alert('Please select a support type');
        return;
      }
      
      if (!formData.ratio) {
        alert('Please select a support ratio');
        return;
      }
      
      // Workers are optional - shifts can be created without workers for planning purposes
      
      // Check shift duration (this handles overnight shifts correctly)
      const duration = calculateDuration(formData.startTime, formData.endTime);
      if (parseFloat(duration) > 12) {
        alert('Shift duration cannot exceed 12 hours');
        return;
      }
      
      if (parseFloat(duration) <= 0) {
        alert('Invalid shift times');
        return;
      }

      // Ensure all data is properly structured
      const shiftData = {
        id: editingShift?.id || Date.now().toString(),
        date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        supportType: formData.supportType,
        ratio: formData.ratio,
        workers: Array.isArray(formData.workers) ? formData.workers.filter(w => w) : [], // Remove empty worker slots
        location: formData.location || '', // Ensure location is saved
        notes: formData.notes || '',
        shiftNumber: formData.shiftNumber,
        duration: calculateDuration(formData.startTime, formData.endTime),
        isSplitShift: formData.isSplitShift || false // Include split shift flag
      };

      // Validate shift for conflicts and constraints
      const validation = validateShift(shiftData);
      
      // Show errors (blocking)
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          toast.error(error, { duration: 5000 });
        });
        return;
      }
      
      // Show warnings (allow override)
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast(warning, { duration: 4000 });
        });
        
        const proceed = window.confirm(
          `⚠️ ${validation.warnings.length} Warning(s) Found:\n\n${validation.warnings.join('\n')}\n\nDo you want to save anyway?`
        );
        if (!proceed) {
          return;
        }
      }

      console.log('Saving shift data:', shiftData); // Debug log
      
      await onSave(shiftData);
      
      // Show success message
      toast.success('Shift saved successfully!');
    } catch (error) {
      console.error('Error in form submission:', error);
      alert(`Error saving shift: ${error.message || 'Unknown error'}. Please check the console for details.`);
    }
  };

  // Calculate duration in hours
  const calculateDuration = (start, end) => {
    const startTime = start.split(':');
    const endTime = end.split(':');
    const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1] || 0);
    const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1] || 0);
    
    let duration = (endMinutes - startMinutes) / 60;
    if (duration <= 0) duration += 24; // Handle overnight
    return Math.max(0, duration); // Return NUMBER, not string - toFixed() was breaking validation
  };

  // Helper function for night shift logic
  function shouldShowSecondWorker() {
    // For James/Libby sharing with Ace/Grace for night shifts
    if (!formData?.startTime || !formData?.endTime || !participant?.code) return false;
    
    const isNightShift = formData.startTime >= '22:00' || formData.endTime <= '06:00';
    const isJamesOrLibby = participant.code === 'JAM001' || participant.code === 'LIB001';
    return isNightShift && isJamesOrLibby;
  }

  // Show loading state if form isn't ready
  if (!isFormReady) {
    return (
      <div className="shift-row" style={{
        background: 'var(--bg-tertiary)',
        borderLeft: '4px solid var(--accent-primary)',
        marginBottom: '0.5rem',
        borderRadius: '4px',
        padding: '0.6rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '98%',
        boxSizing: 'border-box'
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>Loading form...</span>
      </div>
    );
  }

  return (
    <div className="shift-row" style={{
      background: 'var(--bg-tertiary)',
      borderLeft: '4px solid var(--accent-primary)',
      marginBottom: '0.5rem',
      borderRadius: '4px',
      padding: '0.6rem',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      maxWidth: '98%',
      boxSizing: 'border-box'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%', maxWidth: '100%' }}>
        
        {/* Time - FIRST as requested */}
        <select 
          value={formData.startTime}
          onChange={(e) => handleInputChange('startTime', e.target.value)}
          style={{ 
            width: '90px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          {timeOptions.map(time => (
            <option key={time.value} value={time.value}>{time.label}</option>
          ))}
        </select>

        <span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>to</span>

        <select 
          value={formData.endTime}
          onChange={(e) => handleInputChange('endTime', e.target.value)}
          style={{ 
            width: '90px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          {timeOptions.map(time => (
            <option key={time.value} value={time.value}>{time.label}</option>
          ))}
        </select>

        {/* Support Type - SECOND as requested */}
        <select 
          value={formData.supportType}
          onChange={(e) => handleInputChange('supportType', e.target.value)}
          style={{ 
            minWidth: '120px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <option value="Self-Care">Self-Care</option>
          <option value="Community Participation">Community</option>
        </select>

        {/* Worker 1 */}
        <select 
          value={formData.workers[0] || ''}
          onChange={(e) => handleWorkerChange(0, e.target.value)}
          style={{ 
            width: '140px',
            maxWidth: '140px',
            fontSize: '0.9rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <option value="">SW1</option>
          {!unavailabilityCheckComplete && <option value="" disabled>Loading workers...</option>}
          {availableWorkers.filter(worker => worker.id !== formData.workers[1]).map(worker => (
            <option key={worker.id} value={worker.id}>
              {(() => {
                const hours = calculateWorkerHours(worker.id, weekType);
                const formatted = formatWorkerHours(hours);
                return `${getDisplayName(worker.full_name)} (${formatted.hours}h)`;
              })()}
            </option>
          ))}
        </select>

        {/* Worker 2 - show for 2:1 ratio or if James/Libby sharing with Ace/Grace */}
        {(formData.ratio === '2:1' || shouldShowSecondWorker()) && (
          <select 
            value={formData.workers[1] || ''}
            onChange={(e) => handleWorkerChange(1, e.target.value)}
            style={{ 
              width: '140px',
              maxWidth: '140px',
              fontSize: '0.9rem',
              padding: '0.5rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <option value="">SW2</option>
            {!unavailabilityCheckComplete && <option value="" disabled>Loading workers...</option>}
          {availableWorkers.filter(worker => worker.id !== formData.workers[0]).map(worker => (
              <option key={worker.id} value={worker.id}>
              {(() => {
                const hours = calculateWorkerHours(worker.id, weekType);
                const formatted = formatWorkerHours(hours);
                return `${getDisplayName(worker.full_name)} (${formatted.hours}h)`;
              })()}
              </option>
            ))}
          </select>
        )}

        {/* Location - Auto-assigned based on participant and week type */}
        {(() => {
          // Get the assigned location based on participant and week rules
          const getAssignedLocation = () => {
            const participantCode = participant?.code;
            
            // James (JAM001) - always at Plympton Park (his suburb)
            if (participantCode === 'JAM001') {
              return locations.find(loc => loc.name.toLowerCase().includes('plympton park')) || locations[0];
            }
            
            // Libby (LIB001) - always at Glandore (her suburb)
            if (participantCode === 'LIB001') {
              return locations.find(loc => loc.name.toLowerCase().includes('glandore')) || locations[0];
            }
            
            
            // Ace & Grace - Week-based logic
            if (participantCode === 'ACE001' || participantCode === 'GRA001') {
              if (weekType === 'weekA') {
                // Week A: Share with Libby at Glandore
                return locations.find(loc => loc.name.toLowerCase().includes('glandore')) || locations[0];
              } else {
                // Week B: Share with James at Plympton Park
                return locations.find(loc => loc.name.toLowerCase().includes('plympton park')) || locations[0];
              }
            }
            
            // Default fallback
            return locations[0];
          };
          
          const assignedLocation = getAssignedLocation();
          const locationName = assignedLocation?.name || 'Auto-assigned';
          
          // Auto-set the location in form data if not already set
          if (!formData.location && assignedLocation) {
            handleInputChange('location', assignedLocation.id);
          }
          
          return (
            <div style={{ 
              minWidth: '110px',
              maxWidth: '150px',
              fontSize: '0.9rem',
              padding: '0.5rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {locationName}
            </div>
          );
        })()}

        {/* Split Shift Checkbox - only show for shifts < 4 hours */}
        {calculateDuration(formData.startTime, formData.endTime) < 4 && (
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.3rem',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap'
          }}>
            <input 
              type="checkbox"
              checked={formData.isSplitShift || false}
              onChange={(e) => handleInputChange('isSplitShift', e.target.checked)}
              style={{ 
                width: '16px',
                height: '16px'
              }}
            />
            Split Shift
          </label>
        )}

        {/* Notes */}
        <input 
          type="text"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Notes"
          style={{ 
            minWidth: '120px',
            flex: 1,
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        />

        {/* Save and Cancel/Delete buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <button type="submit" className="btn btn-success" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
            Save
          </button>
          
          {editingShift ? (
            <button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                if (window.confirm('Are you sure you want to delete this shift?')) {
                  onDelete?.(editingShift);
                }
              }} 
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Delete
            </button>
          ) : (
            <button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem 1rem',
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ShiftForm;