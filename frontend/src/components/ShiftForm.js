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
  // Generate time options starting from 6am with hourly increments
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 6; hour <= 30; hour++) { // 6am to 6am next day (inclusive)
      const displayHour = hour > 24 ? hour - 24 : hour;
      const time24 = `${displayHour.toString().padStart(2, '0')}:00`;
      times.push({
        value: time24,
        label: time24
      });
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

  // Get default location for participant
  const getDefaultLocation = () => {
    if (editingShift) return editingShift.location;
    
    // Default locations based on participant
    if (participant.code === 'LIB001') { // Libby
      const glandore = locations.find(l => l.name === 'Glandore');
      return glandore ? glandore.id : '';
    }
    if (participant.code === 'JAM001') { // James
      const plympton = locations.find(l => l.name === 'Plympton Park');
      return plympton ? plympton.id : '';
    }
    // For Ace, Grace, Milan - default to first location
    return locations.length > 0 ? locations[0].id : '';
  };

  const [formData, setFormData] = useState({
    startTime: getSmartStartTime(),
    endTime: editingShift?.endTime || '14:00',
    supportType: editingShift?.supportType || 'Self-Care',
    ratio: editingShift?.ratio || participant.default_ratio || '1:1',
    workers: editingShift?.workers || [],
    location: getDefaultLocation(),
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

    // Ensure all data is properly structured
    const shiftData = {
      id: editingShift?.id || Date.now().toString(),
      date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      supportType: formData.supportType,
      ratio: formData.ratio,
      workers: formData.workers.filter(w => w), // Remove empty worker slots
      location: formData.location || '', // Ensure location is saved
      notes: formData.notes || '',
      shiftNumber: formData.shiftNumber,
      duration: calculateDuration(formData.startTime, formData.endTime)
    };

    console.log('Saving shift data:', shiftData); // Debug log
    onSave(shiftData);
  };

  // Calculate duration in hours
  const calculateDuration = (start, end) => {
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    let duration = endHour - startHour;
    if (duration <= 0) duration += 24; // Handle overnight
    return duration.toFixed(1);
  };

  return (
    <div className="shift-row" style={{
      background: 'var(--bg-input)',
      borderLeft: '4px solid var(--accent-warning)',
      marginBottom: '0.5rem',
      borderRadius: '4px'
    }}>
      <form onSubmit={handleSubmit}>
        <div style={{ 
          display: 'flex', 
          gap: '0.7rem', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          padding: '1rem'
        }}>
          
          {/* Date - Fixed width to prevent cutoff */}
          <div style={{ minWidth: '100px' }}>
            <input 
              type="text" 
              value={new Date(date).toLocaleDateString('en-AU', { 
                weekday: 'short',
                day: 'numeric', 
                month: 'short' 
              })}
              readOnly 
              style={{ 
                width: '95px', 
                background: 'var(--bg-tertiary)', 
                fontSize: '1rem',
                textAlign: 'center',
                border: '1px solid var(--border-color)',
                padding: '0.5rem',
                borderRadius: '4px'
              }}
            />
          </div>

          {/* Time */}
          <select 
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            style={{ 
              width: '80px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            {timeOptions.map(time => (
              <option key={time.value} value={time.value}>{time.label}</option>
            ))}
          </select>

          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 'bold' }}>to</span>

          <select 
            value={formData.endTime}
            onChange={(e) => handleInputChange('endTime', e.target.value)}
            style={{ 
              width: '80px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            {timeOptions.map(time => (
              <option key={time.value} value={time.value}>{time.label}</option>
            ))}
          </select>

          {/* Support Type */}
          <select 
            value={formData.supportType}
            onChange={(e) => handleInputChange('supportType', e.target.value)}
            style={{ 
              minWidth: '160px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            <option value="Self-Care">Self-Care</option>
            <option value="Community Participation">Community Participation</option>
          </select>

          {/* Ratio */}
          <select 
            value={formData.ratio}
            onChange={(e) => handleInputChange('ratio', e.target.value)}
            style={{ 
              width: '70px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            <option value="1:1">1:1</option>
            <option value="2:1">2:1</option>
            <option value="2:3">2:3</option>
          </select>

          {/* Support Worker Selection */}
          <select 
            value={formData.workers[0] || ''}
            onChange={(e) => handleWorkerChange(0, e.target.value)}
            style={{ 
              minWidth: '160px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            <option value="">Select Worker 1</option>
            {workers.map(worker => (
              <option key={worker.id} value={worker.id}>{worker.full_name}</option>
            ))}
          </select>

          {/* Worker 2 - only if 2:1 ratio */}
          {formData.ratio === '2:1' && (
            <select 
              value={formData.workers[1] || ''}
              onChange={(e) => handleWorkerChange(1, e.target.value)}
              style={{ 
                minWidth: '160px', 
                fontSize: '1rem',
                padding: '0.5rem',
                borderRadius: '4px'
              }}
            >
              <option value="">Select Worker 2</option>
              {workers.map(worker => (
                <option key={worker.id} value={worker.id}>{worker.full_name}</option>
              ))}
            </select>
          )}

          {/* Location */}
          <select 
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            style={{ 
              minWidth: '130px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            <option value="">Select Location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <button type="submit" className="btn btn-success" style={{ 
            padding: '0.5rem 1rem', 
            fontSize: '1rem',
            borderRadius: '4px'
          }}>
            <Save size={16} /> Save
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ 
            padding: '0.5rem 1rem', 
            fontSize: '1rem',
            borderRadius: '4px'
          }}>
            <X size={16} /> Cancel
          </button>
        </div>

        {/* Shift Report Number and Notes in second row */}
        <div style={{ 
          padding: '0 1rem 1rem', 
          display: 'flex', 
          gap: '0.7rem', 
          alignItems: 'center',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem'
        }}>
          <input 
            type="text" 
            value={formData.shiftNumber}
            onChange={(e) => handleInputChange('shiftNumber', e.target.value)}
            style={{ 
              width: '140px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
            placeholder="Shift Report #"
          />
          
          <textarea 
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Notes (optional)"
            rows="2" 
            style={{ 
              flex: 1, 
              fontSize: '1rem',
              resize: 'vertical',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          />
        </div>
      </form>
    </div>
  );
};

export default ShiftForm;