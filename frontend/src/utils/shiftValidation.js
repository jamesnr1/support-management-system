/**
 * SHIFT VALIDATION UTILITIES
 * Real-time validation for shift creation/editing
 * Adapted from system_changes.js
 */

import axios from 'axios';

const API_BASE = 'http://localhost:8001/api';

/**
 * Converts UTC timestamptz to Adelaide local date/time
 * @param {string} timestamptz - UTC timestamp
 * @returns {object} - Adelaide local date, time, and weekday
 */
export function extractAdelaideDateTime(timestamptz) {
    const date = new Date(timestamptz);
    
    const adelaideDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Australia/Adelaide',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
    
    const adelaideTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Australia/Adelaide',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
    
    // Get weekday (0=Sunday, 1=Monday, etc.) in Adelaide timezone
    const adelaideWeekday = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Australia/Adelaide',
        weekday: 'numeric'
    }).format(date));
    
    return {
        date: adelaideDate,        // YYYY-MM-DD format
        time: adelaideTime,        // HH:MM format
        weekday: adelaideWeekday % 7  // 0=Sunday, 1=Monday, etc.
    };
}

/**
 * Convert HH:MM time to minutes since midnight
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDuration(startTime, endTime) {
    const start = timeToMinutes(startTime);
    let end = timeToMinutes(endTime);
    
    // Handle overnight shifts
    if (end < start) {
        end += 24 * 60;
    }
    
    return (end - start) / 60;
}

/**
 * Check if shift would cause 16+ hour day for worker
 * @param {string} workerId - Worker ID
 * @param {string} date - YYYY-MM-DD
 * @param {number} additionalHours - Hours to add
 * @param {object} rosterData - Current roster data
 * @returns {object} - {valid: bool, totalHours: number, warning: string}
 */
export function check16HourDay(workerId, date, additionalHours, rosterData) {
    let totalHours = additionalHours;
    
    // Count existing hours for this worker on this date
    Object.keys(rosterData).forEach(participantCode => {
        const participantData = rosterData[participantCode];
        if (participantData[date]) {
            participantData[date].forEach(shift => {
                if (shift.workers && shift.workers.includes(workerId)) {
                    totalHours += parseFloat(shift.duration || 0);
                }
            });
        }
    });
    
    if (totalHours >= 12) {
        return {
            valid: false,
            totalHours,
            warning: `❌ Would create 12+ hour day (${totalHours.toFixed(1)}h total)`
        };
    }
    
    return { valid: true, totalHours, warning: null };
}

/**
 * Check for double bookings (same worker, same time, different participants)
 * @param {string} workerId - Worker ID
 * @param {string} date - YYYY-MM-DD
 * @param {string} startTime - HH:MM
 * @param {string} endTime - HH:MM
 * @param {object} rosterData - Current roster data
 * @param {string} excludeShiftId - Shift ID to exclude (for updates)
 * @param {string} currentParticipant - Current participant being scheduled for
 * @returns {object} - {hasConflict: bool, conflictDetails: string}
 */
export function checkDoubleBooking(workerId, date, startTime, endTime, rosterData, excludeShiftId = null, currentParticipant = null) {
    const newStart = timeToMinutes(startTime);
    let newEnd = timeToMinutes(endTime);
    
    if (newEnd < newStart) {
        newEnd += 24 * 60;
    }
    
    for (const participantCode in rosterData) {
        const participantData = rosterData[participantCode];
        
        if (participantData[date]) {
            for (const shift of participantData[date]) {
                // Skip if this is the shift being edited
                if (shift.id === excludeShiftId) continue;
                
                // Check if worker is assigned
                if (!shift.workers || !shift.workers.includes(workerId)) continue;
                
                // Check for time overlap
                const existingStart = timeToMinutes(shift.startTime);
                let existingEnd = timeToMinutes(shift.endTime);
                
                if (existingEnd < existingStart) {
                    existingEnd += 24 * 60;
                }
                
                // Check overlap
                if (newStart < existingEnd && newEnd > existingStart) {
                    // If it's the same participant, this might be a valid split shift
                    if (participantCode === currentParticipant) {
                        // Same participant - check if this is back-to-back (valid split shift)
                        if (newStart === existingEnd || newEnd === existingStart) {
                            // Back-to-back shifts for same participant - this is valid for different funding categories
                            return { hasConflict: false, conflictDetails: null };
                        } else {
                            // Overlapping times for same participant - this is invalid
                            return {
                                hasConflict: true,
                                conflictDetails: `Invalid split shift: overlapping times with existing shift at ${shift.startTime}-${shift.endTime}`
                            };
                        }
                    } else {
                        // Different participants - this is a real conflict
                        return {
                            hasConflict: true,
                            conflictDetails: `Already assigned to ${participantCode} at ${shift.startTime}-${shift.endTime}`
                        };
                    }
                }
            }
        }
    }
    
    return { hasConflict: false, conflictDetails: null };
}

