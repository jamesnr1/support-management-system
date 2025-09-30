import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import ShiftForm from './ShiftForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ParticipantSchedule = ({ 
  participant, 
  weekType, 
  rosterData, 
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
  const participantShifts = rosterData[participant.code] || {};

  // Generate week dates starting from Monday
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const currentDay = today.getDay(); // 0=Sunday, 1=Monday, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Convert to Monday=0
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dayShort: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const handleAddShift = (date) => {
    setSelectedDate(date);
    setEditingShift(null);
    setShowShiftForm(true);
  };

  const handleEditShift = (shift, date) => {
    setSelectedDate(date);
    setEditingShift(shift);
    setShowShiftForm(true);
  };

  const handleShiftSave = async (shiftData) => {
    console.log('ADD SHIFT - Starting function');
    console.log('Shift data:', shiftData);
    
    // Create completely new roster structure
    const updatedRosterData = JSON.parse(JSON.stringify(rosterData || {}));
    
    // Initialize participant if doesn't exist
    if (!updatedRosterData[participant.code]) {
      updatedRosterData[participant.code] = {};
    }
    
    // Initialize date array if doesn't exist
    if (!updatedRosterData[participant.code][shiftData.date]) {
      updatedRosterData[participant.code][shiftData.date] = [];
    }

    if (editingShift) {
      // Update existing shift
      const shifts = updatedRosterData[participant.code][shiftData.date];
      const shiftIndex = shifts.findIndex(s => s.id === editingShift.id);
      if (shiftIndex >= 0) {
        shifts[shiftIndex] = { ...shiftData };
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
    
    // Force immediate refresh
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleShiftCancel = () => {
    setShowShiftForm(false);
    setSelectedDate(null);
    setEditingShift(null);
  };

  // BUILT DELETE FUNCTION
  const handleDeleteShift = async (shiftIndex, shiftDate) => {
    console.log('DELETE FUNCTION - Starting delete for index:', shiftIndex, 'date:', shiftDate);
    
    if (!window.confirm('Delete this shift?')) {
      return;
    }
    
    try {
      // Get current roster data
      const currentRoster = JSON.parse(JSON.stringify(rosterData || {}));
      
      // Check if participant and date exist
      if (!currentRoster[participant.code] || !currentRoster[participant.code][shiftDate]) {
        console.log('No shifts found for deletion');
        return;
      }
      
      // Remove the shift at the specified index
      const shifts = currentRoster[participant.code][shiftDate];
      console.log('Before delete - shifts:', shifts);
      
      // Remove shift by index
      shifts.splice(shiftIndex, 1);
      console.log('After delete - shifts:', shifts);
      
      // If no shifts remain for this date, remove the date
      if (shifts.length === 0) {
        delete currentRoster[participant.code][shiftDate];
        console.log('Removed empty date entry');
      } else {
        currentRoster[participant.code][shiftDate] = shifts;
      }
      
      // Update the roster
      console.log('Updating roster with:', currentRoster);
      await onRosterUpdate(currentRoster);
      
      // Force reload to show changes
      setTimeout(() => {
        window.location.reload();
      }, 200);
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed: ' + error.message);
    }
  };

  const getWorkerNames = (workerIds) => {
    return workerIds.map(id => 
      workers.find(w => w.id === id)?.full_name || `Worker ${id}`
    ).join(', ');
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
        <div className="participant-header">
          <div className="participant-info">
            <div>
              <div className="participant-name">{participant.full_name}</div>
              <div className="participant-details">
                {/* Location and ratio based on participant and week logic */}
                {participant.code === 'LIB001' && 'Glandore (Ratio:2:1)'}
                {participant.code === 'JAM001' && 'Plympton Park (Ratio:2:1)'}
                {(participant.code === 'ACE001' || participant.code === 'GRA001' || participant.code === 'MIL001') && (
                  weekType === 'weekA' || weekType === 'nextA' 
                    ? 'Glandore (Ratio:1:1)' 
                    : 'Plympton Park (Ratio:1:1)'
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                {weekType === 'weekA' && 'Week A'}
                {weekType === 'weekB' && 'Week B'}
                {weekType === 'nextA' && 'Next A'}
                {weekType === 'nextB' && 'Next B'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {Object.keys(participantShifts).length} days scheduled
              </div>
            </div>
          </div>
        </div>

        <div className="schedule-grid">
          {weekDates.map(({ date, day }) => {
            const dayShifts = participantShifts[date] || [];
            
            return (
              <div key={date} className="day-row">
                <div className="day-label">
                  <div>{day}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="day-shifts">
                  {/* Existing shifts */}
                  {dayShifts.map((shift, index) => (
                    <div key={index}>
                      {/* Show edit form inline if this shift is being edited */}
                      {showShiftForm && selectedDate === date && editingShift && editingShift.id === shift.id ? (
                        <ShiftForm
                          participant={participant}
                          date={date}
                          editingShift={editingShift}
                          workers={workers}
                          locations={locations}
                          onSave={(shiftData) => {
                            handleShiftSave({...shiftData, date});
                            setShowShiftForm(false);
                            setSelectedDate(null);
                            setEditingShift(null);
                          }}
                          onCancel={handleShiftCancel}
                          existingShifts={dayShifts}
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
                              {shift.shiftNumber && (
                                <span className="shift-type" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                  #{shift.shiftNumber}
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
                                className="btn btn-secondary"
                                onClick={() => {
                                  console.log('Edit shift clicked:', shift, date);
                                  handleEditShift(shift, date);
                                }}
                                style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '0.5rem 1rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Edit size={16} /> Edit
                              </button>
                              <button 
                                className="btn btn-danger"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this shift?')) {
                                    console.log('DELETE SHIFT - Starting delete');
                                    console.log('Deleting shift index:', index, 'on date:', date);
                                    
                                    // Create deep copy of roster data
                                    const updatedRosterData = JSON.parse(JSON.stringify(rosterData || {}));
                                    
                                    if (updatedRosterData[participant.code] && updatedRosterData[participant.code][date]) {
                                      // Remove shift at specific index
                                      const shiftsForDate = updatedRosterData[participant.code][date];
                                      shiftsForDate.splice(index, 1);
                                      
                                      // If no shifts left for this date, remove the date entry
                                      if (shiftsForDate.length === 0) {
                                        delete updatedRosterData[participant.code][date];
                                      } else {
                                        updatedRosterData[participant.code][date] = shiftsForDate;
                                      }
                                      
                                      console.log('Updated roster after delete:', updatedRosterData);
                                      
                                      // Update roster and reload
                                      onRosterUpdate(updatedRosterData);
                                      
                                      setTimeout(() => {
                                        window.location.reload();
                                      }, 100);
                                    }
                                  }
                                }}
                                style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '0.5rem 1rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
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
                      onSave={(shiftData) => {
                        handleShiftSave({...shiftData, date});
                        setShowShiftForm(false);
                        setSelectedDate(null);
                        setEditingShift(null);
                      }}
                      onCancel={handleShiftCancel}
                      existingShifts={dayShifts}
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