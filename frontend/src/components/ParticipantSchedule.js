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
      if (!newRosterData[participant.code]) {
        newRosterData[participant.code] = {};
      }
      if (!newRosterData[participant.code][date]) {
        newRosterData[participant.code][date] = [];
      }
      
      newRosterData[participant.code][date].splice(shiftIndex, 1);
      
      // Remove empty arrays
      if (newRosterData[participant.code][date].length === 0) {
        delete newRosterData[participant.code][date];
      }
      
      onRosterUpdate(newRosterData);
      toast.success('Shift deleted successfully');
    }
  };

  const handleShiftSave = (shiftData) => {
    // Update roster data
    const newRosterData = { ...rosterData };
    if (!newRosterData[participant.code]) {
      newRosterData[participant.code] = {};
    }
    if (!newRosterData[participant.code][selectedDate]) {
      newRosterData[participant.code][selectedDate] = [];
    }

    if (editingShift) {
      // Update existing shift
      const shiftIndex = newRosterData[participant.code][selectedDate].findIndex(s => s.id === editingShift.id);
      if (shiftIndex !== -1) {
        newRosterData[participant.code][selectedDate][shiftIndex] = shiftData;
      }
    } else {
      // Add new shift
      newRosterData[participant.code][selectedDate].push(shiftData);
    }

    onRosterUpdate(newRosterData);
    setShowShiftForm(false);
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
    return locations.find(l => l.id === parseInt(locationId))?.name || 'Unknown Location';
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
                  {editMode && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddShift(date)}
                      style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>

                <div className="day-shifts">
                  {dayShifts.length === 0 && !showShiftForm ? (
                    <div style={{ 
                      color: 'var(--text-muted)', 
                      fontStyle: 'italic', 
                      padding: '1rem',
                      textAlign: 'center' 
                    }}>
                      No shifts scheduled
                    </div>
                  ) : null}
                  
                  {/* Existing shifts */}
                  {dayShifts.map((shift, index) => (
                    <div key={index} className="shift-row">
                      <div className="shift-info">
                        <div className="shift-time">
                          {shift.startTime} - {shift.endTime}
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem'
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
                            📍 {getLocationName(shift.location)}
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
                            onClick={() => handleEditShift(shift, date)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button 
                            className="btn btn-danger"
                            onClick={() => handleDeleteShift(index, date)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Inline shift form - appears exactly where Add button is */}
                  {showShiftForm && selectedDate === date && (
                    <ShiftForm
                      participant={participant}
                      date={selectedDate}
                      editingShift={editingShift}
                      workers={workers}
                      locations={locations}
                      onSave={handleShiftSave}
                      onCancel={handleShiftCancel}
                      existingShifts={dayShifts}
                    />
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