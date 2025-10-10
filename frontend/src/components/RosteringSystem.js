import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Login from './Login';
import WorkerManagement from './WorkerManagement';
import ParticipantSchedule from './ParticipantSchedule';
import HoursTracker from './HoursTracker';
import AppointmentForm from './AppointmentForm';
import CalendarAppointments from './CalendarAppointments';
import AIChat from './AIChat';
import ShiftsTab from './ShiftsTab';
import StaffTab from './StaffTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RosteringSystem = () => {
  // ===== ALL HOOKS MUST BE AT THE TOP - UNCONDITIONAL =====
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('isAuthenticated') === 'true'
  );

  // Appointment form state
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);

  // Persist activeTab in localStorage to prevent jumping back to roster
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'roster';
  });
  const [editMode, setEditMode] = useState(false);
  const [copyTemplateRunning, setCopyTemplateRunning] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(300);
  const [calendarVisible, setCalendarVisible] = useState(true);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);
  const [lastCalendarUpdate, setLastCalendarUpdate] = useState(null);
  const [selectedRosterWeek, setSelectedRosterWeek] = useState('current'); // 'current', 'next', 'after'
  const queryClient = useQueryClient();

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);


  // Week transition logic - every week at 3am on Sunday
  const checkWeekTransition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
    
    // Check if it's 3am on Sunday (day 0)
    if (currentDay === 0 && currentHour === 3 && currentMinute === 0) {
      // Check if it's been 1 week since last transition
      const lastTransition = localStorage.getItem('lastWeekTransition');
      const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      if (!lastTransition || new Date(lastTransition) < oneWeekAgo) {
        performWeekTransition();
      }
    }
  };

  const performWeekTransition = async () => {
    try {
      console.log('Performing week transition at 3am Sunday');
      
      // Call backend to transition planner to roster
      await axios.post(`${API}/roster/transition_to_roster`);
      
      // Update last transition timestamp
      localStorage.setItem('lastWeekTransition', new Date().toISOString());
      
      // Refresh data
      queryClient.invalidateQueries(['rosterData']);
      
      console.log('Week transition completed: Planner → Roster');
    } catch (error) {
      console.error('Error during week transition:', error);
    }
  };

  // Check for week transition on component mount and every minute
  useEffect(() => {
    checkWeekTransition();
    const interval = setInterval(checkWeekTransition, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Helper function for CSV names
  const getCSVName = (fullName) => {
    if (!fullName) return '';
    return fullName.replace(/\s*\([^)]+\)\s*/g, ' ').trim(); // Remove parentheses and content
  };

  // Fetch participants
  const { data: participants = [], isLoading: participantsLoading, error: participantsError } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const response = await axios.get(`${API}/participants`);
      return response.data;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5
  });

  // Fetch workers
  const { data: workers = [], isLoading: workersLoading, error: workersError } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      try {
        console.log('Fetching workers from API...');
        const response = await axios.get(`${API}/workers?_t=${Date.now()}`, { 
          timeout: 30000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log(`Fetched ${response.data.length} workers`);
        return response.data;
      } catch (error) {
        console.error('Workers fetch error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true
  });

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await axios.get(`${API}/locations`, { timeout: 30000 });
        return response.data;
      } catch (error) {
        console.error('Locations fetch error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5
  });

  // Fetch roster data based on selected week with fallback logic
  const { data: rosterData = {}, isLoading: rosterLoading } = useQuery({
    queryKey: ['rosterData', selectedRosterWeek],
    queryFn: async () => {
      // Map week selection to backend endpoint
      const weekEndpoint = {
        'current': 'roster',         // Current week
        'next': 'roster_next',       // Next week  
        'after': 'roster_after'      // Week after
      }[selectedRosterWeek] || 'roster';

      try {
        // Try to get data for the selected week
        const response = await axios.get(`${API}/roster/${weekEndpoint}`);
        const weekData = response.data;
        
        // Check if this week has actual shift data
        const hasShiftData = weekData?.data && Object.values(weekData.data).some(participantData => 
          Object.values(participantData).some(dayShifts => 
            Array.isArray(dayShifts) && dayShifts.length > 0
          )
        );

        // If selected week has no shift data and it's not current week, try to get previous week's data as fallback
        if (!hasShiftData && selectedRosterWeek !== 'current') {
          console.log(`No shift data found for ${selectedRosterWeek} week, trying to get previous week's data as fallback`);
          
          // For next week, fallback to current week (roster)
          // For week after, fallback to next week (roster_next)
          const fallbackEndpoint = selectedRosterWeek === 'next' ? 'roster' : 'roster_next';
          
          try {
            const fallbackResponse = await axios.get(`${API}/roster/${fallbackEndpoint}`);
            const fallbackData = fallbackResponse.data;
            
            // Check if fallback week has data
            const fallbackHasData = fallbackData?.data && Object.values(fallbackData.data).some(participantData => 
              Object.values(participantData).some(dayShifts => 
                Array.isArray(dayShifts) && dayShifts.length > 0
              )
            );

            if (fallbackHasData) {
              console.log(`Using fallback data from ${fallbackEndpoint} for ${selectedRosterWeek} week`);
              // Show toast notification about fallback data
              toast(`Showing ${fallbackEndpoint === 'roster' ? 'current' : 'next'} week's data as starting point for ${selectedRosterWeek} week`, {
                duration: 4000,
                style: {
                  background: 'var(--accent)',
                  color: 'white'
                }
              });
              // Use fallback shifts data but keep the correct dates for the selected week
              return {
                current: {
                  week_type: fallbackData.week_type,
                  data: fallbackData.data,  // Use previous week's shift data
                  start_date: weekData.start_date,  // But use next week's dates
                  end_date: weekData.end_date
                },
                weekEndpoint,
                isUsingFallback: true,
                fallbackFrom: fallbackEndpoint
              };
            }
          } catch (fallbackError) {
            console.log('Fallback data fetch failed:', fallbackError);
          }
        }

        return {
          current: weekData,
          weekEndpoint,
          isUsingFallback: false
        };
      } catch (error) {
        console.error(`Error fetching data for ${weekEndpoint}:`, error);
        throw error;
      }
    }
  });

  // Calculate week date ranges for planner dropdown (based on TODAY)
  const plannerWeekRanges = useMemo(() => {
    const formatDateRange = (monday) => {
      const start = new Date(monday);
      const end = new Date(monday);
      end.setDate(start.getDate() + 6);
      
      const formatDate = (d) => {
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = d.getDate();
        return `${day}${getOrdinalSuffix(day)} ${month}`;
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
      
      return `${formatDate(start)} - ${formatDate(end)}`;
    };

    // Get Monday of current week using milliseconds (more reliable)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to subtract to get to Monday
    
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - daysFromMonday);
    currentMonday.setHours(0, 0, 0, 0);
    
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(currentMonday.getDate() + 7);
    
    const afterMonday = new Date(currentMonday);
    afterMonday.setDate(currentMonday.getDate() + 14);

    return {
      current: { label: formatDateRange(currentMonday), startDate: currentMonday },
      next: { label: formatDateRange(nextMonday), startDate: nextMonday },
      after: { label: formatDateRange(afterMonday), startDate: afterMonday }
    };
  }, [selectedRosterWeek]); // Recalculate when week changes
  
  // Get the actual start date for the selected planner week
  const plannerWeekStartDate = useMemo(() => {
    const weekData = {
      'current': plannerWeekRanges.current?.startDate,
      'next': plannerWeekRanges.next?.startDate,
      'after': plannerWeekRanges.after?.startDate
    }[selectedRosterWeek];
    
    return weekData || new Date();
  }, [selectedRosterWeek, plannerWeekRanges]);

  // Update roster mutation
  const updateRosterMutation = useMutation({
    mutationFn: async ({ weekType, data }) => {
      const response = await axios.post(`${API}/roster/${weekType}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rosterData']);
      // Removed redundant toast - shift creation shows its own toast
    },
    onError: (error) => {
      toast.error(`Failed to update roster: ${error.message}`);
    }
  });

  // This is the new function that will be passed down to WorkerManagement
  // It provides a way for the child component to tell this parent component
  // to refetch the workers data.
  const handleForceRefetchWorkers = () => {
    queryClient.invalidateQueries(['workers']);
  };

  const tabs = [
    { id: 'roster', label: 'Roster', color: '#D4A574' },
    { id: 'staff', label: 'Staff', color: '#9A8F85' },
    { id: 'tracking', label: 'Tracking', color: '#B89A8A' }
  ];

  const toggleHoursTracker = () => {
    setActiveTab('tracking');
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const handleRosterUpdate = (updatedParticipantData) => {
    // CRITICAL: Merge updated participant data with existing full roster data
    // ParticipantSchedule only sends ONE participant's data, but backend expects FULL roster
    const currentRosterData = rosterData.current?.data || {};
    const mergedData = {
      ...currentRosterData,
      ...updatedParticipantData  // This will update/add the modified participant's data
    };
    
    // Use the correct endpoint - if using fallback, save to the intended week endpoint
    const weekType = rosterData.weekEndpoint || 'roster';
    
    console.log('handleRosterUpdate - merging participant data into full roster:', {
      selectedRosterWeek,
      weekType,
      participantCodes: Object.keys(updatedParticipantData),
      beforeCount: Object.keys(currentRosterData).length,
      afterCount: Object.keys(mergedData).length
    });
    
    updateRosterMutation.mutate({ weekType, data: mergedData });
  };

  // Export functionality - Two different formats
  const exportRoster = async (type) => {
    try {
      let csvContent = '';
      let filename = '';
      
      // Fetch roster data for active tab only
      const response = await axios.get(`${API}/roster/${activeTab}`);
      const tabData = response.data.data || response.data; // Handle nested data structure
      
      // Participant order (James → Libby → Ace → Grace → Milan)
      const participantOrder = ['JAM001', 'LIB001', 'ACE001', 'GRA001', 'MIL001'];
      
      if (type === 'payroll') {
        // PAYROLL EXPORT - Organized by date for payroll processing
        csvContent = "Day,Date,Participant Name,Start Time,End Time,Hours,Workers,Location,Funding Code\n";
        filename = `payroll_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Collect all shifts with grouped workers
        const allShifts = [];
        
        participantOrder.forEach(participantCode => {
          if (!tabData[participantCode]) return;
          
          const participant = participants.find(p => p.code === participantCode);
          const participantName = participant ? participant.full_name : participantCode;
          const participantData = tabData[participantCode];
          
          Object.keys(participantData).sort().forEach(date => {
            const shifts = participantData[date];
            shifts.forEach(shift => {
              const locationName = shift.location ? 
                locations.find(l => l.id === shift.location)?.name || '' : '';
              
              // Get all worker names for this shift
              const workerIds = shift.workers || [];
              const workerNames = workerIds.map(workerId => {
                const worker = workers.find(w => w.id === workerId);
                return worker ? worker.full_name : `Worker-${workerId}`;
              });
              const workersList = workerNames.length > 0 ? workerNames.join(', ') : 'UNASSIGNED';
                
                // Calculate funding code
                const shiftDate = new Date(date);
                const startHour = parseInt(shift.startTime?.split(':')[0] || '9');
                const dayOfWeek = shiftDate.getDay();
                let fundingCode = '';
              
              // Get day name
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayName = dayNames[dayOfWeek];
                
                if (dayOfWeek === 6) {
                  fundingCode = shift.supportType === 'Community Participation' ? 'CPSat' : 'SCSat';
                } else if (dayOfWeek === 0) {
                  fundingCode = shift.supportType === 'Community Participation' ? 'CPSun' : 'SCSun';
                } else if (startHour >= 20 || startHour < 6) {
                  fundingCode = shift.supportType === 'Community Participation' ? 'CPWN' : 'SCWN';
                } else if (startHour >= 18) {
                  fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWE';
                } else {
                  fundingCode = shift.supportType === 'Community Participation' ? 'CPWD' : 'SCWD';
                }
                
              allShifts.push({
                day: dayName,
                date,
                  participantName,
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  hours: shift.duration || '0',
                workers: workersList,
                  location: locationName,
                fundingCode
              });
            });
          });
        });
        
        // Sort by date first, then participant, then start time (grouped by participant per day)
        allShifts.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          if (a.participantName !== b.participantName) return a.participantName.localeCompare(b.participantName);
          return a.startTime.localeCompare(b.startTime);
        });
        
        // Write CSV rows
        allShifts.forEach(row => {
          csvContent += `"${row.day}","${row.date}","${row.participantName}","${row.startTime}","${row.endTime}","${row.hours}","${row.workers}","${row.location}","${row.fundingCode}"\n`;
        });
        
      } else {
        // SHIFT REPORT EXPORT - Organized by participant (matches import format)
        csvContent = "Shift Number,Day,Date,Participant,Start Time,End Time,Ratio,Workers,Support Type,Location\n";
        filename = `shift_report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        
        participantOrder.forEach(participantCode => {
          if (!tabData[participantCode]) return;
          
          const participant = participants.find(p => p.code === participantCode);
          const participantName = participant ? participant.full_name : participantCode;
          const participantData = tabData[participantCode];
          
          Object.keys(participantData).sort().forEach(date => {
            const shifts = participantData[date];
            
            shifts.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).forEach(shift => {
              const locationName = shift.location ? 
                locations.find(l => l.id === shift.location)?.name || '' : '';
              
              const workerIds = shift.workers || [];
              const workerList = workerIds.map(id => 
                workers.find(w => w.id === id)?.full_name || `Worker-${id}`
              );
              
              // Get day name
              const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
              
              // Combine all workers into one string
              const workersString = workerList.length > 0 ? workerList.join(' + ') : 'UNASSIGNED';
              
              csvContent += `"${shift.shiftNumber || ''}","${dayName}","${date}","${participantName}","${shift.startTime}","${shift.endTime}","${shift.ratio || '1:1'}","${workersString}","${shift.supportType || 'Self-Care'}","${locationName}"\n`;
            });
          });
        });
      }
      
      // Create downloadable CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', filename);
      linkElement.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${type === 'payroll' ? 'Payroll' : 'Shift Report'} exported successfully`);
    } catch (error) {
      toast.error('Failed to export roster: ' + error.message);
    }
  };

  // Copy Roster to Planner (from Planner tab, loads roster as template)
  const copyToTemplate = async () => {
    // Only allow copying when in planner tab
    if (copyTemplateRunning) return;
    if (activeTab !== 'planner') {
      toast.error('Copy is only available from Planner tab.');
      return;
    }

    setCopyTemplateRunning(true);
    const toastId = toast.loading(`Loading Roster as template...`);

    try {
      // Get current roster data
      const roster = rosterData.current;
      if (!roster || !roster.data) {
        toast.error('No roster data to copy', { id: toastId });
        return;
      }

      // Determine which planner endpoint to save to based on selected week
      const plannerEndpoint = {
        'next': 'planner_next',
        'after': 'planner_after'
      }[selectedRosterWeek] || 'planner_next';

      // Deep copy roster data to selected planner week
      const rosterCopy = JSON.parse(JSON.stringify(roster.data));
      
      // Save to selected planner week
      await axios.post(`${API}/roster/${plannerEndpoint}`, {
        week_type: roster.week_type,
        start_date: roster.start_date,
        end_date: roster.end_date,
        data: rosterCopy
      });
      
      toast.success('Roster loaded as template!', { id: toastId });
      
      // Refetch roster data to show the copied data
      await queryClient.refetchQueries({ queryKey: ['rosterData'], type: 'active' });

    } catch (error) {
      toast.error(`Copy failed: ${error.message}`, { id: toastId });
    } finally {
      setCopyTemplateRunning(false);
    }
  };

  // Toggle Week Pattern (Week A/Week B)
  const toggleWeekPattern = async (newWeekType) => {
    if (activeTab !== 'roster') return;
    
    try {
      const currentRoster = rosterData.current;
      if (!currentRoster) {
        toast.error('No roster data to update');
        return;
      }

      // Update the week_type
      const updatedRoster = {
        ...currentRoster,
        week_type: newWeekType
      };

      // Save to backend - use the correct endpoint based on selectedRosterWeek
      const weekEndpoint = rosterData.weekEndpoint || 'roster';
      
      await axios.post(`${API}/roster/${weekEndpoint}`, updatedRoster);
      
      // Refetch data
      await queryClient.refetchQueries({ queryKey: ['rosterData'], type: 'active' });
      
      toast.success(`Switched to Week ${newWeekType === 'weekA' ? 'A' : 'B'} Pattern`);
    } catch (error) {
      toast.error(`Failed to change week pattern: ${error.message}`);
    }
  };

  // Show loading only if participants aren't ready - we can proceed with just participants
  if (participantsLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading participants...
      </div>
    );
  }

  // Show error if participants failed to load
  if (participantsError) {
    return (
      <div className="error">
        Failed to load participants: {participantsError.message}
      </div>
    );
  }

  // ===== AUTHENTICATION HANDLERS =====
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Support Management System</h2>
        
        {/* Add Appointment Button */}
        <button
          onClick={() => {
            setIsAppointmentFormOpen(true);
          }}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            transition: 'all 0.2s',
            stroke: 'white',
            strokeWidth: '2.5'
          }}
          title="Add Appointment"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="12" y1="14" x2="12" y2="18"/>
            <line x1="8" y1="16" x2="16" y2="16"/>
          </svg>
        </button>
      </header>

      {/* Tab Navigation */}
      <nav className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        
        {/* Action Buttons (Roster and Staff tabs) */}
        {(activeTab === 'roster' || activeTab === 'staff') && (
          <div className="action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'nowrap', marginLeft: '0' }}>
            {/* Week Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Week:</span>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={selectedRosterWeek}
                  onChange={(e) => {
                    setSelectedRosterWeek(e.target.value);
                    queryClient.invalidateQueries(['rosterData']);
                    const weekLabel = {
                      'current': 'Current Week',
                      'next': 'Next Week',
                      'after': 'Week After'
                    }[e.target.value];
                    toast(`Viewing: ${weekLabel}`);
                  }}
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '9999px',
                    padding: '0.25rem 1.6rem 0.25rem 0.9rem',
                    minHeight: '32px',
                    lineHeight: '1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  <option value="current">Current</option>
                  <option value="next">Next</option>
                  <option value="after">After</option>
                </select>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)', fontSize: '10px' }}>▾</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                {plannerWeekRanges[selectedRosterWeek]?.label}
              </span>
            </div>

            {/* Week Pattern Selector - Roster tab only */}
            {activeTab === 'roster' && rosterData.current?.week_type && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Pattern:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={() => toggleWeekPattern('weekA')}
                    style={{
                      background: rosterData.current.week_type === 'weekA' ? 'var(--accent)' : 'var(--bg-primary)',
                      color: rosterData.current.week_type === 'weekA' ? 'white' : 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: 0
                    }}
                  >
                    A
                  </button>
                  <button
                    onClick={() => toggleWeekPattern('weekB')}
                    style={{
                      background: rosterData.current.week_type === 'weekB' ? 'var(--accent)' : 'var(--bg-primary)',
                      color: rosterData.current.week_type === 'weekB' ? 'white' : 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: 0
                    }}
                  >
                    B
                  </button>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {rosterData.current.week_type === 'weekA' ? 'Libby' : 'James'}
                </span>
              </div>
            )}
            
            {/* Edit Mode button - Roster tab only */}
            {activeTab === 'roster' && (
              <button 
                onClick={toggleEditMode}
                title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        )}
        
        {/* Action Icons - Always Visible */}
        <div className="action-icons" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          {activeTab === 'roster' && (
            <>
              {lastCalendarUpdate && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lastCalendarUpdate}</span>}
              <button
                onClick={() => setCalendarRefreshTrigger(prev => prev + 1)}
                title="Refresh calendar"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
              <button 
                onClick={() => setCalendarVisible(!calendarVisible)}
                title={calendarVisible ? 'Hide Calendar' : 'Show Calendar'}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
            </>
          )}
          
          {activeTab === 'roster' && (
            <>
              <button 
                onClick={() => exportRoster('payroll')}
                title="Export payroll CSV"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </button>
              <button
                onClick={() => exportRoster('shifts')}
                title="Export shifts CSV"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </button>
            </>
          )}
          
          {activeTab === 'staff' && (
            <button 
              onClick={() => {
                // Trigger Add Worker modal in StaffTab
                document.dispatchEvent(new CustomEvent('openAddWorkerModal'));
              }}
              title="Add Worker"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                minHeight: '40px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </button>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('isAuthenticated');
              setIsAuthenticated(false);
            }}
            title="Logout"
            style={{ 
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.5rem',
              minWidth: '40px',
              minHeight: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </nav>

      <div className="main-layout-container">
      {/* Content Area */}
        <div id="main-content" className="tab-content" role="main" aria-label="Main content area">
          {activeTab === 'staff' ? (
            <StaffTab 
            workers={workers}
            locations={locations}
              onWorkersUpdate={handleForceRefetchWorkers}
              rosterData={rosterData}
              participants={participants}
              selectedWeek={selectedRosterWeek}
          />
          ) : activeTab === 'tracking' ? (
          <HoursTracker 
            participants={participants}
            workers={workers}
            rosterData={rosterData}
          />
        ) : (
          <div className="roster-planner-view">
            {/* Calendar Section */}
            {calendarVisible && rosterData.current?.start_date && rosterData.current?.end_date && (
              <CalendarAppointments
                weekType={selectedRosterWeek}
                weekStartDate={rosterData.current.start_date}
                weekEndDate={rosterData.current.end_date}
                onRefreshRequest={calendarRefreshTrigger}
                onLastSyncUpdate={(time) => setLastCalendarUpdate(time)}
              />
            )}

            {/* Participant Schedules */}
            {rosterLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                Loading roster data...
              </div>
            ) : (
              <div className="participant-schedules-list">
                {[...participants].sort((a, b) => {
                  // Custom participant order: James, Libby, Ace, Grace, Milan
                  const participantOrder = ['JAM001', 'LIB001', 'ACE001', 'GRA001', 'MIL001'];
                    const aIndex = participantOrder.indexOf(a.code);
                    const bIndex = participantOrder.indexOf(b.code);
                    // If not in custom order, put at end
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                }).map(participant => (
                  <ParticipantSchedule
                    key={participant.id}
                    participant={participant}
                      weekType={rosterData.current?.week_type || 'weekA'}
                      weekStartDate={rosterData.current?.start_date || null}  // Use actual start date from backend
                      weekEndDate={rosterData.current?.end_date || null}      // Use actual end date from backend
                      rosterData={rosterData.current?.data?.[participant.code] || {}}
                      fullRosterData={rosterData.current?.data || {}}  // Full roster for ShiftForm hours calculation
                    workers={workers || []} // Ensure it's always an array
                    locations={locations || []} // Ensure it's always an array
                    editMode={editMode}
                    onRosterUpdate={handleRosterUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* AI Chat - Always visible floating button */}
      <AIChat />

      {/* Appointment Form Modal */}
      <AppointmentForm 
        isOpen={isAppointmentFormOpen}
        onClose={() => setIsAppointmentFormOpen(false)}
        participants={participants || []}
      />
    </div>
  );
};

export default RosteringSystem;