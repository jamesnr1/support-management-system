import React, { useState, useMemo } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ShiftsTab = ({ workers, rosterData }) => {
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [telegramMessage, setTelegramMessage] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [sendToAll, setSendToAll] = useState(false);

  // Calculate week date ranges
  const getWeekRange = (weekType) => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday (0), go back 6 days
    
    let startDate;
    if (weekType === 'current') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToMonday);
    } else if (weekType === 'next') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToMonday + 7);
    } else { // week_after
      startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToMonday + 14);
    }
    
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getWeekRange(selectedWeek);

  // Organize shifts by worker
  const workerShifts = useMemo(() => {
    if (!rosterData || !workers) return {};
    
    const shifts = {};
    
    // Get the appropriate roster data (roster or planner based on selected week)
    const dataSource = selectedWeek === 'current' ? rosterData.roster?.data : rosterData.planner?.data;
    
    if (!dataSource) return {};
    
    // Iterate through all participants and their shifts
    Object.keys(dataSource).forEach(participantCode => {
      const participantShifts = dataSource[participantCode];
      
      Object.keys(participantShifts).forEach(date => {
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);
        
        // Check if this date is in the selected week range
        if (dateObj >= startDate && dateObj <= endDate) {
          const dayShifts = participantShifts[date];
          
          if (Array.isArray(dayShifts)) {
            dayShifts.forEach(shift => {
              const workerIds = shift.workers || [];
              
              workerIds.forEach(workerId => {
                if (!shifts[workerId]) {
                  shifts[workerId] = [];
                }
                
                shifts[workerId].push({
                  date,
                  day: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                  participant: participantCode,
                  startTime: shift.start_time,
                  endTime: shift.end_time,
                  hours: shift.duration || 0
                });
              });
            });
          }
        }
      });
    });
    
    return shifts;
  }, [rosterData, selectedWeek, startDate, endDate, workers]);

  // Calculate total hours for each worker
  const workerTotalHours = useMemo(() => {
    const totals = {};
    Object.keys(workerShifts).forEach(workerId => {
      const total = workerShifts[workerId].reduce((sum, shift) => sum + (shift.hours || 0), 0);
      totals[workerId] = total;
    });
    return totals;
  }, [workerShifts]);

  // Get workers who have shifts in the selected week
  const workersWithShifts = useMemo(() => {
    return workers?.filter(w => workerShifts[w.id] && workerShifts[w.id].length > 0) || [];
  }, [workers, workerShifts]);

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  // Telegram handlers
  const handleWorkerSelection = (workerId, isChecked) => {
    const newSelected = new Set(selectedWorkers);
    if (isChecked) {
      newSelected.add(workerId);
    } else {
      newSelected.delete(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const handleSendTelegramMessage = async () => {
    if (!telegramMessage.trim()) return;
    
    try {
      const workersToSend = sendToAll 
        ? workersWithShifts.filter(w => w.telegram).map(w => w.id)
        : Array.from(selectedWorkers);
      
      await axios.post(`${API}/telegram/send`, {
        message: telegramMessage,
        worker_ids: workersToSend
      });
      
      alert('Message sent successfully! ✅');
      setTelegramMessage('');
      setSelectedWorkers(new Set());
      setSendToAll(false);
    } catch (error) {
      console.error('Error sending telegram message:', error);
      alert('❌ Failed to send message: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleClearTelegramMessage = () => {
    setTelegramMessage('');
    setSelectedWorkers(new Set());
    setSendToAll(false);
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Week Selector */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
          Week:
        </label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          <option value="current">Current Week ({startDate.toLocaleDateString()} - {endDate.toLocaleDateString()})</option>
          <option value="next">Next Week</option>
          <option value="week_after">Week After</option>
        </select>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {workersWithShifts.length} worker{workersWithShifts.length !== 1 ? 's' : ''} with shifts
        </span>
      </div>

      {/* Main layout: Worker shift cards on left, Telegram panel on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left side: Worker shift cards */}
        <div>
          {workersWithShifts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
              No shifts assigned for this week
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {workersWithShifts.map(worker => (
                <div
                  key={worker.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '8px',
                    padding: '1rem',
                    minHeight: '200px'
                  }}
                >
                  {/* Worker name and total hours */}
                  <div style={{ 
                    marginBottom: '1rem', 
                    paddingBottom: '0.75rem', 
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h4 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                      {worker.full_name}
                    </h4>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>{workerTotalHours[worker.id]?.toFixed(1) || 0}h</strong> / {worker.max_hours}h
                    </div>
                  </div>

                  {/* Shifts list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {workerShifts[worker.id]?.map((shift, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'var(--bg-tertiary)',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {shift.day}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {shift.participant}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)} ({shift.hours.toFixed(1)}h)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Telegram messaging panel */}
        <div className="telegram-panel" style={{ 
          background: 'linear-gradient(135deg, #3E3B37, #3E3B37)',
          border: '2px solid #D4A574',
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
          padding: '0',
          position: 'sticky',
          top: '1rem',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: '#4A4641',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #2D2B28'
          }}>
            <h4 style={{ 
              margin: 0, 
              color: '#D4A574', 
              fontSize: '1.2rem',
              fontWeight: '600',
              textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              💬 Telegram Messaging
            </h4>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem' }}>
            
            {/* Message composition area */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '500', color: '#E8DDD4' }}>
                Message
              </label>
              <textarea
                value={telegramMessage}
                onChange={(e) => setTelegramMessage(e.target.value)}
                placeholder="Type your message here..."
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #4A4641',
                  background: '#2D2B28',
                  color: '#E8DDD4',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Worker selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '500', color: '#E8DDD4' }}>
                Send to
              </label>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #4A4641', 
                borderRadius: '4px',
                background: '#2D2B28'
              }}>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid #4A4641' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', fontWeight: '500', color: '#E8DDD4' }}>
                    <input 
                      type="checkbox" 
                      checked={sendToAll}
                      onChange={(e) => setSendToAll(e.target.checked)}
                      style={{ transform: 'scale(1.2)' }} 
                    />
                    📢 All Workers ({workersWithShifts?.filter(w => w.telegram).length || 0} with Telegram)
                  </label>
                </div>
                {!sendToAll && workersWithShifts?.filter(w => w.telegram).map(worker => (
                  <div key={worker.id} style={{ padding: '0.75rem', borderBottom: '1px solid #4A4641' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', color: '#E8DDD4' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedWorkers.has(worker.id)}
                        onChange={(e) => handleWorkerSelection(worker.id, e.target.checked)}
                        style={{ transform: 'scale(1.2)' }} 
                      />
                      {worker.full_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleSendTelegramMessage}
                disabled={!telegramMessage.trim() || (!sendToAll && selectedWorkers.size === 0)}
                className="btn btn-primary"
                style={{ 
                  flex: '1', 
                  fontSize: '1rem', 
                  padding: '0.85rem',
                  background: (!telegramMessage.trim() || (!sendToAll && selectedWorkers.size === 0)) ? '#6B6B6B' : '#D4A574',
                  color: '#2D2B28',
                  border: '2px solid #D4A574',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: (!telegramMessage.trim() || (!sendToAll && selectedWorkers.size === 0)) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#C4915C';
                    e.currentTarget.style.borderColor = '#C4915C';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 165, 116, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#D4A574';
                    e.currentTarget.style.borderColor = '#D4A574';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                📤 Send Message
              </button>
              <button 
                onClick={handleClearTelegramMessage}
                className="btn btn-secondary"
                style={{ 
                  fontSize: '1.1rem', 
                  padding: '0.85rem',
                  background: '#3E3B37',
                  color: '#E8DDD4',
                  border: '2px solid #4A4641',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4A4641';
                  e.currentTarget.style.borderColor = '#8B9A7B';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3E3B37';
                  e.currentTarget.style.borderColor = '#4A4641';
                }}
                title="Clear message"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShiftsTab;

