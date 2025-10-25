/**
 * Worker Hours Calculation Utility
 * Fixes the double-counting issue when editing shifts with multiple workers
 */

/**
 * Calculate a worker's total weekly hours
 * @param {string} workerId - Worker ID
 * @param {string} referenceDateStr - Date in the week (YYYY-MM-DD)
 * @param {object} rosterData - Full roster data
 * @param {string} excludeShiftId - Shift ID to exclude from calculation (when editing)
 * @returns {number} Total hours for the week
 */
export const calculateWorkerWeeklyHours = (workerId, referenceDateStr, rosterData, excludeShiftId = null) => {
  // Compute the Monday-Sunday week containing the reference date
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const startOfWeek = new Date(ref);
  const dayOfWeek = ref.getDay(); // 0=Sun, 1=Mon
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(ref.getDate() - daysFromMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  let totalHours = 0;

  // Sum hours for this worker across all participants within the computed week
  Object.keys(rosterData || {}).forEach(participantCode => {
    const participantData = rosterData[participantCode];
    if (participantData) {
      Object.keys(participantData).forEach(shiftDate => {
        const shiftDateObj = new Date(shiftDate);
        if (shiftDateObj >= startOfWeek && shiftDateObj < endOfWeek) {
          const shifts = Array.isArray(participantData[shiftDate]) ? participantData[shiftDate] : [];
          shifts.forEach(shift => {
            // CRITICAL: Skip the shift we're editing to avoid double-counting
            if (excludeShiftId && shift.id === excludeShiftId) {
              return;
            }
            
            const hasWorker = Array.isArray(shift.workers) && 
                            shift.workers.some(w => String(w) === String(workerId));
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

/**
 * Calculate hours for a worker when editing a shift
 * Handles the complex logic of determining if hours should be added/removed
 * @param {string} workerId - Worker ID
 * @param {string} date - Shift date
 * @param {object} rosterData - Full roster data
 * @param {object} editingShift - The shift being edited (null for new shifts)
 * @param {array} newWorkers - New worker assignment for the shift
 * @param {number} newDuration - New shift duration in hours
 * @returns {object} { currentHours, projectedHours, delta }
 */
export const calculateEditedShiftHours = (
  workerId, 
  date, 
  rosterData, 
  editingShift, 
  newWorkers, 
  newDuration
) => {
  let currentHours, projectedHours, delta;
  
  if (editingShift) {
    // Editing an existing shift
    const wasInOriginalShift = editingShift.workers?.some(w => String(w) === String(workerId));
    const isInNewShift = newWorkers?.some(w => String(w) === String(workerId));
    
    if (wasInOriginalShift && isInNewShift) {
      // Worker STAYS in shift (may have different duration)
      // CRITICAL FIX: Always exclude the editing shift to prevent double-counting
      currentHours = calculateWorkerWeeklyHours(workerId, date, rosterData, editingShift.id);
      projectedHours = currentHours + newDuration;
      delta = newDuration - (parseFloat(editingShift.duration) || 0);
    } else if (!wasInOriginalShift && isInNewShift) {
      // Worker ADDED to shift
      currentHours = calculateWorkerWeeklyHours(workerId, date, rosterData, editingShift.id);
      projectedHours = currentHours + newDuration;
      delta = newDuration;
    } else if (wasInOriginalShift && !isInNewShift) {
      // Worker REMOVED from shift
      currentHours = calculateWorkerWeeklyHours(workerId, date, rosterData, editingShift.id);
      projectedHours = currentHours; // Hours decrease
      delta = -(parseFloat(editingShift.duration) || 0);
    } else {
      // Worker not involved in this shift
      currentHours = calculateWorkerWeeklyHours(workerId, date, rosterData);
      projectedHours = currentHours;
      delta = 0;
    }
  } else {
    // Creating a new shift
    currentHours = calculateWorkerWeeklyHours(workerId, date, rosterData);
    projectedHours = currentHours + newDuration;
    delta = newDuration;
  }
  
  return {
    currentHours: Math.round(currentHours * 10) / 10,
    projectedHours: Math.round(projectedHours * 10) / 10,
    delta: Math.round(delta * 10) / 10
  };
};

/**
 * Check if a worker would exceed their weekly limit with this shift
 * @param {object} worker - Worker object with max_hours property
 * @param {string} date - Shift date
 * @param {object} rosterData - Full roster data
 * @param {object} editingShift - The shift being edited (null for new shifts)
 * @param {array} newWorkers - New worker assignment for the shift
 * @param {number} newDuration - New shift duration in hours
 * @returns {object} { wouldExceed, currentHours, projectedHours, maxHours }
 */
export const checkWeeklyHourLimit = (
  worker,
  date,
  rosterData,
  editingShift,
  newWorkers,
  newDuration
) => {
  if (!worker.max_hours) {
    return { wouldExceed: false, currentHours: 0, projectedHours: 0, maxHours: null };
  }
  
  const { currentHours, projectedHours } = calculateEditedShiftHours(
    worker.id,
    date,
    rosterData,
    editingShift,
    newWorkers,
    newDuration
  );
  
  return {
    wouldExceed: projectedHours > worker.max_hours,
    currentHours,
    projectedHours,
    maxHours: worker.max_hours
  };
};

/**
 * Get color coding for hours display
 * @param {number} hours - Current hours
 * @param {number} maxHours - Maximum allowed hours
 * @returns {object} { color, status }
 */
export const getHoursColorCode = (hours, maxHours = null) => {
  if (!maxHours) {
    return { color: '#6c757d', status: 'no-limit' }; // Gray for no limit set
  }
  
  const percentage = (hours / maxHours) * 100;
  
  if (percentage >= 100) {
    return { color: '#dc3545', status: 'exceeded' }; // Red - exceeded
  } else if (percentage >= 90) {
    return { color: '#ffc107', status: 'warning' }; // Yellow - approaching limit
  } else if (percentage >= 75) {
    return { color: '#fd7e14', status: 'caution' }; // Orange - getting high
  } else {
    return { color: '#28a745', status: 'ok' }; // Green - within limit
  }
};

/**
 * Format hours for display with appropriate decimal places
 * @param {number} hours - Hours value
 * @returns {string} Formatted hours string
 */
export const formatHours = (hours) => {
  return Math.round(hours * 10) / 10; // Round to 1 decimal place
};
