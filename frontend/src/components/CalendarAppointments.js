import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CalendarAppointments = ({ 
  weekType, 
  weekStartDate,
  weekEndDate,
  onHeightChange,
  editMode,
  onToggleEditMode,
  onExportRoster,
  onCopyToTemplate,
  copyTemplateRunning,
  onRefreshRequest,
  calendarVisible,
  onLastSyncUpdate
}) => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showAppointments, setShowAppointments] = useState(calendarVisible !== undefined ? calendarVisible : true);
  const [authUrl, setAuthUrl] = useState(null);
  const [authCode, setAuthCode] = useState('');
  
  // Sync with parent's visibility control
  useEffect(() => {
    if (calendarVisible !== undefined) {
      setShowAppointments(calendarVisible);
    }
  }, [calendarVisible]);
  
  const [isAuthorizing, setIsAuthorizing] = useState(false);


  // Fetch calendar appointments
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      // Only proceed if we have valid dates
      if (!weekStartDate || !weekEndDate) {
        setIsLoading(false);
        return;
      }
      
      const start = new Date(weekStartDate);
      const end = new Date(weekEndDate);
      // Set proper time for start and end dates
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      const response = await axios.get(`${API}/calendar/appointments`, {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          weekType: weekType,
          _t: Date.now() // Prevent caching
        }
      });
      
      setAppointments(response.data.appointments || []);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Don't show error toast if calendar is just not configured
      if (error.response?.status !== 404) {
        toast.error('Could not load calendar appointments');
      }
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check calendar connection status
  const checkCalendarStatus = async () => {
    try {
      const response = await axios.get(`${API}/calendar/status`);
      if (response.data.connected && weekStartDate && weekEndDate) {
        // Already connected and we have valid dates, try to fetch appointments
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  // Get auth URL for Google Calendar setup
  const getAuthUrl = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await axios.get(`${API}/calendar/auth-url`, {
        params: { redirect_uri: `${backendUrl}/api/calendar/oauth/callback` }
      });
      setAuthUrl(response.data.auth_url);
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.error('Failed to get authorization URL');
    }
  };

  // Open OAuth popup
  const openOAuthPopup = () => {
    if (!authUrl) {
      getAuthUrl().then(() => {
        if (authUrl) {
          openPopup();
        }
      });
    } else {
      openPopup();
    }
  };

  const openPopup = () => {
    const popup = window.open(authUrl, 'oauth', 'width=500,height=600,scrollbars=yes,resizable=yes');
    
    // Listen for messages from the popup
    const messageListener = (event) => {
      if (event.data.type === 'oauth_success') {
        toast.success('Google Calendar connected successfully!');
        popup.close();
        window.removeEventListener('message', messageListener);
        // Refresh appointments
        fetchAppointments();
      } else if (event.data.type === 'oauth_error') {
        toast.error('Authorization failed: ' + event.data.error);
        popup.close();
        window.removeEventListener('message', messageListener);
      }
    };
    
    window.addEventListener('message', messageListener);
    
    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  };

  // Complete OAuth authorization
  const authorizeCalendar = async () => {
    if (!authCode.trim()) {
      toast.error('Please enter the authorization code');
      return;
    }
    
    setIsAuthorizing(true);
    try {
      const response = await axios.post(`${API}/calendar/authorize`, {
        code: authCode.trim(),
        redirect_uri: window.location.origin + '/oauth/callback'
      });
      
      if (response.data.success) {
        toast.success('Google Calendar authorized successfully!');
        setAuthCode('');
        // Refresh appointments
        fetchAppointments();
      }
    } catch (error) {
      console.error('Authorization error:', error);
      const errorMessage = error.response?.data?.detail || error.message;
      
      if (errorMessage.includes('Malformed auth code')) {
        toast.error('Invalid authorization code format. Make sure you copied only the code part (not the entire URL).');
      } else if (errorMessage.includes('invalid_grant')) {
        toast.error('Authorization code expired or invalid. Please try the authorization flow again.');
      } else {
        toast.error('Failed to authorize: ' + errorMessage);
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const groupedAppointments = useMemo(() => {
    const groups = {
      James: [],
      Libby: [],
      Ace: [],
      Grace: [],
      Milan: []
    };

    // Show all appointments for the week - no date filtering
    let filteredAppointments = appointments;

    filteredAppointments.forEach((apt) => {
      // 1) Prefer backend-provided participantCode
      const code = apt.participantCode;
      if (code) {
        const map = { JAM001: 'James', LIB001: 'Libby', ACE001: 'Ace', GRA001: 'Grace', MIL001: 'Milan' };
        const name = map[code];
        if (name && groups[name]) {
          groups[name].push(apt);
          return;
        }
      }

      // 2) Fallback: calendarName contains participant display name
      const calendarName = apt.calendarName || '';
      for (const name of Object.keys(groups)) {
        if (calendarName.toLowerCase().includes(name.toLowerCase())) {
          groups[name].push(apt);
          return;
        }
      }

      // 3) Fallback: title starts with participant name
      const target = Object.keys(groups).find((name) => {
        const summary = apt.summary || '';
        return summary.startsWith(`${name} -`) || 
               summary.startsWith(`${name}:`) || 
               summary.startsWith(`${name},`) ||
               summary === name;
      });
      if (target) {
        groups[target].push(apt);
      }
    });

    return [
      { name: 'James', appointments: groups.James },
      { name: 'Libby', appointments: groups.Libby },
      { name: 'Ace', appointments: groups.Ace },
      { name: 'Grace', appointments: groups.Grace },
      { name: 'Milan', appointments: groups.Milan }
    ];
  }, [appointments, weekType]);

  // Calculate dynamic height based on max appointments per person
  const calculateCalendarHeight = useMemo(() => {
    if (!showAppointments || appointments.length === 0) {
      return 180; // Minimal height when collapsed or empty
    }

    const maxAppointments = groupedAppointments.reduce(
      (max, person) => Math.max(max, person.appointments.length),
      0
    );

    const baseHeight = 120; // header + person header
    const appointmentHeight = 55; // Single line appointments with title and time

    return baseHeight + maxAppointments * appointmentHeight;
  }, [showAppointments, appointments.length, groupedAppointments]);

  // Load appointments on component mount and when week changes
  useEffect(() => {
    checkCalendarStatus();
  }, [weekType, weekStartDate, weekEndDate]);

  // Trigger refresh when parent requests it
  useEffect(() => {
    if (onRefreshRequest > 0) {
      fetchAppointments();
    }
  }, [onRefreshRequest]);
  
  // Report last sync time to parent
  useEffect(() => {
    if (lastSync && onLastSyncUpdate) {
      const timeStr = `${lastSync.getHours().toString().padStart(2, '0')}.${lastSync.getMinutes().toString().padStart(2, '0')}`;
      onLastSyncUpdate(timeStr);
    }
  }, [lastSync, onLastSyncUpdate]);

  // Measure actual rendered height and notify parent precisely
  const rootRef = useRef(null);
  useEffect(() => {
    if (!onHeightChange) return;
    const measure = () => {
      if (rootRef.current) {
        const actual = rootRef.current.scrollHeight || rootRef.current.clientHeight || calculateCalendarHeight;
        onHeightChange(actual);
      }
    };
    measure();
    const handle = setTimeout(measure, 0);
    return () => clearTimeout(handle);
  }, [onHeightChange, calculateCalendarHeight, appointments, showAppointments]);

  // Format date for header range (kept compact: 6th Oct)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const suffix = getOrdinalSuffix(day);
    return `${day}${suffix} ${month}`;
  };

  // Get display name: preferred name in brackets, else first name
  const getDisplayName = (fullName) => {
    if (!fullName) return '';
    const match = fullName.match(/\(([^)]+)\)/);
    if (match && match[1]) return match[1];
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || fullName;
  };

  // Format appointment date like: M 6 October
  const formatShortDayDate = (dateObj) => {
    const dayAbbrevMap = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    const dayLabel = dayAbbrevMap[dateObj.getDay()] || '';
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-AU', { month: 'long' });
    return `${dayLabel} ${day} ${month}`.trim();
  };

  // Format 12h time range with am/pm on end if same half-day
  const formatTimeRange = (startObj, endObj) => {
    const to12 = (d, withPeriod = true) => {
      let h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, '0');
      const period = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      return withPeriod ? `${h}:${m}${period}` : `${h}:${m}`;
    };
    const startPeriod = startObj.getHours() >= 12 ? 'pm' : 'am';
    const endPeriod = endObj.getHours() >= 12 ? 'pm' : 'am';
    if (startPeriod === endPeriod) {
      return `${to12(startObj, false)} – ${to12(endObj, true)}`;
    }
    return `${to12(startObj, true)} – ${to12(endObj, true)}`;
  };
  
  const getOrdinalSuffix = (day) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Format time for display - 24-hour HH.MM format
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}.${minutes}`;
  };

  // Create start and end dates for display purposes
  const start = weekStartDate ? new Date(weekStartDate) : new Date();
  const end = weekEndDate ? new Date(weekEndDate) : new Date();

  return (
    <div ref={rootRef} style={{ background: 'var(--bg-primary)' }}>
      {/* Calendar header removed - controls moved to tab row */}

      {/* Loading State */}
      {isLoading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          color: 'var(--text-secondary)'
        }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          Loading appointments...
        </div>
      )}


      {/* Person Cards - 5 Vertical Cards */}
      {!isLoading && showAppointments && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, minmax(140px, 1fr))',
          gap: '0.6rem',
          marginTop: '0.5rem',
          marginBottom: '0',
          background: 'var(--bg-primary)'
        }}>
          {groupedAppointments.map((person) => (
            <div
              key={person.name}
              className="calendar-card"
            >
              <div className="calendar-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {/* Remove icons; show preferred names (in brackets) or first names */}
                  {['James','Libby','Ace','Grace','Milan'].map(name => name === person.name && getDisplayName(name)).filter(Boolean)}
                </span>
                <span style={{ fontSize: '0.75rem' }}>
                  {formatDate(start.toISOString().split('T')[0])} - {formatDate(end.toISOString().split('T')[0])}
                </span>
              </div>
              
              <div className="calendar-appointments" style={{ padding: '12px' }}>
                {person.appointments.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {person.appointments.map((apt, aptIndex) => {
                      // Desired: Monday, 6 October⋅9:00 – 9:45am.
                      const startObj = apt.start ? new Date(apt.start) : null;
                      const endObj = apt.end ? new Date(apt.end) : null;
                      if (!startObj || !endObj) {
                        return (
                          <li key={apt.id || aptIndex} style={{ marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            {/* Fallback to previous formatting if end missing */}
                            {apt.start ? `${formatShortDayDate(new Date(apt.start))}⋅${formatTime(new Date(apt.start))}` : '—'}
                          </li>
                        );
                      }

                      const appointmentTitle = apt.summary?.replace(`${person.name} - `, '').replace(`${person.name}`, '').trim();
                      const timeLabel = formatTimeRange(startObj, endObj);
                      const description = appointmentTitle || '';
                      const dayAbbrevMap = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
                      const dayAbbrev = dayAbbrevMap[startObj.getDay()] || '';
                      const dayNumber = startObj.getDate();
                      const monthShort = startObj.toLocaleDateString('en-AU', { month: 'short' });
                      const dateText = `${dayNumber}${getOrdinalSuffix(dayNumber)} ${monthShort}`;

                      return (
                        <li
                          key={apt.id || aptIndex}
                          className="appointment-list-item"
                          style={{
                            marginBottom: '4px',
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            columnGap: '0.5rem',
                            alignItems: 'baseline',
                          }}
                        >
                          <span>{dayAbbrev}</span>
                          <div>
                            <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{dateText}</span>
                            <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                              {timeLabel}
                            </span>
                            {description && (
                              <span style={{ marginLeft: '0.25rem' }}>
                                <span style={{ color: 'var(--text-primary)' }}>– </span>
                                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                  {description}
                                </span>
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="no-appointments">
                    No appointments
                        </div>
                      )}
                    </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && showAppointments && appointments.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
            📅 No appointments found
          </div>
          <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            Connect your Google Calendar to see participant schedules here
          </div>
          
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
             <button
               className="btn btn-primary"
               onClick={openOAuthPopup}
               style={{ 
                 display: 'inline-flex', 
                 alignItems: 'center', 
                 gap: '0.5rem',
                 padding: '0.75rem 1.5rem',
                 fontSize: '0.95rem'
               }}
             >
               🔗 Connect Google Calendar
             </button>
             
             <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
               A popup window will open for Google authorization
             </div>
           </div>
        </div>
      )}

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};


export default CalendarAppointments;


