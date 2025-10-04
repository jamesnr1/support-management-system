import React, { useState, useEffect, useMemo } from 'react';
import { Save, X } from 'lucide-react';
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
  existingShifts = [],
  weekType,
  rosterData = {}
}) => {
  // ===== ALL HOOKS MUST BE AT THE TOP - React Rules =====
  const [workers, setWorkers] = useState(allWorkers || []);
  const [isFormReady, setIsFormReady] = useState(false);
  const [unavailableWorkers, setUnavailableWorkers] = React.useState(new Set());

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
    
    if (hours >= 35) {
      color = "#dc3545"; // Red for over limit
    } else if (hours >= 30) {
      color = "#ffc107"; // Yellow for approaching limit
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
  
  // Fetch unavailability status for all workers
  React.useEffect(() => {
    const fetchUnavailability = async () => {
      if (!workers || workers.length === 0 || !date) return;
      
      try {
        const shiftDate = new Date(date);
        shiftDate.setHours(0, 0, 0, 0);
        
        const unavailableIds = new Set();
        
        // Check unavailability for each worker
        await Promise.all(workers.map(async (worker) => {
          try {
            const response = await axios.get(`${BACKEND_URL}/api/workers/${worker.id}/unavailability`);
            const periods = response.data || [];
            
            // Check if worker is unavailable on this date
            const isUnavailable = periods.some(period => {
              const fromDate = new Date(period.from_date);
              const toDate = new Date(period.to_date);
              fromDate.setHours(0, 0, 0, 0);
              toDate.setHours(23, 59, 59, 999);
              return shiftDate >= fromDate && shiftDate <= toDate;
            });
            
            if (isUnavailable) {
              unavailableIds.add(worker.id);
              console.log(`🔴 Worker ${worker.full_name} is unavailable on ${date}`);
            }
          } catch (error) {
            console.error(`Error checking unavailability for ${worker.full_name}:`, error);
          }
        }));
        
        setUnavailableWorkers(unavailableIds);
      } catch (error) {
        console.error('Error fetching unavailability:', error);
      }
    };
    
    fetchUnavailability();
  }, [workers, date]);
  
  // Filter available workers based on time and date
  const getAvailableWorkers = (currentFormData, workersList = []) => {
    if (!currentFormData?.startTime || !currentFormData?.endTime || !date) return workersList || [];
    
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
    
    return (workersList || []).filter(worker => {
      // Exclude workers who are unavailable on this date
      if (unavailableWorkers.has(worker.id)) {
        console.log(`⛔ Filtering out ${worker.full_name} - unavailable on ${date}`);
        return false;
      }
      
      // Check for conflicts with existing shifts on the same date
      const hasConflict = existingShifts.some(existingShift => {
        // Check if worker is assigned to this existing shift
        const isAssigned = Array.isArray(existingShift.workers) && existingShift.workers.some(w => String(w) === String(worker.id));
        if (!isAssigned) return false;
        
        // Check for time overlap
        return timeRangesOverlap(
          startTime, endTime,
          existingShift.startTime, existingShift.endTime
        );
      });
      
      // Exclude workers who have conflicts
      return !hasConflict;
    });
  };

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
          } else if (totalHours > worker.max_hours * 0.9) {
            warnings.push(`⚠️ ${workerName} approaching maximum hours: ${totalHours.toFixed(1)}/${worker.max_hours}`);
          }
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
    const minBreakTime = 30; // 30 minutes minimum break for regular shifts
    const splitShiftMinBreak = 60; // 60 minutes minimum break for split shifts
    
    // Only check break times if workers are selected
    if (!shiftData.workers || shiftData.workers.length === 0) {
      return issues;
    }
    
    shiftData.workers.forEach(workerId => {
      // Check for shifts on the same day or adjacent days
      Object.keys(rosterData || {}).forEach(participantCode => {
        const participantData = rosterData[participantCode];
        if (participantData) {
          Object.keys(participantData).forEach(shiftDate => {
            const shifts = Array.isArray(participantData[shiftDate]) ? participantData[shiftDate] : [];
            shifts.forEach(existingShift => {
              const hasWorker = Array.isArray(existingShift.workers) && existingShift.workers.some(w => String(w) === String(workerId));
              if (hasWorker) {
                const breakTime = calculateBreakTime(
                  existingShift.endTime, 
                  shiftData.startTime, 
                  shiftDate, 
                  shiftData.date
                );
                
                // Determine if this is a split shift scenario
                // Different support types (self-care vs community) = separate shifts, not split shifts
                const isSplitShift = isSplitShiftScenario(existingShift, shiftData, shiftDate);
                const requiredBreakTime = isSplitShift ? splitShiftMinBreak : minBreakTime;
                const breakType = isSplitShift ? 'split shift' : 'separate shift';
                
                if (breakTime < requiredBreakTime && breakTime >= 0) {
                  issues.push(`${getDisplayName((workers || []).find(w => w.id === workerId)?.full_name)} has only ${breakTime} minutes break between ${breakType}s (minimum: ${requiredBreakTime} minutes)`);
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

  // Calculate break time between shifts
  const calculateBreakTime = (endTime1, startTime2, date1, date2) => {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const end1Min = timeToMinutes(endTime1);
    const start2Min = timeToMinutes(startTime2);
    
    // Same day
    if (date1 === date2) {
      return start2Min - end1Min;
    }
    
    // Different days - assume sufficient break
    return 24 * 60; // 24 hours in minutes
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
    return getAvailableWorkers(formData, workers);
  }, [formData, workers, unavailableWorkers, date]); // CRITICAL: Must include unavailableWorkers!

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
        setFormData({
          startTime: getSmartStartTime(),
          endTime: '14:00',
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
      
      // Basic validation only
      if (formData.startTime >= formData.endTime) {
        alert('End time must be after start time');
        return;
      }
      
      // Check shift duration
      const duration = calculateDuration(formData.startTime, formData.endTime);
      if (parseFloat(duration) > 12) {
        alert('Shift duration cannot exceed 12 hours');
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
          toast.warning(warning, { duration: 4000 });
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
            minWidth: '120px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <option value="">SW1</option>
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
              minWidth: '120px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <option value="">SW2</option>
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

        {/* Location */}
        <select 
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          style={{ 
            minWidth: '130px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <option value="">Location</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>

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

        {/* Save and Cancel buttons */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
          <button type="submit" className="btn btn-success">
            <Save size={14} />
          </button>
          
          <button type="button" onClick={onCancel} className="btn-cancel-x">
            ×
          </button>
        </div>
      </form>
    </div>
  );

  // Helper function for night shift logic
  function shouldShowSecondWorker() {
    // For James/Libby sharing with Ace/Grace for night shifts
    if (!formData?.startTime || !formData?.endTime || !participant?.code) return false;
    
    const isNightShift = formData.startTime >= '22:00' || formData.endTime <= '06:00';
    const isJamesOrLibby = participant.code === 'JAM001' || participant.code === 'LIB001';
    return isNightShift && isJamesOrLibby;
  }
};

export default ShiftForm;