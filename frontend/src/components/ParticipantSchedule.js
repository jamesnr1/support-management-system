import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Edit, Trash2, Plus, Lock, Unlock } from 'lucide-react';
import ShiftForm from './ShiftForm';

// This function is now outside the component, so it won't be recreated on every render.
const getWeekDates = (weekType) => {
  const dates = [];
  let startDate;

  // Define static start dates for each week type to align with the backend.
  // NOTE: JavaScript's Date constructor month is 0-indexed (0=Jan, 8=Sep, 9=Oct)
  // The backend defines weeks starting on Sunday.
  switch (weekType) {
    case 'weekA':
      startDate = new Date('2025-09-29T00:00:00'); // Monday, Sep 29, 2025 (CURRENT WEEK)
      break;
    case 'weekB':
      startDate = new Date('2025-10-06T00:00:00');  // Monday, Oct 6, 2025 (NEXT WEEK)
      break;
    case 'nextA':
      startDate = new Date('2025-10-06T00:00:00'); // Monday, Oct 06, 2025
      break;
    case 'nextB':
      startDate = new Date('2025-10-13T00:00:00'); // Monday, Oct 13, 2025
      break;
    default:
      // Fallback for safety, though it should not be reached.
      const today = new Date();
      const currentDay = today.getDay(); // 0 is Sunday
      startDate = new Date(today);
      startDate.setDate(today.getDate() - currentDay);
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

const ParticipantSchedule = ({ 
  participant, 
  weekType, 
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
  const queryClient = useQueryClient();

  // Get participant's shifts for this week
  // rosterData is now the correctly sliced data for this specific participant
  const participantShifts = rosterData || {};

  // useMemo prevents this expensive calculation from running on every single re-render.
  const weekDates = useMemo(() => getWeekDates(weekType), [weekType]);

  const handleAddShift = (date) => {
    setSelectedDate(date);
    setEditingShift(null);
    setShowShiftForm(true);
  };

  const handleEditShift = (shift, date) => {
    // Check if shift is locked
    if (shift.locked) {
      alert('⚠️ This shift is locked. Please unlock it before editing.');
      return;
    }
    
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
      
      // Create completely new roster structure
      const updatedRosterData = JSON.parse(JSON.stringify(rosterData || {}));
      
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
          // Preserve id and locked flag on edit
          shifts[shiftIndex] = { ...shiftData, id: editingShift.id, locked: editingShift.locked ?? false };
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

  const getWorkerNames = (workerIds) => {
    return (workerIds || []).map(id => {
      const match = (workers || []).find(w => String(w.id) === String(id));
      return match?.full_name || `Worker ${id}`;
    }).join(', ');
  };

  const getLocationName = (locationId) => {
    if (!locationId) return 'No location';
    
    // Try both string and number matching since IDs might be different types
    const location = locations.find(l => 
      l.id === locationId || 
      l.id === parseInt(locationId) || 
      l.id === locationId.toString()
    );
    
    return location ? location.name : `Unknown Location (ID: ${locationId})`;
  };

  return (
    <div>
      <div className="participant-card">
        <div className="participant-header" style={{ padding: '0.75rem 1rem' }}>
          <div className="participant-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="participant-name" style={{ marginBottom: 0 }}>{participant.full_name}</div>
              <div className="participant-details" style={{ fontSize: '0.85rem' }}>
                {/* Location and ratio based on participant and week logic */}
                {participant.code === 'LIB001' && '— Glandore • 2:1'}
                {participant.code === 'JAM001' && '— Plympton Park • 2:1'}
                {participant.code === 'ACE001' && (weekType === 'weekA' ? '— Glandore • 1:1' : '— Plympton Park • 1:1')}
                {participant.code === 'GRA001' && (weekType === 'weekA' ? '— Glandore • 1:1' : '— Plympton Park • 1:1')}
                {participant.code === 'MIL001' && (weekType === 'weekA' ? '— Plympton Park • 1:1' : '— Glandore • 1:1')}
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {Object.keys(participantShifts).length} days
              </div>
            </div>
          </div>
        </div>

        <div className="schedule-grid">
          {weekDates.map(({ date, day }) => {
            const dayShifts = participantShifts[date] || [];
            
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
                          existingShifts={dayShifts}
                          weekType={weekType}
                          rosterData={fullRosterData || {}}
                        />
                      ) : (
                        /* Show normal shift display */
                        <div className="shift-row">
                          <div className="shift-info">
                            {/* Line 1: Time and hours */}
                            <div className="shift-time">
                              {shift.startTime} - {shift.endTime} ({shift.duration || '0'}h)
                            </div>
                            
                            {/* Line 2: Shift type, ratio, and shift number */}
                            <div style={{ marginTop: '0.25rem' }}>
                              <span className="shift-type">{shift.supportType || 'Self-Care'}</span>
                              <span className="shift-type" style={{ background: 'var(--accent-success)', marginLeft: '0.5rem' }}>
                                {shift.ratio || '1:1'}
                              </span>
                              {(() => {
                                // Check if worker count matches ratio
                                const requiredWorkers = parseInt((shift.ratio || '1:1').split(':')[0]);
                                const actualWorkers = (shift.workers || []).filter(w => w).length;
                                if (actualWorkers < requiredWorkers) {
                                  return (
                                    <span className="shift-type" style={{ background: '#d97706', color: 'white', marginLeft: '0.5rem', fontWeight: 'bold' }}>
                                      ⚠️ {actualWorkers}/{requiredWorkers} WORKERS
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {shift.shiftNumber && (
                                <span className="shift-type" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                  {shift.shiftNumber}
                                </span>
                              )}
                            </div>
                            
                            {/* Line 3: Workers with icon and notes on same line */}
                            {(shift.workers?.length > 0 || shift.notes) && (
                              <div className="shift-workers" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {shift.workers && shift.workers.length > 0 && (
                                  <>
                                    <Users size={14} />
                                    <span>{getWorkerNames(shift.workers)}</span>
                                  </>
                                )}
                                {shift.notes && (
                                  <span>💬 {shift.notes}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {editMode && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button 
                                className={shift.locked ? "btn btn-secondary" : "btn btn-secondary"}
                                onClick={() => handleToggleLock(index, date)}
                                style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '0.5rem 1rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  background: shift.locked ? '#d97706' : 'var(--bg-secondary)',
                                  color: shift.locked ? '#fff' : 'inherit'
                                }}
                                title={shift.locked ? 'Unlock shift' : 'Lock shift'}
                              >
                                {shift.locked ? <Lock size={16} /> : <Unlock size={16} />}
                                {shift.locked ? ' Locked' : ' Lock'}
                              </button>
                              <button 
                                className="btn btn-secondary"
                                onClick={() => {
                                  console.log('Edit shift clicked:', { shift, date, shiftId: shift.id });
                                  console.log('Current state before edit:', { showShiftForm, selectedDate, editingShift });
                                  handleEditShift(shift, date);
                                  console.log('State after handleEditShift call');
                                }}
                                style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '0.5rem 1rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  opacity: shift.locked ? 0.5 : 1,
                                  cursor: shift.locked ? 'not-allowed' : 'pointer'
                                }}
                                disabled={shift.locked}
                              >
                                <Edit size={16} /> Edit
                              </button>
                              <button 
                                className="btn btn-danger"
                                onClick={() => handleDeleteShift(index, date)}
                                style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '0.5rem 1rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  opacity: shift.locked ? 0.5 : 1,
                                  cursor: shift.locked ? 'not-allowed' : 'pointer'
                                }}
                                disabled={shift.locked}
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          )}
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
                        marginTop: '0.5rem'
                      }}
                    >
                      <Plus size={16} /> Add Shift
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
};

export default ParticipantSchedule;