// =============================================================================
// DATABASE CHANGES - Run this SQL in Supabase SQL Editor
// =============================================================================

/*
-- Fix max_hours constraint to realistic values (0-60 instead of 0-168)
ALTER TABLE support_workers 
DROP CONSTRAINT IF EXISTS support_workers_max_hours_check;

ALTER TABLE support_workers 
ADD CONSTRAINT support_workers_max_hours_check 
CHECK (max_hours BETWEEN 0 AND 60);
*/

// =============================================================================
// JAVASCRIPT LOGIC CODE ADDITIONS
// =============================================================================

/**
 * Converts UTC timestamptz to Adelaide local date/time for availability checking
 * @param {string} timestamptz - UTC timestamp from Supabase
 * @returns {object} - Adelaide local date, time, and weekday
 */
function extractAdelaideDateTime(timestamptz) {
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
    const adelaideWeekday = new Intl.DateTimeFormat('en', {
        timeZone: 'Australia/Adelaide',
        weekday: 'numeric'
    }).format(date);
    
    return {
        date: adelaideDate,        // YYYY-MM-DD format
        time: adelaideTime,        // HH:MM format
        weekday: adelaideWeekday % 7  // 0=Sunday, 1=Monday, etc.
    };
}

/**
 * Check if adding hours to a worker would exceed their maximum weekly hours
 * @param {number} workerId - Support worker ID
 * @param {number} additionalHours - Hours to be added
 * @returns {Promise<boolean>} - True if within limits, false if would exceed
 */
