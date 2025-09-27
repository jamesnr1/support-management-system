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
        times.push({
          value: time24,
          label: time24
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWorkerChange = (index, workerId) => {
    const newWorkers = [...formData.workers];
    newWorkers[index] = workerId;
    setFormData(prev => ({
      ...prev,
      workers: newWorkers
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
      date
    };

    onSave(shiftData);
  };

  // Determine if this participant needs two workers (like James/Libby in HTML)
  const needsSecondWorker = participant.default_ratio === '2:1';

  return (
    <div className="shift-row" style={{
      background: 'var(--bg-input)',
      borderLeft: '4px solid var(--accent-warning)',
      marginBottom: '0.5rem'
    }}>
      <form onSubmit={handleSubmit}>
        <div className="edit-controls" style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          padding: '0.5rem'
        }}>
          
          {/* Date */}
          <input 
            type="text" 
            value={new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            readOnly 
            style={{ 
              width: '70px', 
              background: 'var(--bg-tertiary)', 
              fontSize: '0.85rem',
              textAlign: 'center'
            }}
          />

          {/* Shift Report Number */}
          <input 
            type="text" 
            value={formData.shiftNumber}
            onChange={(e) => handleInputChange('shiftNumber', e.target.value)}
            style={{ width: '90px', fontSize: '0.85rem' }}
            placeholder="Report #"
          />

          {/* Support Type */}
          <select 
            value={formData.supportType}
            onChange={(e) => handleInputChange('supportType', e.target.value)}
            style={{ minWidth: '130px' }}
          >
            <option value="Self-Care">Self-Care</option>
            <option value="Community Participation">Community Participation</option>
          </select>

          {/* Start Time */}
          <select 
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            className="time-input"
            style={{ width: '80px' }}
          >
            {timeOptions.map(time => (
              <option key={time.value} value={time.value}>{time.label}</option>
            ))}
          </select>

          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>to</span>

          {/* End Time */}
          <select 
            value={formData.endTime}
            onChange={(e) => handleInputChange('endTime', e.target.value)}
            className="time-input"
            style={{ width: '80px' }}
          >
            {timeOptions.map(time => (
              <option key={time.value} value={time.value}>{time.label}</option>
            ))}
          </select>

          {/* Worker 1 */}
          <select 
            value={formData.workers[0] || ''}
            onChange={(e) => handleWorkerChange(0, e.target.value)}
            className="worker-select"
            style={{ minWidth: '150px' }}
          >
            <option value="">Worker 1</option>
            {workers.map(worker => (
              <option key={worker.id} value={worker.id}>{worker.full_name}</option>
            ))}
          </select>

          {/* Worker 2 - only if needed */}
          {needsSecondWorker && (
            <select 
              value={formData.workers[1] || ''}
              onChange={(e) => handleWorkerChange(1, e.target.value)}
              className="worker-select"
              style={{ minWidth: '150px' }}
            >
              <option value="">Worker 2</option>
              {workers.map(worker => (
                <option key={worker.id} value={worker.id}>{worker.full_name}</option>
              ))}
            </select>
          )}

          {/* Ratio */}
          <select 
            value={formData.ratio}
            onChange={(e) => handleInputChange('ratio', e.target.value)}
            style={{ width: '60px' }}
          >
            <option value="1:1">1:1</option>
            <option value="2:1">2:1</option>
            <option value="2:3">2:3</option>
          </select>

          {/* Location */}
          <select 
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            style={{ minWidth: '120px' }}
          >
            <option value="">Location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <button type="submit" className="btn btn-success" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
            <Save size={14} />
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
            <X size={14} />
          </button>
        </div>

        {/* Notes row */}
        {formData.notes || true ? (
          <div style={{ padding: '0 0.5rem 0.5rem' }}>
            <textarea 
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Notes (optional)"
              rows="2" 
              style={{ 
                width: '100%', 
                fontSize: '0.85rem',
                resize: 'vertical'
              }}
            />
          </div>
        ) : null}
      </form>
    </div>
  );
};

export default ShiftForm;