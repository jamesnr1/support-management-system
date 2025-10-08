import React from 'react';
import { Trash2 } from 'lucide-react';

const WorkerCard = React.memo(({ worker, onEdit, onManageAvailability, onDelete, availabilityData, isLoading, customAvailabilityDisplay, customAvailabilityDateRange }) => {
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

  // Format time as 12-hour format (e.g., "9:00 AM", "2:30 PM")
  const formatTime = (timeString) => {
    if (!timeString) return '9:00 AM';
    // Handle HH:MM:SS or HH:MM format
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert 0 to 12, and 13-23 to 1-11
      return `${hours}:${minutes} ${ampm}`;
    }
    return timeString; // Fallback to original if format unexpected
  };

  // Get gender badge text
  const getGenderBadge = (sex) => {
    switch (sex) {
      case 'M': return 'M';
      case 'F': return 'F';
      case 'O': return 'Other';
      default: return '';
    }
  };

  // Get car badge text
  const getCarBadge = (car) => {
    return car === 'Yes' ? 'C' : '';
  };

  // Get telegram badge text
  const getTelegramBadge = (telegram) => {
    return telegram ? 'TG' : '';
  };

  return (
    <div 
      className="worker-card" 
      style={{ 
        position: 'relative',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '8px'
      }}
    >

      {/* Worker Header - Exact match to calendar cards */}
    <div
      className="worker-header"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--hover-bg)',
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: '18px',
        fontWeight: '600',
        color: 'var(--accent)'
      }}
    >
        {/* Left side container for name and all badges. This will grow. */}
        <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <span 
                className="worker-name" 
                style={{ 
                  color: 'var(--accent)', 
                  fontWeight: '600',
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                }}
                title={worker.full_name}
              >
                {getDisplayName(worker.full_name)}
              </span>
              {/* Badges group restored */}
              <div className="worker-icons" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {getCarBadge(worker.car) && (
                  <span className="worker-badge">{getCarBadge(worker.car)}</span>
                )}
                {getTelegramBadge(worker.telegram) && (
                  <span className="worker-badge">{getTelegramBadge(worker.telegram)}</span>
                )}
                <span className="worker-status" style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '10px', fontWeight: 500 }}>{worker.shift_hours || 0}h</span>
              </div>
        </div>
        
        {/* Right side for the delete button. This will not grow or shrink. */}
        {onDelete && (
          <div style={{ flex: '0 0 auto' }}>
            <button
              className="delete-btn"
              style={{ 
                padding: '8px',
                lineHeight: 0
              }} 
              onClick={() => {
                if (window.confirm(`Delete ${worker.full_name}?`)) {
                  onDelete(worker);
                }
              }}
              title={`Delete ${worker.full_name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Availability Section - Exact match to calendar appointments */}
      <div 
        className="availability" 
        style={{ 
          padding: '12px'
        }}
      >
        {isLoading ? (
          <p>Loading...</p>
        ) : customAvailabilityDisplay ? (
          <ul>
            {Array.isArray(customAvailabilityDisplay) ? (
              customAvailabilityDisplay.map((shift, index) => (
                <li key={index} style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{shift}</li>
              ))
            ) : (
              <li style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{customAvailabilityDisplay}</li>
            )}
            {customAvailabilityDateRange && (
              <li style={{ color: 'var(--text-secondary)' }}>
                {customAvailabilityDateRange}
              </li>
            )}
          </ul>
        ) : currentUnavailability ? (
          <ul>
            <li style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Unavailable</li>
            <li style={{ color: 'var(--text-secondary)' }}>
              {new Date(currentUnavailability.from_date).toLocaleDateString()} - {new Date(currentUnavailability.to_date).toLocaleDateString()}
            </li>
          </ul>
        ) : (
          <ul>
            {days.flatMap(day => {
              const dayData = availabilityByDay[dayIndexMap[day]];
              if (!dayData || dayData.length === 0) return [];
              
              // Display each time range as a separate list item
              return dayData.map((rule, index) => {
                const timeRange = rule.is_full_day ? 'All Day' : `${formatTime(rule.from_time)} - ${formatTime(rule.to_time)}`;
                return (
                  <li key={`${day}-${index}`}>
                    {day}: {timeRange}
                  </li>
                );
              });
            })}
          </ul>
        )}
      </div>

      {/* Action Buttons - Edit and Availability */}
      <div className="worker-actions">
        <button onClick={() => onEdit(worker)}>Edit</button>
        <button onClick={() => onManageAvailability(worker)}>Availability</button>
      </div>
    </div>
  );
});

export default WorkerCard;

