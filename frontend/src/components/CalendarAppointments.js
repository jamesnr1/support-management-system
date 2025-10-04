import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Calendar as CalendarIcon, RefreshCw, ExternalLink } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CalendarAppointments = ({ 
  weekType, 
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

  // Get the week dates for the current week type
  const getWeekRange = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Adjust dates based on week type
    if (weekType === 'weekA') {
      monday.setDate(monday.getDate() - 7);  // Last week
    } else if (weekType === 'nextA') {
      monday.setDate(monday.getDate() + 7);  // Next week
    } else if (weekType === 'nextB') {
      monday.setDate(monday.getDate() + 14); // Week after next
    }
    // weekB uses current week (no offset)
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  };

  // Fetch calendar appointments
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getWeekRange();
      
      const response = await axios.get(`${API}/calendar/appointments`, {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          weekType: weekType
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
      if (response.data.connected) {
        // Already connected, try to fetch appointments
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

    // Filter appointments based on tab
    let filteredAppointments = appointments;
    
    // For Roster tab, only show appointments from today onwards
    if (weekType === 'roster') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.start || apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today;
      });
    }
    // For Planner and other tabs, show all appointments

    filteredAppointments.forEach((apt) => {
      const target = Object.keys(groups).find((name) => apt.summary?.includes(name));
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
  }, [weekType]);
  
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

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display - 24-hour HH.MM format
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}.${minutes}`;
  };

  const { start, end } = getWeekRange();

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
              style={{
                background: 'linear-gradient(135deg, #3E3B37, #3E3B37)',
                border: '2px solid #D4A574',
                borderRadius: '12px',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'default',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 165, 116, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
              }}
            >
              {/* Person Header - Compact single row */}
              <div style={{
                background: '#4A4641',
                padding: '0.5rem 1rem',
                borderBottom: '1px solid #4A4641',
                color: '#E8DDD4',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <span style={{ color: '#D4A574', fontWeight: '600', fontSize: '0.9rem', textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
                  {person.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#8B9A7B' }}>
                  {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Appointments List */}
              <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {person.appointments.length > 0 ? (
                  person.appointments.map((apt, aptIndex) => {
                    // Format: "Date, Time - Appointment"
                    const appointmentTitle = apt.summary?.replace(`${person.name} - `, '').replace(`${person.name}`, '') || 'Untitled';
                    const dateStr = apt.start ? new Date(apt.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                    const timeStr = apt.start ? formatTime(apt.start) : '';
                    
                    return (
                      <div key={apt.id || aptIndex} style={{
                        padding: '0.4rem 0.5rem',
                        background: '#4A4641',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        color: '#E8DDD4',
                        lineHeight: '1.3',
                        border: '1px solid #2D2B28'
                      }}>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: '#D4A574', fontWeight: '500' }}>
                            {dateStr}, {timeStr}
                          </span>
                          <span style={{ color: '#E8DDD4', fontWeight: '400' }}>
                            {' - '}{appointmentTitle}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', color: '#9AAA89', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>
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


