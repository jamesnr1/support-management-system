import React, { useState, useMemo } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Calendar Appointment Form Component
const CalendarAppointmentForm = () => {
  const [formData, setFormData] = useState({
    calendar_id: '',
    summary: '',
    description: '',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    attendees: []
  });
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch available calendars
  const fetchCalendars = async () => {
    try {
      const response = await axios.get(`${API}/calendar/list`);
      if (response.data.success) {
        setCalendars(response.data.calendars);
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
      setMessage('Error fetching calendars. Make sure Google Calendar is connected.');
    }
  };

  // Load calendars on component mount
  React.useEffect(() => {
    fetchCalendars();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Combine date and time for start and end
      const startDateTime = `${formData.start_date}T${formData.start_time}:00`;
      const endDateTime = `${formData.end_date}T${formData.end_time}:00`;

      const eventData = {
        calendar_id: formData.calendar_id,
        summary: formData.summary,
        description: formData.description,
        location: formData.location,
        start: startDateTime,
        end: endDateTime,
        attendees: formData.attendees.filter(email => email.trim())
      };

      const response = await axios.post(`${API}/calendar/events`, eventData);
      
      if (response.data.success) {
        setMessage('✅ Appointment created successfully in Google Calendar!');
        setFormData({
          calendar_id: '',
          summary: '',
          description: '',
          location: '',
          start_date: '',
          start_time: '',
          end_date: '',
          end_time: '',
          attendees: []
        });
      } else {
        setMessage('❌ Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      setMessage('❌ Error creating appointment: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const addAttendee = () => {
    setFormData(prev => ({ ...prev, attendees: [...prev.attendees, ''] }));
  };

  const updateAttendee = (index, email) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.map((addr, i) => i === index ? email : addr)
    }));
  };

  const removeAttendee = (index) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index)
    }));
  };

  // Filter participant calendars (James, Libby, Ace, Grace, Milan)
  const participantCalendars = calendars.filter(cal => 
    ['James', 'Libby', 'Ace', 'Grace', 'Milan'].some(name => 
      cal.summary && cal.summary.includes(name)
    )
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Calendar Selection */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Participant Calendar
        </label>
        <select
          value={formData.calendar_id}
          onChange={(e) => handleInputChange('calendar_id', e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem'
          }}
        >
          <option value="">Select a participant calendar...</option>
          {participantCalendars.map(cal => (
            <option key={cal.id} value={cal.id}>
              {cal.summary}
            </option>
          ))}
        </select>
      </div>

      {/* Appointment Title */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Appointment Title
        </label>
        <input
          type="text"
          value={formData.summary}
          onChange={(e) => handleInputChange('summary', e.target.value)}
          placeholder="e.g., Speech Therapy, Doctor Appointment, etc."
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem'
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Shift details, notes, etc."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Location */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Location
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          placeholder="e.g., Glandore, SA"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem'
          }}
        />
      </div>

      {/* Date and Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Start Date
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Start Time
          </label>
          <input
            type="time"
            value={formData.start_time}
            onChange={(e) => handleInputChange('start_time', e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
            End Date
          </label>
          <input
            type="date"
            value={formData.end_date}
            onChange={(e) => handleInputChange('end_date', e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
            End Time
          </label>
          <input
            type="time"
            value={formData.end_time}
            onChange={(e) => handleInputChange('end_time', e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      {/* Attendees */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Attendees (Email addresses)
        </label>
        {formData.attendees.map((email, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => updateAttendee(index, e.target.value)}
              placeholder="worker@example.com"
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
            />
            <button
              type="button"
              onClick={() => removeAttendee(index)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addAttendee}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          + Add Attendee
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          background: message.includes('✅') ? 'var(--success-bg)' : 'var(--error-bg)',
          color: message.includes('✅') ? 'var(--success-text)' : 'var(--error-text)',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          background: loading ? 'var(--bg-secondary)' : 'var(--accent)',
          color: 'white',
          fontSize: '0.95rem',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Creating Shift...' : 'Create Calendar Shift'}
      </button>
    </form>
  );
};

const ShiftsTab = ({ workers, participants = [], rosterData, locations = [] }) => {
  const getDisplayName = (fullName = '') => {
    if (!fullName) return '';
    const match = fullName.match(/\(([^)]+)\)/);
    if (match && match[1]) return match[1];
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || fullName;
  };

  const getLocationName = (locationId) => {
    if (!locationId) return 'No Location';
    const location = locations.find(l => String(l.id) === String(locationId));
    return location ? location.name : `Location ${locationId}`;
  };
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [telegramMessage, setTelegramMessage] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [sendToAll, setSendToAll] = useState(false);

  // Calculate week date ranges for all three weeks
  const weekRanges = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const calculateRange = (offset) => {
      const start = new Date(today);
      start.setDate(today.getDate() - daysToMonday + offset);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      return {
        startDate: start,
        endDate: end,
        label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      };
    };
    
    return {
      current: calculateRange(0),
      next: calculateRange(7),
      week_after: calculateRange(14)
    };
  }, []);

  const { startDate, endDate } = weekRanges[selectedWeek];

  const participantLookup = useMemo(() => {
    const lookup = {};
    (participants || []).forEach(participant => {
      lookup[participant.code] = participant.full_name;
    });
    return lookup;
  }, [participants]);

  // Organize shifts by worker
  const workerShifts = useMemo(() => {
    
    if (!rosterData || !workers) return {};

    const shifts = {};

    // Use the data from the currently selected week in the Roster tab
    let dataSource = rosterData.data;
    
    if (!dataSource) return {};

    const participantLookup = (workers || []).reduce((acc, worker) => {
      acc[worker.id] = worker;
      return acc;
    }, {});

    Object.entries(dataSource).forEach(([participantCode, participantShifts]) => {
      Object.entries(participantShifts).forEach(([date, dayShifts]) => {
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);

        if (dateObj >= startDate && dateObj <= endDate && Array.isArray(dayShifts)) {
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
              startTime: shift.start_time || shift.startTime,
              endTime: shift.end_time || shift.endTime,
              hours: shift.duration || 0
            });
            });
          });
        }
      });
    });

    // Sort shifts by time for each worker
    Object.keys(shifts).forEach(workerId => {
      shifts[workerId].sort((a, b) => {
        // Convert time strings to minutes for comparison
        const timeToMinutes = (timeStr) => {
          if (!timeStr) return 0;
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        // First sort by date
        if (a.date !== b.date) {
          return new Date(a.date) - new Date(b.date);
        }
        
        // Then sort by start time
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
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

  const getWorkerMaxHours = (workerId) => {
    const workerInfo = workers?.find(w => w.id === workerId);
    return workerInfo?.max_hours ?? 48;
  };

  // Format hours display with color coding
  const formatWorkerHours = (hours) => {
    const roundedHours = Math.round(hours * 10) / 10; // Round to 1 decimal
    let color = "#28a745"; // Green for normal
    
    if (hours >= 50) {
      color = "#dc3545"; // Red for over weekly limit
    } else if (hours >= 12) {
      color = "#ffc107"; // Yellow for daily limit
    }
    
    return { hours: roundedHours, color };
  };

  // Get workers who have shifts in the selected week
  const workersWithShifts = useMemo(() => {
    const result = workers?.filter(w => workerShifts[w.id] && workerShifts[w.id].length > 0) || [];
    return result;
  }, [workers, workerShifts]);
  
  // Filter workers who have telegram (for the messaging panel) 
  const workersWithTelegram = useMemo(() => {
    return workers?.filter(w => w.telegram) || [];
  }, [workers]);

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
        ? workersWithTelegram.map(w => w.id)
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
        <label style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Week:
        </label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <option value="current">Current Week ({weekRanges.current.label})</option>
          <option value="next">Next Week ({weekRanges.next.label})</option>
          <option value="week_after">Week After ({weekRanges.week_after.label})</option>
        </select>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {workersWithShifts.length} worker{workersWithShifts.length !== 1 ? 's' : ''} with shifts
        </span>
      </div>

      {/* Main layout: Worker shift cards on left, Telegram panel on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left side: Worker shift cards */}
        <div>
          {workersWithShifts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
              No shifts assigned for this week
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {workersWithShifts.map(worker => (
                <div
                  key={worker.id}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '220px'
                  }}
                >
                  {/* Worker Header - Exact match to calendar cards */}
                  <div 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--hover-bg)',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'var(--accent)'
                    }}
                  >
                    <span style={{ color: 'var(--accent)' }}>
                      {getDisplayName(worker.full_name)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: formatWorkerHours(workerTotalHours[worker.id] || 0).color, fontWeight: '600' }}>
                        {formatWorkerHours(workerTotalHours[worker.id] || 0).hours}h
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}> / {getWorkerMaxHours(worker.id)}h</span>
                    </span>
                  </div>

                  {/* Shifts Section - Exact match to calendar appointments */}
                  <div 
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '8px'
                    }}
                  >
                    <div>
                      {Array.isArray(workerShifts[worker.id]) ? workerShifts[worker.id].map((shift, index) => {
                        const dayAbbrev = shift.day ? shift.day.charAt(0) : '';
                        const participantFullName = participantLookup[shift.participant] || shift.participant;
                        const participantName = getDisplayName(participantFullName);
                        return (
                          <div key={index} style={{ 
                            marginBottom: '4px', 
                            color: 'var(--text-secondary)', 
                            fontSize: '14px',
                            display: 'block'
                          }}>
                            {dayAbbrev} - {participantName} - {shift.startTime}-{shift.endTime} - {getLocationName(shift.location)}
                          </div>
                        );
                      }) : <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No shifts</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Telegram messaging panel */}
        <div className="telegram-panel" style={{ 
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 2px 4px var(--shadow)',
          padding: '0',
          position: 'sticky',
          top: '1rem',
          overflow: 'hidden',
          maxHeight: '600px'
        }}>
          {/* Header - Consistent with calendar cards */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--hover-bg)'
          }}>
            <span style={{ 
              color: 'var(--accent)', 
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Telegram
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Messaging
            </span>
          </div>

          {/* Content - Consistent with calendar appointments */}
          <div style={{ padding: '12px' }}>
            
            {/* Message composition area */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
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
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              />
            </div>

            {/* Worker selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Send to
              </label>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid var(--border)', 
                borderRadius: '8px',
                background: 'var(--card-bg)'
              }}>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={sendToAll}
                      onChange={(e) => setSendToAll(e.target.checked)}
                      style={{ transform: 'scale(1.1)', cursor: 'pointer' }} 
                    />
                    All Workers ({workersWithTelegram.length} with Telegram)
                  </label>
                </div>
                {!sendToAll && workersWithTelegram.map(worker => (
                  <div key={worker.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedWorkers.has(worker.id)}
                        onChange={(e) => handleWorkerSelection(worker.id, e.target.checked)}
                        style={{ transform: 'scale(1.1)', cursor: 'pointer' }} 
                      />
                      {getDisplayName(worker.full_name)}
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
                style={{ 
                  flex: '1', 
                  fontSize: '14px', 
                  padding: '8px 15px',
                  borderRadius: '25px',
                  background: (!sendToAll && selectedWorkers.size === 0) ? 'var(--bg-secondary)' : 'var(--accent)',
                  color: (!sendToAll && selectedWorkers.size === 0) ? 'var(--text-secondary)' : 'white',
                  border: 'none',
                  cursor: (!telegramMessage.trim() || (!sendToAll && selectedWorkers.size === 0)) ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Shift Creation Window */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '12px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)'
          }}>
            <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              📅 Add Calendar Appointment
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Create appointments in Google Calendar
            </span>
          </div>

          {/* Content */}
          <div style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
            <CalendarAppointmentForm />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShiftsTab;

