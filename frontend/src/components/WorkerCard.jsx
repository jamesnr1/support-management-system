import React from 'react';
import { Edit, Calendar } from 'lucide-react';

const WorkerCard = ({ worker, onEdit, onManageAvailability, availabilityData, isLoading }) => {
  // Use prop data instead of fetching - eliminates 48 API calls!
  const availability = availabilityData?.availability || [];
  const unavailability = availabilityData?.unavailability || [];

  // Check if currently unavailable
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentUnavailability = (unavailability || []).find(period => {
    const fromDate = new Date(period.from_date);
    const toDate = new Date(period.to_date);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(0, 0, 0, 0);
    return today >= fromDate && today <= toDate;
  });

  // Group availability by day (weekday 1=Monday, 2=Tuesday, etc.)
  const availabilityByDay = {};
  for (const rule of (availability || [])) {
    if (!availabilityByDay[rule.weekday]) {
      availabilityByDay[rule.weekday] = [];
    }
    availabilityByDay[rule.weekday].push(rule);
  }

  // Day abbreviations starting from Monday (1) to match backend weekday numbers
  const days = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];
  const dayIndexMap = {
    M: 1,
    T: 2,
    W: 3,
    Th: 4,
    F: 5,
    Sa: 6,
    Su: 0,
  };

  // Extract display name (preferred name in brackets or first name)
  const getDisplayName = (fullName) => {
    if (!fullName) return '';
    // Check for preferred name in brackets: "FirstName LastName (PreferredName)"
    const match = fullName.match(/\(([^)]+)\)/);
    if (match) {
      return match[1]; // Return preferred name
    }
    // Otherwise, return first name only
    return fullName.split(' ')[0];
  };

  // Format time as HH.MM (24-hour format)
  const formatTime = (timeString) => {
    if (!timeString) return '09.00';
    // Handle HH:MM:SS or HH:MM format
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1].padStart(2, '0');
      return `${hours}.${minutes}`;
    }
    return timeString; // Fallback to original if format unexpected
  };

  // Get gender icon
  const getGenderIcon = (sex) => {
    switch (sex) {
      case 'M': return '👨';
      case 'F': return '👩';
      case 'O': return '👤';
      default: return '';
    }
  };

  // Get car icon
  const getCarIcon = (car) => {
    return car === 'Yes' ? '🚗' : '';
  };

  // Get telegram icon
  const getTelegramIcon = (telegram) => {
    return telegram ? '💬' : '';
  };

  return (
    <div className="worker-card" style={{ minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
      {/* Worker Name with Icons */}
      <div className="worker-header">
        <div className="worker-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{getDisplayName(worker.full_name)}</span>
          <span style={{ display: 'flex', gap: '0.3rem', fontSize: '0.9em', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
            {getGenderIcon(worker.sex)}
            {getCarIcon(worker.car)}
            {getTelegramIcon(worker.telegram)}
          </span>
          <span style={{ fontSize: '0.8em', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
            {worker.max_hours}h
          </span>
        </div>
      </div>

      <div className="worker-content" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Availability Schedule Box */}
        <div style={{
          background: '#4A4641',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '0.75rem',
          margin: '0.75rem 0',
          fontSize: '0.85rem',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column'
        }}>
        {isLoading ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>
        ) : currentUnavailability ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <strong>Unavailable:</strong> {new Date(currentUnavailability.from_date).toLocaleDateString()} - {new Date(currentUnavailability.to_date).toLocaleDateString()}
          </div>
        ) : (
          <div>
            <h5 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>Weekly Availability</h5>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {days.map(day => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: '500' }}>{day}:</span>
                  <div>
                    {availabilityByDay[dayIndexMap[day]] ? (
                      availabilityByDay[dayIndexMap[day]].map((rule, index) => (
                        <div key={index}>
                          {rule.is_full_day ? 'All Day' : `${formatTime(rule.from_time)} - ${formatTime(rule.to_time)}`}
                        </div>
                      ))
                    ) : 'Not available'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Action Buttons */}
        <div className="worker-actions">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onEdit(worker)}
              style={{ background: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
            >
              <Edit size={14} /> Edit
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={() => onManageAvailability(worker)}
              style={{ background: 'var(--accent-success)', color: 'white' }}
            >
              <Calendar size={14} /> Availability
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerCard;

