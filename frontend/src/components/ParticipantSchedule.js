import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ShiftForm from './ShiftForm';

// This function is now outside the component, so it won't be recreated on every render.
const getWeekDates = (weekType, customStartDate = null, customEndDate = null) => {
  const dates = [];
  let startDate;

  // If a custom start date is provided (from planner dropdown), use that
  if (customStartDate) {
    startDate = new Date(customStartDate);
  } else {
    // Fallback to dynamic calculation based on current date
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1; // Convert to Monday=0
    startDate = new Date(today);
    startDate.setDate(today.getDate() - daysSinceMonday);
    startDate.setHours(0, 0, 0, 0);
  }
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Use local date parts to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    dates.push({
      date: dateString,
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
      dayShort: date.toLocaleDateString('en-US', { weekday: 'short' })
    });
  }
  return dates;
};

const ParticipantSchedule = React.memo(({ 
  participant, 
  weekType,
  weekStartDate,  // Optional: Custom start date for planner weeks
  weekEndDate,    // Optional: Custom end date for planner weeks
  rosterData,  // This participant's shifts only
  fullRosterData,  // ALL participants' shifts (for ShiftForm worker hours calculation)
  workers, 
  locations, 
  editMode, 
  onRosterUpdate 
}) => {

  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedShift, setDraggedShift] = useState(null);
  const queryClient = useQueryClient();

  // Clear editing state when edit mode is turned off or participant/week changes
  useEffect(() => {
    if (!editMode) {
      setShowShiftForm(false);
      setEditingShift(null);
      setSelectedDate(null);
    }
  }, [editMode, participant?.id, weekType]);

  // Get participant's shifts for this week
  // rosterData is now the correctly sliced data for this specific participant
  const participantShifts = rosterData || {};

  // useMemo prevents this expensive calculation from running on every single re-render.
  const weekDates = useMemo(() => getWeekDates(weekType, weekStartDate, weekEndDate), [weekType, weekStartDate, weekEndDate]);

  const handleDragStart = (e, shift, day) => {
    if (!editMode) return;
    setIsDragging(true);
    setDraggedShift(shift);
    // You can optionally set some data to be transferred
    e.dataTransfer.setData('text/plain', JSON.stringify({ shiftId: shift.id, originalDay: day }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedShift(null);
  };

  const handleAddShift = (date) => {
    setSelectedDate(date);
    setEditingShift(null);
    setShowShiftForm(true);
  };

  const handleEditShift = (shift, date) => {
    // Allow editing even if locked; non-location fields will be preserved on save
    console.log('handleEditShift called with:', { shift, date });
    console.log('Shift object details:', { id: shift.id, startTime: shift.startTime, endTime: shift.endTime });
    
    setSelectedDate(date);
    setEditingShift(shift);
    setShowShiftForm(true);
    
    console.log('Edit mode state set:', { selectedDate: date, editingShift: shift, showShiftForm: true });
    
    // Force a re-render to see the state change
    setTimeout(() => {
      console.log('State after timeout:', { showShiftForm, selectedDate, editingShift });
    }, 100);
  };

  const handleShiftClick = (shift, day) => {
    // Define what happens when a shift is clicked
    // For example, open the edit form
    if (editMode) {
      handleEditShift(shift, day.date);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  };

  const getWorkerDisplayName = (workerId) => {
    // Handle array of worker IDs (2:1 shifts)
    if (Array.isArray(workerId)) {
      if (workerId.length === 0) return 'Unassigned';
      const workerNames = workerId
        .map(id => {
          // Match by converting both to strings for comparison
          const idStr = String(id);
          const worker = workers.find(w => String(w.id) === idStr);
          return worker ? getDisplayName(worker.full_name) : null;
        })
        .filter(Boolean);
      return workerNames.length > 0 ? workerNames.join(' & ') : 'Unassigned';
    }
    // Handle single worker ID
    const idStr = String(workerId);
    const worker = workers.find(w => String(w.id) === idStr);
    return worker ? getDisplayName(worker.full_name) : 'Unassigned';
  };

  const getLocationName = (locationId) => {
    if (!locationId) return '';
    const location = locations.find(l => String(l.id) === String(locationId));
    return location ? location.name : '';
  };

  const getShiftCardClass = (shift) => {
    // Example logic to style cards based on shift properties
    if (shift.locked) return 'locked';
    if (!shift.worker_id) return 'unassigned';
    return '';
  };

  const isSelected = (shift) => {
    return editingShift && shift.id === editingShift.id;
  };

  const handleShiftSave = async (shiftData) => {
    try {
      console.log('ADD SHIFT - Starting function');
      console.log('Shift data:', shiftData);
      
      // Validate shift data
      if (!shiftData || !shiftData.date) {
        throw new Error('Invalid shift data: missing date');
      }
      
      if (!participant || !participant.code) {
        throw new Error('Invalid participant data');
      }
      
      // CRITICAL FIX: Clone fullRosterData (ALL participants) not just this participant's data
      const updatedRosterData = JSON.parse(JSON.stringify(fullRosterData || {}));
      
      // Initialize participant if doesn't exist
      if (!updatedRosterData[participant.code]) {
        updatedRosterData[participant.code] = {};
      }
      
      // Initialize date array if doesn't exist (week-specific data already passed in)
      if (!updatedRosterData[participant.code][shiftData.date]) {
        updatedRosterData[participant.code][shiftData.date] = [];
      }

      if (editingShift) {
        // Update existing shift
        const shifts = updatedRosterData[participant.code][shiftData.date];
        const shiftIndex = shifts.findIndex(s => s.id === editingShift.id);
        if (shiftIndex >= 0) {
          const originalShift = shifts[shiftIndex];
          let nextShift = { ...shiftData, id: editingShift.id, locked: editingShift.locked ?? false };
          // If locked, preserve worker/time/type/ratio; allow location and notes to change
          if (editingShift.locked) {
            nextShift.startTime = originalShift.startTime;
            nextShift.endTime = originalShift.endTime;
            nextShift.workers = originalShift.workers;
            nextShift.supportType = originalShift.supportType;
            nextShift.ratio = originalShift.ratio;
          }
          shifts[shiftIndex] = nextShift;
        } else {
          throw new Error('Shift not found for editing');
        }
      } else {
        // Add new shift with unique ID
        const newShift = {
          ...shiftData,
          id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        updatedRosterData[participant.code][shiftData.date].push(newShift);
      }

      console.log('Calling onRosterUpdate with:', updatedRosterData);
      console.log('Updated roster keys:', Object.keys(updatedRosterData));
      console.log('Participant code:', participant.code);
      console.log('Date shifts:', updatedRosterData[participant.code]?.[shiftData.date]);
      
      // Update roster
      await onRosterUpdate(updatedRosterData);
      
      // Close form
      setShowShiftForm(false);
      setSelectedDate(null);
      setEditingShift(null);
      
      // Invalidate queries to trigger re-fetch (no page reload needed)
      queryClient.invalidateQueries(['rosterData']);
    } catch (error) {
      console.error('Error in handleShiftSave:', error);
      alert(`Error saving shift: ${error.message || 'Unknown error'}. Please check the console for details.`);
    }
  };

  const handleShiftCancel = () => {
    setShowShiftForm(false);
    setSelectedDate(null);
    setEditingShift(null);
  };

  const handleShiftDelete = async (shift) => {
    try {
      console.log('DELETE SHIFT - Starting function');
      console.log('Shift to delete:', shift);
      console.log('Selected date:', selectedDate);
      
      // Use selectedDate if shift.date is missing
      const shiftDate = shift.date || selectedDate;
      
      if (!shift || !shift.id) {
        throw new Error('Invalid shift data - missing shift ID');
      }
      
      if (!shiftDate) {
        throw new Error('Invalid shift data - missing shift date');
      }
      
      // CRITICAL FIX: Clone fullRosterData (ALL participants) not just this participant's data
      const updatedRosterData = JSON.parse(JSON.stringify(fullRosterData || {}));
      
      if (!updatedRosterData[participant.code] || !updatedRosterData[participant.code][shiftDate]) {
        throw new Error(`Shift not found in roster data for ${participant.code} on ${shiftDate}`);
      }
      
      // Remove the shift
      updatedRosterData[participant.code][shiftDate] = updatedRosterData[participant.code][shiftDate].filter(s => s.id !== shift.id);
      
      // Save to backend
      await onRosterUpdate(updatedRosterData);
      
      // Close the form
      setShowShiftForm(false);
      setSelectedDate(null);
      setEditingShift(null);
      
      // Invalidate queries to trigger re-fetch
      queryClient.invalidateQueries(['rosterData']);
      
      console.log('✅ Shift deleted successfully');
    } catch (error) {
      console.error('Error in handleShiftDelete:', error);
      alert(`Error deleting shift: ${error.message || 'Unknown error'}`);
    }
  };

  // Toggle shift lock status
  const handleToggleLock = async (shiftIndex, shiftDate) => {
    try {
      // Create a copy with ONLY this participant's data
      const participantData = JSON.parse(JSON.stringify(rosterData || {}));
      
      // Access the shift through the participant's data structure
      if (!participantData[shiftDate] || !participantData[shiftDate][shiftIndex]) {
        throw new Error('Shift not found');
      }
      
      const shift = participantData[shiftDate][shiftIndex];
      
      // Toggle the locked state
      shift.locked = !shift.locked;
      
      console.log(`Shift ${shift.locked ? 'locked 🔒' : 'unlocked 🔓'}:`, shift.shiftNumber);
      
      // Wrap in participant code for onRosterUpdate
      const updatedParticipantData = {
        [participant.code]: participantData
      };
      
      await onRosterUpdate(updatedParticipantData);
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  // BUILT DELETE FUNCTION
  const handleDeleteShift = async (shiftIndex, shiftDate) => {
    console.log('DELETE FUNCTION - Starting delete for index:', shiftIndex, 'date:', shiftDate);
    
    // Check if shift is locked
    const shift = rosterData[shiftDate]?.[shiftIndex];
    if (shift?.locked) {
      alert('⚠️ This shift is locked. Please unlock it before deleting.');
      return;
    }
    
    if (!window.confirm('Delete this shift?')) {
      return;
    }
    
    try {
      // Get current participant's roster data (rosterData is already participant-specific)
      const participantData = JSON.parse(JSON.stringify(rosterData || {}));
      
      // Check if date exists
      if (!participantData[shiftDate]) {
        console.log('No shifts found for deletion');
        return;
      }
      
      // Remove the shift at the specified index
      const shifts = participantData[shiftDate];
      console.log('Before delete - shifts:', shifts);
      
      // Remove shift by index
      shifts.splice(shiftIndex, 1);
      console.log('After delete - shifts:', shifts);
      
      // If no shifts remain for this date, remove the date
      if (shifts.length === 0) {
        delete participantData[shiftDate];
        console.log('Removed empty date entry');
      } else {
        participantData[shiftDate] = shifts;
      }
      
      // Wrap in participant code for onRosterUpdate (which expects {participantCode: data})
      const updatedParticipantData = {
        [participant.code]: participantData
      };
      
      // Update the roster
      console.log('Updating roster with:', updatedParticipantData);
      await onRosterUpdate(updatedParticipantData);
      
      // Invalidate queries to trigger re-fetch (no page reload needed)
      queryClient.invalidateQueries(['rosterData']);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed: ' + error.message);
    }
  };

  const getDisplayName = (fullName) => {
    if (!fullName) return '';
    const match = fullName.match(/\(([^)]+)\)/);
    if (match && match[1]) return match[1];
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || fullName;
  };

  const getWorkerNames = (workerIds) => {
    return (workerIds || []).map(id => {
      const match = (workers || []).find(w => String(w.id) === String(id));
      return match ? getDisplayName(match.full_name) : `Worker ${id}`;
    }).join(', ');
  };


  return (
    <div>
        <div className="participant-card">
          <div className="participant-header">
            <div className="participant-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between' }}>
            <div 
              className="participant-name" 
              style={{ 
                marginBottom: 0,
                flex: '1 1 auto', // Allow name to grow and shrink
                minWidth: 0, // Prevent overflow
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={participant.full_name}
            >
              {participant.full_name}
              {/* Support ratios next to name - dynamic based on week type */}
              <span style={{ color: 'var(--text-primary)', fontWeight: 'normal' }}>
                {participant.code === 'LIB001' && (weekType === 'weekA' ? ' (2:1)' : ' (2:1)')}
                {participant.code === 'JAM001' && (weekType === 'weekA' ? ' (2:1)' : ' (2:1)')}
                {participant.code === 'ACE001' && ' (1:1)'}
                {participant.code === 'GRA001' && ' (1:1)'}
                {participant.code === 'MIL001' && ' (1:1)'}
              </span>
            </div>
            <div className="participant-details" style={{ fontSize: '0.85rem', flexShrink: 0 /* Prevent shrinking */ }}>
              {/* Location based on participant and week logic */}
              {participant.code === 'LIB001' && 'Glandore'}
              {participant.code === 'JAM001' && 'Plympton Park'}
              {participant.code === 'ACE001' && (weekType === 'weekA' ? 'Glandore' : 'Plympton Park')}
              {participant.code === 'GRA001' && (weekType === 'weekA' ? 'Glandore' : 'Plympton Park')}
              {participant.code === 'MIL001' && (weekType === 'weekA' ? 'Plympton Park' : 'Glandore')}
            </div>
          </div>
        </div>

        <div className="schedule-grid">
          {weekDates.map(({ date, day }) => {
            // Get shifts for this day and sort by start time
            const dayShifts = (participantShifts[date] || []).sort((a, b) => {
              const timeA = a.startTime || a.start_time || '00:00';
              const timeB = b.startTime || b.start_time || '00:00';
              
              // Convert time strings to minutes for proper comparison
              const timeToMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
              };
              
              return timeToMinutes(timeA) - timeToMinutes(timeB);
            });
            
            return (
              <div key={`${participant.id}-${date}`} className="day-row">
                <div className="day-label">
                  <div>{day}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="day-shifts">
                  {/* Existing shifts */}
                  {dayShifts.map((shift, index) => (
                    <div key={`${participant.id}-${date}-${shift.id || index}`}>
                      {/* Show edit form inline if this shift is being edited */}
                      {/* 
                        This has been simplified to remove the IIFE and the console.log spam that was 
                        crashing the browser. The logic is now a clean, single-line check.
                      */}
                      {(showShiftForm && selectedDate === date && editingShift?.id === shift.id) ? (
                        <ShiftForm 
                          participant={participant}
                          date={date}
                          editingShift={editingShift}
                          workers={workers}
                          locations={locations}
                          onSave={async (shiftData) => {
                            await handleShiftSave({...shiftData, date});
                          }}
                          onCancel={handleShiftCancel}
                          onDelete={handleShiftDelete}
                          existingShifts={dayShifts}
                          weekType={weekType}
                          rosterData={fullRosterData || {}}
                        />
                      ) : (
                        /* Show normal shift display */
                        <div
                          key={shift.id || index}
                          className={`shift-card-wrapper ${isDragging && draggedShift?.id === shift.id ? 'dragging' : ''}`}
                        >
                          <div
                            className={`shift-card ${getShiftCardClass(shift)} ${isSelected(shift) ? 'selected' : ''}`}
                            onClick={() => handleShiftClick(shift, { date, day })}
                            draggable={editMode}
                            onDragStart={(e) => handleDragStart(e, shift, date)}
                            onDragEnd={handleDragEnd}
                            style={{ position: 'relative' }}
                          >
                            <div className="shift-card-content">
                              <div className="shift-row" style={{ display: 'grid', gridTemplateColumns: '120px minmax(160px, 1fr) 140px 200px 60px', alignItems: 'baseline', columnGap: '16px', fontSize: '14px', lineHeight: '1.2' }}>
                                <div className="shift-time">{`${formatTime(shift.startTime || shift.start_time)} - ${formatTime(shift.endTime || shift.end_time)}`}</div>
                                <div className="worker-name" style={{ whiteSpace: 'nowrap' }}>{getWorkerDisplayName(shift.workers || shift.worker_id)}</div>
                                <div className="shift-type" style={{ whiteSpace: 'nowrap' }}>{(() => {
                                  const t = (shift.supportType || shift.support_type || '').trim();
                                  if (!t) return '';
                                  return t.toLowerCase().includes('community') ? 'Community' : 'Self-Care';
                                })()}</div>
                                <div className="shift-location" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLocationName(shift.location)}</div>
                                <div className="shift-hours" style={{ whiteSpace: 'nowrap' }}>{shift.duration || shift.hours}h</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {editMode && (
                                <button
                                  className="lock-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLock(index, date);
                                  }}
                                  style={{
                                    background: 'var(--bg-secondary)',
                                    border: '2px solid var(--border-color)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    color: shift.locked ? 'var(--accent)' : 'var(--text-primary)',
                                    minWidth: '32px',
                                    minHeight: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  title={shift.locked ? 'Unlock shift' : 'Lock shift'}
                                  onMouseEnter={(e) => {
                                    e.target.style.transform = 'scale(1.05)';
                                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.transform = 'scale(1)';
                                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                  }}
                                >
                                  {shift.locked ? '●' : '○'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Show NEW shift form at bottom - only for adding new shifts */}
                  {showShiftForm && selectedDate === date && !editingShift && (
                    <ShiftForm 
                      participant={participant}
                      date={date}
                      editingShift={null}
                      workers={workers}
                      locations={locations}
                      onSave={async (shiftData) => {
                        await handleShiftSave({...shiftData, date});
                      }}
                      onCancel={handleShiftCancel}
                      onDelete={handleShiftDelete}
                      existingShifts={dayShifts}
                          weekType={weekType}
                          rosterData={fullRosterData || {}}
                    />
                  )}

                  {/* Add Shift button AFTER the form - small size like SMS_opus.html */}
                  {editMode && (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleAddShift(date)}
                      style={{ 
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        width: 'fit-content'
                      }}
                    >
                      Add Shift
                    </button>
                  )}

                  {/* Show "No shifts" only if not in edit mode and no shifts exist */}
                  {!editMode && dayShifts.length === 0 && (
                    <div style={{ 
                      color: 'var(--text-muted)', 
                      fontStyle: 'italic', 
                      padding: '1rem',
                      textAlign: 'center' 
                    }}>
                      No shifts scheduled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ParticipantSchedule;