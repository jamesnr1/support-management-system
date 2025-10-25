import React, { useMemo } from 'react';
import { FaUserCheck, FaExclamationTriangle, FaBan } from 'react-icons/fa';
import { 
  calculateWorkerWeeklyHours, 
  getHoursColorCode, 
  formatHours,
  checkWeeklyHourLimit 
} from '../utils/workerHoursCalculation';

/**
 * Enhanced Worker Selection Dropdown
 * Shows visual indicators for worker hours and availability status
 */
const WorkerSelectionDropdown = ({
  workers = [],
  selectedWorkers = [],
  onChange,
  date,
  rosterData,
  editingShift = null,
  shiftDuration = 0,
  unavailableWorkerIds = [],
  multiSelect = false,
  label = "Select Worker",
  placeholder = "Choose a worker...",
  disabled = false
}) => {
  // Get display name from full name (preferred name in brackets or first name)
  const getDisplayName = (fullName) => {
    if (!fullName) return '';
    const match = fullName.match(/\(([^)]+)\)/);
    return match ? match[1] : fullName.split(' ')[0];
  };

  // Calculate worker hours and status
  const workerData = useMemo(() => {
    return workers.map(worker => {
      const weeklyHours = calculateWorkerWeeklyHours(
        worker.id, 
        date, 
        rosterData, 
        editingShift?.id
      );
      
      const hoursCheck = checkWeeklyHourLimit(
        worker,
        date,
        rosterData,
        editingShift,
        selectedWorkers,
        shiftDuration
      );
      
      const { color, status } = getHoursColorCode(
        hoursCheck.projectedHours,
        worker.max_hours
      );
      
      const isUnavailable = unavailableWorkerIds.includes(worker.id);
      const isSelected = selectedWorkers.includes(worker.id);
      
      return {
        ...worker,
        displayName: getDisplayName(worker.full_name),
        weeklyHours,
        projectedHours: hoursCheck.projectedHours,
        maxHours: worker.max_hours,
        hoursColor: color,
        hoursStatus: status,
        isUnavailable,
        isSelected,
        wouldExceed: hoursCheck.wouldExceed
      };
    });
  }, [workers, date, rosterData, editingShift, selectedWorkers, shiftDuration, unavailableWorkerIds]);

  // Sort workers: available first, then by name
  const sortedWorkers = useMemo(() => {
    return [...workerData].sort((a, b) => {
      // Unavailable workers go to bottom
      if (a.isUnavailable && !b.isUnavailable) return 1;
      if (!a.isUnavailable && b.isUnavailable) return -1;
      
      // Workers who would exceed limits go after available workers
      if (a.wouldExceed && !b.wouldExceed) return 1;
      if (!a.wouldExceed && b.wouldExceed) return -1;
      
      // Sort by display name
      return a.displayName.localeCompare(b.displayName);
    });
  }, [workerData]);

  const handleChange = (e) => {
    if (multiSelect) {
      const value = parseInt(e.target.value);
      const isSelected = selectedWorkers.includes(value);
      const newSelection = isSelected
        ? selectedWorkers.filter(id => id !== value)
        : [...selectedWorkers, value];
      onChange(newSelection);
    } else {
      onChange(parseInt(e.target.value) || null);
    }
  };

  const getWorkerIcon = (worker) => {
    if (worker.isUnavailable) {
      return <FaBan style={{ color: '#dc3545', fontSize: '0.85rem' }} />;
    }
    if (worker.wouldExceed) {
      return <FaExclamationTriangle style={{ color: '#ffc107', fontSize: '0.85rem' }} />;
    }
    return <FaUserCheck style={{ color: '#28a745', fontSize: '0.85rem' }} />;
  };

  const getOptionStyle = (worker) => {
    const baseStyle = {
      padding: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    };

    if (worker.isUnavailable) {
      return {
        ...baseStyle,
        backgroundColor: '#f8d7da',
        color: '#721c24',
        cursor: 'not-allowed'
      };
    }

    if (worker.wouldExceed) {
      return {
        ...baseStyle,
        backgroundColor: '#fff3cd',
        color: '#856404'
      };
    }

    return baseStyle;
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '0.5rem', 
        fontWeight: '500',
        color: 'var(--text-primary)'
      }}>
        {label}
      </label>
      
      {multiSelect ? (
        // Multi-select: Show checkboxes
        <div style={{ 
          border: '1px solid var(--border)', 
          borderRadius: '4px', 
          maxHeight: '300px', 
          overflowY: 'auto',
          backgroundColor: 'var(--card-bg)'
        }}>
          {sortedWorkers.map(worker => (
            <label
              key={worker.id}
              style={{
                ...getOptionStyle(worker),
                cursor: worker.isUnavailable ? 'not-allowed' : 'pointer',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <input
                type="checkbox"
                checked={worker.isSelected}
                onChange={() => {
                  if (!worker.isUnavailable) {
                    const newSelection = worker.isSelected
                      ? selectedWorkers.filter(id => id !== worker.id)
                      : [...selectedWorkers, worker.id];
                    onChange(newSelection);
                  }
                }}
                disabled={worker.isUnavailable || disabled}
                style={{ transform: 'scale(1.2)' }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                {getWorkerIcon(worker)}
                
                <span style={{ fontWeight: '500' }}>
                  {worker.displayName}
                </span>
                
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Current hours indicator */}
                  <span style={{ 
                    fontSize: '0.85rem',
                    color: worker.hoursColor,
                    fontWeight: '600'
                  }}>
                    {formatHours(worker.weeklyHours)}h
                  </span>
                  
                  {/* Projected hours after this shift */}
                  {shiftDuration > 0 && worker.isSelected && (
                    <span style={{ 
                      fontSize: '0.85rem',
                      color: worker.hoursColor,
                      fontWeight: '600'
                    }}>
                      → {formatHours(worker.projectedHours)}h
                    </span>
                  )}
                  
                  {/* Max hours */}
                  {worker.maxHours && (
                    <span style={{ 
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      / {worker.maxHours}h
                    </span>
                  )}
                  
                  {/* Warning badges */}
                  {worker.wouldExceed && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '3px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      fontWeight: '600'
                    }}>
                      OVER LIMIT
                    </span>
                  )}
                  
                  {worker.isUnavailable && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '3px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      UNAVAILABLE
                    </span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      ) : (
        // Single select: Traditional dropdown
        <select
          value={selectedWorkers[0] || ''}
          onChange={handleChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '1rem'
          }}
        >
          <option value="">{placeholder}</option>
          {sortedWorkers.map(worker => (
            <option
              key={worker.id}
              value={worker.id}
              disabled={worker.isUnavailable}
              style={{
                color: worker.isUnavailable ? '#999' : 
                       worker.wouldExceed ? '#856404' : 
                       'inherit'
              }}
            >
              {worker.displayName} - {formatHours(worker.weeklyHours)}h
              {worker.maxHours && ` / ${worker.maxHours}h`}
              {worker.wouldExceed && ' ⚠️ OVER'}
              {worker.isUnavailable && ' 🚫 UNAVAILABLE'}
            </option>
          ))}
        </select>
      )}
      
      {/* Summary info */}
      <div style={{ 
        marginTop: '0.5rem', 
        fontSize: '0.8rem', 
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: '1rem'
      }}>
        <span>
          ✅ Available: {sortedWorkers.filter(w => !w.isUnavailable && !w.wouldExceed).length}
        </span>
        <span>
          ⚠️ Over Limit: {sortedWorkers.filter(w => w.wouldExceed).length}
        </span>
        <span>
          🚫 Unavailable: {sortedWorkers.filter(w => w.isUnavailable).length}
        </span>
      </div>
    </div>
  );
};

export default WorkerSelectionDropdown;