/**
 * Check if worker has adequate break between shifts
 * @param {string} workerId - Worker ID
 * @param {string} date - YYYY-MM-DD
 * @param {string} startTime - HH:MM
 * @param {string} endTime - HH:MM
 * @param {object} rosterData - Current roster data
 * @returns {object} - {hasIssue: bool, warning: string}
 */
export function checkBreakTime(workerId, date, startTime, endTime, rosterData) {
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    
    // Check all shifts for this worker on this date and adjacent dates
    const allShifts = [];
    
    Object.keys(rosterData).forEach(participantCode => {
        const participantData = rosterData[participantCode];
        
        // Check current date and adjacent dates
        [date].forEach(checkDate => {
            if (participantData[checkDate]) {
                participantData[checkDate].forEach(shift => {
                    if (shift.workers && shift.workers.includes(workerId)) {
                        allShifts.push({
                            start: timeToMinutes(shift.startTime),
                            end: timeToMinutes(shift.endTime),
                            duration: parseFloat(shift.duration || 0)
                        });
                    }
                });
            }
        });
    });
    
    // Check if new shift is back-to-back with another
    for (const shift of allShifts) {
        let shiftEnd = shift.end;
        if (shiftEnd < shift.start) shiftEnd += 24 * 60;
        
        // Check if back-to-back
        if (Math.abs(shiftEnd - newStart) < 10) { // Within 10 minutes
            const totalHours = shift.duration + calculateShiftDuration(startTime, endTime);
            if (totalHours >= 16) {
                return {
                    hasIssue: true,
                    warning: `⚠️ Back-to-back shifts total ${totalHours.toFixed(1)}h with no break`
                };
            }
        }
    }
    
    return { hasIssue: false, warning: null };
}

/**
 * Comprehensive validation before saving shift
 * @param {object} shiftData - Shift data
 * @param {object} rosterData - Current roster data
 * @param {array} workers - All workers
 * @returns {object} - {valid: bool, errors: [str], warnings: [str]}
 */
export async function validateShift(shiftData, rosterData, workers) {
    const errors = [];
    const warnings = [];
    
    const { participant, date, startTime, endTime, workers: shiftWorkers, ratio, id } = shiftData;
    
    // 1. Check ratio compliance
    const requiredWorkers = parseInt((ratio || '1:1').split(':')[0]);
    const actualWorkers = (shiftWorkers || []).length;
    
    if (actualWorkers < requiredWorkers) {
        errors.push(`❌ Needs ${requiredWorkers} workers, has ${actualWorkers} (${ratio})`);
    }
    
    // 2. Check each worker
    for (const workerId of shiftWorkers || []) {
        const worker = workers.find(w => w.id === workerId);
        if (!worker) continue;
        
        const workerName = worker.full_name.split(' ')[0]; // First name
        
        // Check double booking
        const doubleBooking = checkDoubleBooking(workerId, date, startTime, endTime, rosterData, id, participant);
        if (doubleBooking.hasConflict) {
            errors.push(`❌ ${workerName} ${doubleBooking.conflictDetails}`);
        }
        
        // Check 16+ hour day
        const shiftDuration = calculateShiftDuration(startTime, endTime);
        const hourCheck = check16HourDay(workerId, date, shiftDuration, rosterData);
        if (!hourCheck.valid) {
            errors.push(`${hourCheck.warning} - ${workerName}`);
        } else if (hourCheck.warning) {
            warnings.push(`${hourCheck.warning} - ${workerName}`);
        }
        
        // Check break time
        const breakCheck = checkBreakTime(workerId, date, startTime, endTime, rosterData);
        if (breakCheck.hasIssue) {
            warnings.push(`${breakCheck.warning} - ${workerName}`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Call backend validation API
 * @param {string} weekType - Week type (weekA, weekB, etc.)
 * @param {object} rosterData - Roster data to validate
 * @returns {Promise<object>} - {valid: bool, errors: [str], warnings: [str]}
 */
export async function validateRosterAPI(weekType, rosterData = null) {
    try {
        const response = await axios.post(`${API_BASE}/roster/${weekType}/validate`, rosterData);
        return response.data;
    } catch (error) {
        console.error('Validation API error:', error);
        return {
            valid: false,
            errors: ['Failed to validate with server'],
            warnings: []
        };
    }
}


















