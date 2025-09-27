import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

const ShiftForm = ({ 
  participant, 
  date, 
  editingShift, 
  workers, 
  locations, 
  onSave, 
  onCancel,
  existingShifts = []
}) => {
  // Generate time options starting from 6am with 15-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 6; hour < 30; hour++) { // 6am to 6am next day
      for (let minute = 0; minute < 60; minute += 15) {
        const displayHour = hour >= 24 ? hour - 24 : hour;
        const time24 = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push({
          value: time24,
          label: displayTime,
          minutes: hour * 60 + minute
        });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Get smart start time based on previous shifts
  const getSmartStartTime = () => {
    if (editingShift) return editingShift.startTime;
    
    const dayShifts = existingShifts.filter(s => s.date === date).sort((a, b) => a.endTime.localeCompare(b.endTime));
    if (dayShifts.length > 0) {
      const lastShift = dayShifts[dayShifts.length - 1];
      return lastShift.endTime;
    }
    return '06:00'; // Default 6am start
  };

  const [formData, setFormData] = useState({
    startTime: getSmartStartTime(),
    endTime: editingShift?.endTime || '14:00',
    supportType: editingShift?.supportType || 'Self-Care',
    ratio: editingShift?.ratio || participant.default_ratio || '1:1',
    workers: editingShift?.workers || [],
    location: editingShift?.location || '',
    notes: editingShift?.notes || '',
    shiftNumber: editingShift?.shiftNumber || generateShiftNumber()
  });

  // Generate shift report number
  function generateShiftNumber() {
    const dateStr = date.replace(/-/g, '');
    const participantInitial = participant.full_name.charAt(0).toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${dateStr}${participantInitial}${randomNum}`;
  }

  // Calculate shift duration
  const calculateDuration = (start, end) => {
    const startMinutes = timeOptions.find(t => t.value === start)?.minutes || 0;
    const endMinutes = timeOptions.find(t => t.value === end)?.minutes || 0;
    let duration = endMinutes - startMinutes;
    if (duration <= 0) duration += 24 * 60; // Handle overnight
    return (duration / 60).toFixed(1);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWorkerToggle = (workerId) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.includes(workerId) 
        ? prev.workers.filter(id => id !== workerId)
        : [...prev.workers, workerId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.startTime >= formData.endTime) {
      alert('End time must be after start time');
      return;
    }

    const shiftData = {
      ...formData,
      id: editingShift?.id || Date.now().toString(),
      date,
      duration: calculateDuration(formData.startTime, formData.endTime)
    };

    onSave(shiftData);
  };

  const duration = calculateDuration(formData.startTime, formData.endTime);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '1rem',
      margin: '1rem 0'
    }}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ color: 'var(--accent-primary)', margin: 0 }}>
            {editingShift ? 'Edit Shift' : 'Add Shift'} - {participant.full_name}
          </h4>
          <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          {/* Date and Shift Number */}
          <div>
            <label className="form-label">Date</label>
            <input type="date" value={date} readOnly style={{ background: 'var(--bg-tertiary)' }} />
          </div>
          
          <div>
            <label className="form-label">Shift Report #</label>
            <input 
              type="text" 
              value={formData.shiftNumber}
              onChange={(e) => handleInputChange('shiftNumber', e.target.value)}
            />
          </div>

          {/* Times */}
          <div>
            <label className="form-label">Start Time</label>
            <select 
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
            >
              {timeOptions.map(time => (
                <option key={time.value} value={time.value}>{time.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">End Time</label>
            <select 
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
            >
              {timeOptions.map(time => (
                <option key={time.value} value={time.value}>{time.label}</option>
              ))}
            </select>
          </div>

          {/* Support Type */}
          <div>
            <label className="form-label">Support Type</label>
            <select 
              value={formData.supportType}
              onChange={(e) => handleInputChange('supportType', e.target.value)}
            >
              <option value="Self-Care">Self-Care</option>
              <option value="Community Participation">Community Participation</option>
            </select>
          </div>

          {/* Ratio */}
          <div>
            <label className="form-label">Ratio</label>
            <select 
              value={formData.ratio}
              onChange={(e) => handleInputChange('ratio', e.target.value)}
            >
              <option value="1:1">1:1</option>
              <option value="2:1">2:1</option>
              <option value="2:3">2:3</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="form-label">Location</label>
            <select 
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            >
              <option value="">Select location...</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Display */}
          <div>
            <label className="form-label">Duration</label>
            <input 
              type="text" 
              value={`${duration} hours`}
              readOnly 
              style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        {/* Worker Assignment */}
        <div style={{ margin: '1rem 0' }}>
          <label className="form-label">Assign Workers</label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '0.5rem',
            maxHeight: '120px', 
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
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                <input 
                  type="checkbox" 
                  checked={formData.workers.includes(worker.id)}
                  onChange={() => handleWorkerToggle(worker.id)}
                />
                <span>{worker.full_name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ margin: '1rem 0' }}>
          <label className="form-label">Notes</label>
          <textarea 
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows="2" 
            placeholder="Additional shift notes..."
            style={{ width: '100%' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> {editingShift ? 'Update' : 'Create'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShiftForm;