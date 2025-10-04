import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import Login from './Login';
import WorkerManagement from './WorkerManagement';
import ParticipantSchedule from './ParticipantSchedule';
import HoursTracker from './HoursTracker';
import CalendarAppointments from './CalendarAppointments';
import AIChat from './AIChat';
import ShiftsTab from './ShiftsTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RosteringSystem = () => {
  // ===== ALL HOOKS MUST BE AT THE TOP - UNCONDITIONAL =====
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('isAuthenticated') === 'true'
  );

  // Persist activeTab in localStorage to prevent jumping back to roster
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'roster';
  });
  const [editMode, setEditMode] = useState(false);
  const [copyTemplateRunning, setCopyTemplateRunning] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(300); // Dynamic calendar height
  const [calendarTop, setCalendarTop] = useState(130); // Dynamic top below tabs
  const [calendarVisible, setCalendarVisible] = useState(true);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);
  const [lastCalendarUpdate, setLastCalendarUpdate] = useState(null);
  const [selectedPlannerWeek, setSelectedPlannerWeek] = useState('current'); // 'current', 'next', 'after'
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900
  );
  const queryClient = useQueryClient();

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute header + tabs actual height for pixel-perfect positioning
  const fixedTopOffset = 130; // default fallback
  const calendarMaxHeight = useMemo(() => {
    // Use measured viewport minus calendarTop minus small breathing room
    const available = viewportHeight - calendarTop - 12;
    return Math.max(available, 220);
  }, [viewportHeight, calendarTop]);

  const effectiveCalendarHeight = useMemo(() => {
    if (activeTab === 'profiles' || activeTab === 'tracking' || activeTab === 'shifts') {
      return 0;
    }
    // If calendar is hidden, return 0 to collapse it completely
    if (!calendarVisible) {
      return 0;
    }
    return Math.min(Math.max(calendarHeight, 220), calendarMaxHeight);
  }, [activeTab, calendarHeight, calendarMaxHeight, calendarVisible]);

  // Measure the bottom of the tabs to position the calendar flush under them
  useEffect(() => {
    const computeCalendarTop = () => {
      if (typeof window === 'undefined') return;
      const nav = document.querySelector('.tab-nav');
      const header = document.querySelector('.header');
      let topPx = 130;
      if (nav && nav.getBoundingClientRect) {
        const rect = nav.getBoundingClientRect();
        topPx = Math.max(0, Math.round(rect.bottom));
      } else if (header && header.getBoundingClientRect) {
        const rect = header.getBoundingClientRect();
        topPx = Math.max(0, Math.round(rect.bottom));
      }
      setCalendarTop(topPx);
    };
    computeCalendarTop();
    window.addEventListener('resize', computeCalendarTop);
    const id = setInterval(computeCalendarTop, 500); // account for font/layout shifts
    return () => {
      window.removeEventListener('resize', computeCalendarTop);
      clearInterval(id);
    };
  }, []);

  // Week transition logic - every fortnight at 3am
  const checkWeekTransition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
    
    // Check if it's 3am on Monday (day 1)
    if (currentDay === 1 && currentHour === 3 && currentMinute === 0) {
      // Check if it's been 2 weeks since last transition
      const lastTransition = localStorage.getItem('lastWeekTransition');
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      
      if (!lastTransition || new Date(lastTransition) < twoWeeksAgo) {
        performWeekTransition();
      }
    }
  };

  const performWeekTransition = async () => {
    try {
      console.log('Performing week transition at 3am Monday');
      
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
        const response = await axios.get(`${API}/workers`, { timeout: 30000 });
        return response.data;
      } catch (error) {
        console.error('Workers fetch error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5
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

  // Fetch roster data (roster + planner based on selection)
  const { data: rosterData = {}, isLoading: rosterLoading } = useQuery({
    queryKey: ['rosterData', selectedPlannerWeek],
    queryFn: async () => {
      // Map planner week selection to backend endpoint
      const plannerEndpoint = {
        'current': 'planner',        // Use roster as template
        'next': 'planner_next',      // Next week
        'after': 'planner_after'     // Week after
      }[selectedPlannerWeek] || 'planner';

      const [roster, planner] = await Promise.all([
        axios.get(`${API}/roster/roster`),
        axios.get(`${API}/roster/${plannerEndpoint}`)
      ]);
      return {
        roster: roster.data,
        planner: planner.data,
        plannerEndpoint  // Store which endpoint we're using
      };
    }
  });

  // Calculate week date ranges for planner dropdown (based on roster week)
  const plannerWeekRanges = useMemo(() => {
    // Parse date string as LOCAL date (avoid timezone shifts)
    const parseLocalDate = (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    };

    const formatDateRange = (startDate) => {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const formatDate = (d) => {
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = d.getDate();
        return `${month} ${day}`;
      };
      
      return `${formatDate(start)} - ${formatDate(end)}`;
    };

    // Get the roster's start date, or default to current Monday
    let rosterStartDate = rosterData?.roster?.start_date;
    
    if (!rosterStartDate) {
      // Fallback: calculate current Monday
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      rosterStartDate = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    }

    // Base all calculations on roster's week - parse as LOCAL date
    const rosterMonday = parseLocalDate(rosterStartDate);
    
    const nextMonday = new Date(rosterMonday);
    nextMonday.setDate(rosterMonday.getDate() + 7);
    
    const afterMonday = new Date(rosterMonday);
    afterMonday.setDate(rosterMonday.getDate() + 14);

    return {
      current: formatDateRange(rosterMonday),
      next: formatDateRange(nextMonday),
      after: formatDateRange(afterMonday)
    };
  }, [rosterData?.roster?.start_date]);

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
    { id: 'planner', label: 'Planner', color: '#8B9A7B' },
    { id: 'shifts', label: 'Shifts', color: '#9A8F85' },
    { id: 'profiles', label: 'Profiles', color: '#A89080' },
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
    const currentRosterData = rosterData[activeTab]?.data || {};
    const mergedData = {
      ...currentRosterData,
      ...updatedParticipantData  // This will update/add the modified participant's data
    };
    
    // Determine which endpoint to use based on activeTab and planner selection
    let weekType = activeTab;
    if (activeTab === 'planner' && rosterData.plannerEndpoint) {
      weekType = rosterData.plannerEndpoint;  // Use the specific planner endpoint
    }
    
    console.log('handleRosterUpdate - merging participant data into full roster:', {
      activeTab,
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
      const tabData = response.data;
      
      // Participant order (James → Libby → Ace → Grace → Milan)
      const participantOrder = ['JAM001', 'LIB001', 'ACE001', 'GRA001', 'MIL001'];
      
      if (type === 'payroll') {
        // PAYROLL EXPORT - Organized by worker for payroll processing
        csvContent = "Worker Name,Participant,Date,Start Time,End Time,Hours,Location,Support Type,Funding Code,Shift Number\n";
        filename = `payroll_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Collect all worker-shift combinations
        const workerShifts = [];
        
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
              
              const workerIds = shift.workers || [];
              workerIds.forEach(workerId => {
                const worker = workers.find(w => w.id === workerId);
                const workerName = worker ? worker.full_name : `Worker-${workerId}`;
                
                // Calculate funding code
                const shiftDate = new Date(date);
                const startHour = parseInt(shift.startTime?.split(':')[0] || '9');
                const dayOfWeek = shiftDate.getDay();
                let fundingCode = '';
                
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
                
                workerShifts.push({
                  workerName,
                  participantName,
                  date,
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  hours: shift.duration || '0',
                  location: locationName,
                  supportType: shift.supportType || 'Self-Care',
                  fundingCode,
                  shiftNumber: shift.shiftNumber || ''
                });
              });
            });
          });
        });
        
        // Sort by worker name, then date
        workerShifts.sort((a, b) => {
          if (a.workerName !== b.workerName) return a.workerName.localeCompare(b.workerName);
          return a.date.localeCompare(b.date);
        });
        
        // Write CSV rows
        workerShifts.forEach(row => {
          csvContent += `"${row.workerName}","${row.participantName}","${row.date}","${row.startTime}","${row.endTime}","${row.hours}","${row.location}","${row.supportType}","${row.fundingCode}","${row.shiftNumber}"\n`;
        });
        
      } else {
        // SHIFT REPORT EXPORT - Organized by participant (matches import format)
        csvContent = "Participant,Date,Start Time,End Time,Support Worker,Location,Support Type,Ratio,Shift Number,Hours\n";
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
              
              if (workerList.length > 0) {
                workerList.forEach(workerName => {
                  csvContent += `"${participantName}","${date}","${shift.startTime}","${shift.endTime}","${workerName}","${locationName}","${shift.supportType || 'Self-Care'}","${shift.ratio || '1:1'}","${shift.shiftNumber || ''}","${shift.duration || '0'}"\n`;
                });
              } else {
                csvContent += `"${participantName}","${date}","${shift.startTime}","${shift.endTime}","UNASSIGNED","${locationName}","${shift.supportType || 'Self-Care'}","${shift.ratio || '1:1'}","${shift.shiftNumber || ''}","${shift.duration || '0'}"\n`;
              }
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
      const roster = rosterData.roster;
      if (!roster || !roster.data) {
        toast.error('No roster data to copy', { id: toastId });
        return;
      }

      // Determine which planner endpoint to save to
      const plannerEndpoint = {
        'current': 'planner',
        'next': 'planner_next',
        'after': 'planner_after'
      }[selectedPlannerWeek] || 'planner';

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

  // Toggle Week Pattern in Planner
  const toggleWeekPattern = async (newWeekType) => {
    if (activeTab !== 'planner') return;
    
    try {
      const currentPlanner = rosterData.planner;
      if (!currentPlanner) {
        toast.error('No planner data to update');
        return;
      }

      // Update the week_type
      const updatedPlanner = {
        ...currentPlanner,
        week_type: newWeekType
      };

      // Save to backend
      await axios.post(`${API}/roster/planner`, updatedPlanner);
      
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
      <header className="header">
        <div className="header-top">
          <div>
            <h1 className="header-title">Support Management System</h1>
            {(workersLoading || locationsLoading) && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {workersLoading && 'Loading workers... '}
                {locationsLoading && 'Loading locations... '}
              </div>
            )}
          </div>
          <div className="header-controls">
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                background: '#B87E7E',
                color: '#E8DDD4',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#A86E6E'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#B87E7E'}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation + Action Buttons (Same Row) */}
      <nav className="tab-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                '--tab-color': tab.color,
                borderBottom: activeTab === tab.id ? `1px solid #8B9A7B` : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Action Buttons (Roster/Planner only) */}
        {(activeTab === 'roster' || activeTab === 'planner') && (
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: '2rem', marginRight: 'auto', alignItems: 'center', flex: 1 }}>
            {/* Planner Week Selector Dropdown */}
            {activeTab === 'planner' && (
              <>
                <span style={{ color: '#8B9A7B', fontSize: '0.9rem', marginRight: '0.4rem' }}>
                  Planning:
                </span>
                <select
                  value={selectedPlannerWeek}
                  onChange={(e) => {
                    setSelectedPlannerWeek(e.target.value);
                    // Re-fetch roster data with new selection
                    queryClient.invalidateQueries(['rosterData']);
                    
                    const weekLabel = {
                      'current': 'Current Week (template from Roster)',
                      'next': 'Next Week',
                      'after': 'Week After'
                    }[e.target.value];
                    toast(`Planning for: ${weekLabel}`);
                  }}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    background: '#3E3B37',
                    color: '#E8DDD4',
                    border: '1px solid #8B9A7B',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value="current">Current Week ({plannerWeekRanges.current})</option>
                  <option value="next">Next Week ({plannerWeekRanges.next})</option>
                  <option value="after">Week After ({plannerWeekRanges.after})</option>
                </select>
                <span style={{ margin: '0 0.75rem', color: '#4A4641' }}>|</span>
              </>
            )}
            
            {/* Week Pattern Selector for Planner */}
            {activeTab === 'planner' && rosterData.planner?.week_type && (
              <>
                <span style={{ color: '#8B9A7B', fontSize: '0.9rem', marginRight: '0.4rem' }}>
                  Week:
                </span>
                <button
                  onClick={() => toggleWeekPattern('weekA')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.9rem',
                    background: rosterData.planner.week_type === 'weekA' ? '#8B9A7B' : '#3E3B37',
                    color: '#E8DDD4',
                    border: '1px solid ' + (rosterData.planner.week_type === 'weekA' ? '#8B9A7B' : '#4A4641'),
                    borderRadius: '4px',
                    fontWeight: rosterData.planner.week_type === 'weekA' ? '600' : '500',
                    cursor: 'pointer'
                  }}
                >
                  A
                </button>
                <button
                  onClick={() => toggleWeekPattern('weekB')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.9rem',
                    background: rosterData.planner.week_type === 'weekB' ? '#8B9A7B' : '#3E3B37',
                    color: '#E8DDD4',
                    border: '1px solid ' + (rosterData.planner.week_type === 'weekB' ? '#8B9A7B' : '#4A4641'),
                    borderRadius: '4px',
                    fontWeight: rosterData.planner.week_type === 'weekB' ? '600' : '500',
                    cursor: 'pointer'
                  }}
                >
                  B
                </button>
                <span style={{ color: '#8B9A7B', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                  {rosterData.planner.week_type === 'weekA' 
                    ? '(Libby shared support)' 
                    : '(James shared support)'}
                </span>
                <span style={{ margin: '0 0.75rem', color: '#4A4641' }}>|</span>
              </>
            )}
            
            <button
              className={`btn ${editMode ? 'btn-warning' : 'btn-secondary'}`}
              onClick={toggleEditMode}
              style={{ 
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                background: editMode ? '#C4915C' : '#3E3B37',
                color: '#E8DDD4',
                border: '2px solid ' + (editMode ? '#C4915C' : '#4A4641'),
                borderRadius: '6px',
                fontWeight: editMode ? '600' : '500'
              }}
              title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            >
              {editMode ? '✖️ Exit' : '✏️ Edit'}
            </button>
            {activeTab === 'planner' && (
              <button
                className="btn btn-success"
                onClick={copyToTemplate}
                disabled={copyTemplateRunning}
                style={{ 
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  background: '#8B9A7B',
                  color: '#E8DDD4',
                  border: '2px solid #8B9A7B',
                  borderRadius: '6px'
                }}
                title="Load current roster as template"
              >
                📋 Copy
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => exportRoster('payroll')}
              style={{ 
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                background: '#D4A574',
                color: '#2D2B28',
                border: '2px solid #D4A574',
                borderRadius: '6px',
                fontWeight: '600'
              }}
              title="Export payroll CSV"
            >
              💰 Payroll
            </button>
            <button
              className="btn btn-primary"
              onClick={() => exportRoster('shifts')}
              style={{ 
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                background: '#D4A574',
                color: '#2D2B28',
                border: '2px solid #D4A574',
                borderRadius: '6px',
                fontWeight: '600'
              }}
              title="Export shift report CSV"
            >
              📄 Shifts
            </button>
          </div>
        )}
        
        {/* Calendar Controls (Roster/Planner only) */}
        {(activeTab === 'roster' || activeTab === 'planner') && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.85rem', color: '#8B9A7B', marginRight: '0.3rem' }}>
              {lastCalendarUpdate && `Updated ${lastCalendarUpdate}`}
            </span>
            <button
              onClick={() => setCalendarRefreshTrigger(prev => prev + 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.9rem',
                background: '#3E3B37',
                color: '#E8DDD4',
                border: '1px solid #4A4641',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title="Refresh calendar"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={() => setCalendarVisible(!calendarVisible)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.9rem',
                background: '#3E3B37',
                color: '#E8DDD4',
                border: '1px solid #4A4641',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={calendarVisible ? 'Hide calendar' : 'Show calendar'}
            >
              {calendarVisible ? '📅 Calendar' : '📅 Calendar'}
            </button>
          </div>
        )}
      </nav>

      {/* Fixed Calendar Section - Stays at top while content scrolls */}
      {activeTab !== 'profiles' && activeTab !== 'tracking' && activeTab !== 'shifts' && (
        <div style={{
          position: 'fixed',
          top: `${calendarTop}px`,
          left: '0',
          right: '0',
          zIndex: 1002,
          background: 'var(--bg-primary)',
          height: `${effectiveCalendarHeight}px`,
          overflowY: calendarHeight > calendarMaxHeight ? 'auto' : 'visible',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          borderBottom: '1px solid var(--border-primary)'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bg-primary)'
          }} />
          <div style={{
            position: 'relative',
            height: '100%',
            padding: '0.75rem 1.5rem'
          }}>
            {/* Week Pattern moved to tab row */}

            <CalendarAppointments 
              weekType={activeTab} 
              onHeightChange={(height) => setCalendarHeight(height)}
              editMode={editMode}
              onToggleEditMode={toggleEditMode}
              onExportRoster={exportRoster}
              onCopyToTemplate={copyToTemplate}
              copyTemplateRunning={copyTemplateRunning}
              onRefreshRequest={calendarRefreshTrigger}
              calendarVisible={calendarVisible}
              onLastSyncUpdate={(time) => setLastCalendarUpdate(time)}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="tab-content" style={{ 
        marginTop: (activeTab === 'profiles' || activeTab === 'tracking' || activeTab === 'shifts') ? `${calendarTop}px` : `${calendarTop + effectiveCalendarHeight}px`,
        paddingTop: (activeTab === 'profiles' || activeTab === 'tracking' || activeTab === 'shifts') ? '1.5rem' : '2.5rem',
        minHeight: '200px' // Prevent content from being too close to top
      }}>
        {activeTab === 'profiles' ? (
          <WorkerManagement
            workers={workers}
            locations={locations}
            onWorkersUpdate={handleForceRefetchWorkers}
          />
        ) : activeTab === 'tracking' ? (
          <HoursTracker 
            participants={participants}
            workers={workers}
            rosterData={rosterData}
          />
        ) : activeTab === 'shifts' ? (
          <ShiftsTab 
            workers={workers}
            rosterData={rosterData}
          />
        ) : (
          <>
            {rosterLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                Loading roster data...
              </div>
            ) : (
              <>
                {/* Participant Schedules */}
                {(() => {
                  // Custom participant order: James, Libby, Ace, Grace, Milan
                  const participantOrder = ['JAM001', 'LIB001', 'ACE001', 'GRA001', 'MIL001'];
                  const sortedParticipants = [...participants].sort((a, b) => {
                    const aIndex = participantOrder.indexOf(a.code);
                    const bIndex = participantOrder.indexOf(b.code);
                    // If not in custom order, put at end
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                  });
                  return sortedParticipants;
                })().map(participant => (
                  <ParticipantSchedule
                    key={participant.id}
                    participant={participant}
                    weekType={rosterData[activeTab]?.week_type || 'weekA'}
                    rosterData={rosterData[activeTab]?.data?.[participant.code] || {}}
                    fullRosterData={rosterData[activeTab]?.data || {}}  // Full roster for ShiftForm hours calculation
                    workers={workers || []} // Ensure it's always an array
                    locations={locations || []} // Ensure it's always an array
                    editMode={editMode}
                    onRosterUpdate={handleRosterUpdate}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* AI Chat - Always visible floating button */}
      <AIChat />
    </div>
  );
};

export default RosteringSystem;