async function checkMaxHours(workerId, additionalHours) {
    try {
        // Get worker's maximum hours limit
        const { data: worker, error: workerError } = await supabase
            .from('support_workers')
            .select('max_hours, full_name')
            .eq('id', workerId)
            .single();
        
        if (workerError) {
            console.error('Error fetching worker max hours:', workerError);
            return false;
        }
        
        // If no max_hours set, allow unlimited
        if (!worker.max_hours) {
            return true;
        }
        
        // Calculate current weekly hours for this worker
        const currentHours = await calculateCurrentWeeklyHours(workerId);
        const totalHours = currentHours + additionalHours;
        
        if (totalHours > worker.max_hours) {
            showNotification(
                `${worker.full_name} would exceed maximum hours: ${totalHours.toFixed(1)}/${worker.max_hours}`, 
                'error'
            );
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error in checkMaxHours:', error);
        return false;
    }
}

/**
 * Calculate current weekly hours for a worker
 * @param {number} workerId - Support worker ID  
 * @returns {Promise<number>} - Total hours for current week
 */
async function calculateCurrentWeeklyHours(workerId) {
    try {
        // Get start and end of current week (Monday to Sunday)
        const now = new Date();
        const startOfWeek = new Date(now);
        const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday=0
        startOfWeek.setDate(now.getDate() - daysFromMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        
        // Query shifts for this worker in current week
        const { data: shifts, error } = await supabase
            .from('shifts')
            .select('start_time, end_time')
            .eq('status', 'Scheduled') // Only count scheduled shifts
            .gte('start_time', startOfWeek.toISOString())
            .lt('start_time', endOfWeek.toISOString())
            .in('id', 
                supabase
                    .from('shift_workers')
                    .select('shift_id')
                    .eq('worker_id', workerId)
                    .eq('alloc_status', 'Assigned')
            );
        
        if (error) {
            console.error('Error calculating weekly hours:', error);
            return 0;
        }
        
        // Calculate total hours
        let totalHours = 0;
        shifts.forEach(shift => {
            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            const hours = (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
            totalHours += hours;
        });
        
        return totalHours;
        
    } catch (error) {
        console.error('Error in calculateCurrentWeeklyHours:', error);
        return 0;
    }
}

// =============================================================================
// UPDATED FUNCTIONS - Replace existing versions with these
// =============================================================================

/**
 * Updated getAvailableWorkers to handle timezone conversion
 * @param {string} shiftStartTimestamptz - UTC timestamp for shift start
 * @param {string} shiftEndTimestamptz - UTC timestamp for shift end
 * @returns {Promise<Array>} - Available workers
 */
async function getAvailableWorkers(shiftStartTimestamptz, shiftEndTimestamptz) {
    try {
        // Convert UTC timestamps to Adelaide local time
        const startInfo = extractAdelaideDateTime(shiftStartTimestamptz);
        const endInfo = extractAdelaideDateTime(shiftEndTimestamptz);
        
        const shiftDate = startInfo.date;
        const weekday = startInfo.weekday;
        const startTime = startInfo.time;
        const endTime = endInfo.time;
        
        // Convert times to minutes for comparison
        const startMinutes = timeToMinutes(startTime);
        let endMinutes = timeToMinutes(endTime);
        
        // Handle overnight shifts
        const isOvernight = endMinutes < startMinutes;
        if (isOvernight) {
            endMinutes += 24 * 60;
        }
        
        // Get all active workers
        const { data: workers, error: workersError } = await supabase
            .from('support_workers')
            .select('id, full_name, max_hours')
            .eq('status', 'Active');
        
        if (workersError) {
            showNotification('Error fetching workers', 'error');
            return [];
        }
        
        if (!workers || workers.length === 0) {
            showNotification('No active workers found', 'warning');
            return [];
        }
        
        // Check unavailability periods
        const { data: unavailabilities, error: unavailError } = await supabase
            .from('unavailability_periods')
            .select('worker_id')
            .lte('from_date', shiftDate)
            .gte('to_date', shiftDate);
        
        if (unavailError) {
            console.error('Error checking unavailability:', unavailError);
        }
        
        const unavailableWorkerIds = new Set(
            unavailabilities?.map(u => u.worker_id) || []
        );
        
        // Filter out unavailable workers
        let availableWorkers = workers.filter(
            worker => !unavailableWorkerIds.has(worker.id)
        );
        
        // Check availability rules
        const weekdaysToCheck = isOvernight ? [weekday, (weekday + 1) % 7] : [weekday];
        
        const { data: availRules, error: rulesError } = await supabase
            .from('availability_rule')
            .select('*')
            .in('weekday', weekdaysToCheck);
        
        if (rulesError) {
            console.error('Error fetching availability rules:', rulesError);
            showNotification('Error checking worker availability', 'error');
            return [];
        }
        
        // Filter workers based on availability rules
        availableWorkers = availableWorkers.filter(worker => {
            const workerRules = availRules.filter(rule => rule.worker_id === worker.id);
            
            if (!workerRules.length) {
                return false; // No availability rules = not available
            }
            
            return workerRules.some(rule => {
                // Full day availability
                if (rule.is_full_day) {
                    return true;
                }
                
                // Must have specific times
                if (!rule.from_time || !rule.to_time) {
                    return false;
                }
                
                const ruleStart = timeToMinutes(rule.from_time);
                let ruleEnd = timeToMinutes(rule.to_time);
                
                if (rule.wraps_midnight) {
                    ruleEnd += 24 * 60;
                }
                
                // Check if shift fits within availability
                if (isOvernight && rule.weekday === (weekday + 1) % 7) {
                    // Check next day portion of overnight shift
                    return (endMinutes - 24 * 60) <= ruleEnd;
                } else if (rule.weekday === weekday) {
                    // Check same day portion
                    return startMinutes >= ruleStart && 
                           (!isOvernight || endMinutes <= ruleEnd);
                }
                
                return false;
            });
        });
        
        return availableWorkers;
        
    } catch (error) {
        console.error('Error in getAvailableWorkers:', error);
        showNotification('Error finding available workers', 'error');
        return [];
    }
}

/**
 * Updated validateFairWork to include max hours checking
 * @param {number} workerId - Support worker ID
 * @param {string} shiftStartTimestamptz - UTC timestamp for shift start
 * @param {string} shiftEndTimestamptz - UTC timestamp for shift end
 * @returns {Promise<object>} - Validation result
 */
async function validateFairWork(workerId, shiftStartTimestamptz, shiftEndTimestamptz) {
    const result = {
        isValid: true,
        warnings: [],
        canOverride: false
    };
    
    try {
        // Calculate shift duration
        const start = new Date(shiftStartTimestamptz);
        const end = new Date(shiftEndTimestamptz);
        const duration = (end - start) / (1000 * 60 * 60); // Hours
        
        // Check for very long shifts
        if (duration > 10) {
            result.warnings.push(`Shift exceeds 10 hours (${duration.toFixed(1)} hours)`);
            result.canOverride = true;
        }
        
        // Check max hours constraint
        const maxHoursValid = await checkMaxHours(workerId, duration);
        if (!maxHoursValid) {
            result.isValid = false;
            result.warnings.push('Would exceed worker maximum weekly hours');
            result.canOverride = true;
        }
        
        // Check for conflicts with existing shifts
        const conflictCheck = await checkWorkerConflicts(workerId, shiftStartTimestamptz, shiftEndTimestamptz);
        if (conflictCheck.hasConflict) {
            result.isValid = false;
            result.warnings.push(conflictCheck.conflictDetails);
            if (!conflictCheck.conflictDetails.toLowerCase().includes('overlap')) {
                result.canOverride = true;
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('Error in validateFairWork:', error);
        result.isValid = false;
        result.warnings.push('Error validating shift');
        return result;
    }
}

/**
 * Updated checkWorkerConflicts to handle timestamptz
 * @param {number} workerId - Support worker ID
 * @param {string} shiftStartTimestamptz - UTC timestamp for shift start  
 * @param {string} shiftEndTimestamptz - UTC timestamp for shift end
 * @param {number} excludeShiftId - Shift ID to exclude (for updates)
 * @returns {Promise<object>} - Conflict check result
 */
async function checkWorkerConflicts(workerId, shiftStartTimestamptz, shiftEndTimestamptz, excludeShiftId = null) {
    try {
        const newStart = new Date(shiftStartTimestamptz);
        const newEnd = new Date(shiftEndTimestamptz);
        
        // Query for overlapping shifts
        let query = supabase
            .from('shifts')
            .select('id, start_time, end_time')
            .in('status', ['Scheduled', 'In Progress'])
            .lt('start_time', shiftEndTimestamptz)
            .gt('end_time', shiftStartTimestamptz)
            .in('id', 
                supabase
                    .from('shift_workers')
                    .select('shift_id')
                    .eq('worker_id', workerId)
                    .eq('alloc_status', 'Assigned')
            );
        
        if (excludeShiftId) {
            query = query.neq('id', excludeShiftId);
        }
        
        const { data: conflicts, error } = await query;
        
        if (error) {
            console.error('Error checking conflicts:', error);
            return {
                hasConflict: true,
                conflictDetails: 'Error checking for conflicts'
            };
        }
        
        if (conflicts && conflicts.length > 0) {
            const conflict = conflicts[0];
            const conflictStart = extractAdelaideDateTime(conflict.start_time);
            const conflictEnd = extractAdelaideDateTime(conflict.end_time);
            
            return {
                hasConflict: true,
                conflictDetails: `Overlaps with existing shift: ${conflictStart.date} ${conflictStart.time}-${conflictEnd.time}`
            };
        }
        
        return {
            hasConflict: false,
            conflictDetails: null
        };
        
    } catch (error) {
        console.error('Error in checkWorkerConflicts:', error);
        return {
            hasConflict: true,
            conflictDetails: 'Error checking for conflicts'
        };
    }
}

// =============================================================================
// INTEGRATION NOTES
// =============================================================================

/*
INTEGRATION CHECKLIST:

1. Run the SQL command at the top to fix max_hours constraint

2. Add the new functions to your codebase:
   - extractAdelaideDateTime()
   - checkMaxHours()
   - calculateCurrentWeeklyHours()

3. Replace existing functions with updated versions:
   - getAvailableWorkers()
   - validateFairWork()
   - checkWorkerConflicts()

4. Update any shift creation code to:
   - Use timestamptz values from your date/time dropdowns
   - Call validateFairWork() before creating shifts
   - Handle the validation results appropriately

5. Test with:
   - Regular shifts within business hours
   - Overnight shifts
   - Workers with max_hours limits
   - Workers without max_hours limits
   - Shifts that would exceed max hours

DROPDOWN INTEGRATION:
- Your dropdowns should create proper UTC timestamptz values
- Pass these directly to the updated functions
- No additional input validation needed
*/