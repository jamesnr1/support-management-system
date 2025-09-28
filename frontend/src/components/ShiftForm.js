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
      background: 'var(--bg-tertiary)',
      borderLeft: '4px solid var(--accent-primary)',
      marginBottom: '0.5rem',
      borderRadius: '4px',
      padding: '0.8rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', overflow: 'visible' }}>
        
        {/* Time - FIRST as requested */}
        <select 
          value={formData.startTime}
          onChange={(e) => handleInputChange('startTime', e.target.value)}
          style={{ 
            width: '90px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          {timeOptions.map(time => (
            <option key={time.value} value={time.value}>{time.label}</option>
          ))}
        </select>

        <span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>to</span>

        <select 
          value={formData.endTime}
          onChange={(e) => handleInputChange('endTime', e.target.value)}
          style={{ 
            width: '90px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          {timeOptions.map(time => (
            <option key={time.value} value={time.value}>{time.label}</option>
          ))}
        </select>

        {/* Support Type - SECOND as requested */}
        <select 
          value={formData.supportType}
          onChange={(e) => handleInputChange('supportType', e.target.value)}
          style={{ 
            minWidth: '180px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <option value="Self-Care">Self-Care</option>
          <option value="Community Participation">Community Participation</option>
        </select>

        {/* Worker 1 */}
        <select 
          value={formData.workers[0] || ''}
          onChange={(e) => handleWorkerChange(0, e.target.value)}
          style={{ 
            minWidth: '180px', 
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <option value="">Select Worker 1</option>
          {workers.map(worker => (
            <option key={worker.id} value={worker.id}>{worker.full_name}</option>
          ))}
        </select>

        {/* Worker 2 - show for 2:1 ratio or if James/Libby sharing with Ace/Grace */}
        {(formData.ratio === '2:1' || shouldShowSecondWorker()) && (
          <select 
            value={formData.workers[1] || ''}
            onChange={(e) => handleWorkerChange(1, e.target.value)}
            style={{ 
              minWidth: '180px', 
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
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
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <option value="">Location</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>

        {/* Notes */}
        <input 
          type="text"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Notes"
          style={{ 
            minWidth: '120px',
            flex: 1,
            fontSize: '1rem',
            padding: '0.5rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        />

        {/* Save and Cancel buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
          <button type="submit" className="btn btn-success" style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.9rem',
            borderRadius: '6px',
            background: 'var(--accent-success)',
            border: '2px solid var(--accent-success)',
            color: 'white',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            whiteSpace: 'nowrap'
          }}>
            <Save size={14} />
          </button>
          
          <button type="button" onClick={onCancel} className="btn-cancel-x" style={{ 
            flexShrink: 0,
            width: '32px',
            height: '32px',
            fontSize: '1rem'
          }}>
            ×
          </button>
        </div>
      </form>
    </div>
  );

  // Helper function for night shift logic
  function shouldShowSecondWorker() {
    // For James/Libby sharing with Ace/Grace for night shifts
    const isNightShift = formData.startTime >= '22:00' || formData.endTime <= '06:00';
    const isJamesOrLibby = participant.code === 'JAM001' || participant.code === 'LIB001';
    return isNightShift && isJamesOrLibby;
  }
};

export default ShiftForm;