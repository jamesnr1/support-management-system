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

  // Check worker availability mutation
  const checkAvailabilityMutation = useMutation({
    mutationFn: async ({ shift_start, shift_end }) => {
      const response = await axios.post(`${API}/check-availability`, {
        worker_id: 1, // placeholder
        shift_start,
        shift_end
      });
      return response.data;
    }
  });

  // Check conflicts mutation
  const checkConflictsMutation = useMutation({
    mutationFn: async ({ worker_id, shift_date, start_time, end_time }) => {
      const response = await axios.post(`${API}/check-conflicts`, {
        worker_id,
        shift_date,
        start_time,
        end_time
      });
      return response.data;
    }
  });

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

  const calculateShiftHours = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (end < start) {
      end.setDate(end.getDate() + 1); // Handle overnight shifts
    }
    return ((end - start) / (1000 * 60 * 60)).toFixed(1);
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
                {dayShifts.length === 0 ? (
                  <div style={{ 
                    color: 'var(--text-muted)', 
                    fontStyle: 'italic', 
                    padding: '1rem',
                    textAlign: 'center' 
                  }}>
                    No shifts scheduled
                  </div>
                ) : (
                  dayShifts.map((shift, index) => (
                    <div key={index} className="shift-row">
                      <div className="shift-info">
                        <div className="shift-time">
                          {shift.startTime} - {shift.endTime}
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem'
                          }}>
                            ({calculateShiftHours(shift.startTime, shift.endTime)}h)
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span className="shift-type">{shift.supportType || 'Self-Care'}</span>
                          <span className="shift-type" style={{ background: 'var(--accent-success)' }}>
                            {shift.ratio || '1:1'}
                          </span>
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
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEditShift(shift, date)}
                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.4rem' }}
                          >
                            <Edit size={10} />
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteShift(index, date)}
                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.4rem' }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift Form Modal */}
      {showShiftModal && (
        <div className="modal-overlay" onClick={() => setShowShiftModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingShift ? 'Edit Shift' : 'Add New Shift'} - {participant.full_name}
              </h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowShiftModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleShiftSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      readOnly 
                      style={{ background: 'var(--bg-tertiary)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Support Type *</label>
                    <select 
                      name="support_type" 
                      defaultValue={editingShift?.supportType || 'Self-Care'}
                      required
                    >
                      <option value="Self-Care">Self-Care</option>
                      <option value="Community Participation">Community Participation</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input 
                      type="time" 
                      name="start_time" 
                      defaultValue={editingShift?.startTime || ''}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input 
                      type="time" 
                      name="end_time" 
                      defaultValue={editingShift?.endTime || ''}
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Worker Ratio</label>
                    <select name="ratio" defaultValue={editingShift?.ratio || participant.default_ratio || '1:1'}>
                      <option value="1:1">1:1 (Individual)</option>
                      <option value="2:1">2:1 (Individual Intensive)</option>
                      <option value="1:2">1:2 (Shared)</option>
                      <option value="2:3">2:3 (Shared Intensive)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <select name="location" defaultValue={editingShift?.location || ''}>
                      <option value="">Select location...</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Workers</label>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '0.5rem'
                  }}>
                    {workers.map(worker => (
                      <label key={worker.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.25rem',
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="checkbox" 
                          name="workers" 
                          value={worker.id}
                          defaultChecked={editingShift?.workers?.includes(worker.id)}
                        />
                        <span>{worker.full_name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ({worker.code})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea 
                    name="notes" 
                    rows="2" 
                    defaultValue={editingShift?.notes || ''}
                    placeholder="Additional shift notes..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  {editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowShiftModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantSchedule;