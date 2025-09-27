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

  const handleDeleteShift = (shiftIndex, date) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      const newRosterData = { ...rosterData };
      
      // Ensure the participant exists in roster data
      if (!newRosterData[participant.code]) {
        newRosterData[participant.code] = {};
      }
      
      // Ensure the date exists
      if (!newRosterData[participant.code][date]) {
        newRosterData[participant.code][date] = [];
      }
      
      // Remove the shift at the specified index
      if (newRosterData[participant.code][date].length > shiftIndex) {
        newRosterData[participant.code][date].splice(shiftIndex, 1);
        
        // Remove empty date arrays to keep data clean
        if (newRosterData[participant.code][date].length === 0) {
          delete newRosterData[participant.code][date];
        }
        
        // Update the roster and show success message
        onRosterUpdate(newRosterData);
        toast.success('Shift deleted successfully');
      } else {
        toast.error('Error: Shift not found');
      }
    }
  };

  const handleShiftSave = (shiftData) => {
    console.log('handleShiftSave called with:', shiftData);
    console.log('Current rosterData:', rosterData);
    console.log('Participant code:', participant.code);
    
    // Update roster data
    const newRosterData = { ...rosterData };
    if (!newRosterData[participant.code]) {
      newRosterData[participant.code] = {};
    }
    if (!newRosterData[participant.code][shiftData.date]) {
      newRosterData[participant.code][shiftData.date] = [];
    }

    if (editingShift) {
      // Update existing shift
      const shiftIndex = newRosterData[participant.code][shiftData.date].findIndex(s => s.id === editingShift.id);
      console.log('Updating shift, found index:', shiftIndex);
      if (shiftIndex !== -1) {
        newRosterData[participant.code][shiftData.date][shiftIndex] = shiftData;
      }
    } else {
      // Add new shift
      console.log('Adding new shift');
      newRosterData[participant.code][shiftData.date].push(shiftData);
    }

    console.log('New roster data after save:', newRosterData);
    onRosterUpdate(newRosterData);
    toast.success(`Shift ${editingShift ? 'updated' : 'created'} successfully`);
  };

  const handleShiftCancel = () => {
    setShowShiftForm(false);
    setEditingShift(null);
    setSelectedDate(null);
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
                Default Ratio: {participant.default_ratio || '1:1'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                Week {weekType.slice(-1)}
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
                    <div key={index} className="shift-row">
                      <div className="shift-info">
                        <div className="shift-time">
                          {shift.startTime} - {shift.endTime}
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            color: 'var(--text-muted)',
                            fontSize: '1rem'
                          }}>
                            ({shift.duration || '0'}h)
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span className="shift-type">{shift.supportType || 'Self-Care'}</span>
                          <span className="shift-type" style={{ background: 'var(--accent-success)' }}>
                            {shift.ratio || '1:1'}
                          </span>
                          {shift.shiftNumber && (
                            <span className="shift-type" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                              #{shift.shiftNumber}
                            </span>
                          )}
                        </div>
                        
                        {shift.workers && shift.workers.length > 0 && (
                          <div className="shift-workers">
                            <Users size={14} style={{ marginRight: '0.25rem' }} />
                            {getWorkerNames(shift.workers)}
                          </div>
                        )}
                        
                        {shift.location && (
                          <div className="shift-workers">
                            {getLocationName(shift.location)}
                          </div>
                        )}
                        
                        {shift.notes && (
                          <div className="shift-workers">
                            💬 {shift.notes}
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
                              console.log('Delete shift clicked:', index, date);
                              handleDeleteShift(index, date);
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
                  ))}
                  
                  {/* Show shift form FIRST - when adding/editing */}
                  {showShiftForm && selectedDate === date && (
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