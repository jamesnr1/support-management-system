import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Login from './Login';
import WorkerManagement from './WorkerManagement';
import ParticipantSchedule from './ParticipantSchedule';
import HoursTracker from './HoursTracker';
import CalendarAppointments from './CalendarAppointments';
import AIChat from './AIChat';

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
    if (activeTab === 'admin' || activeTab === 'hours') {
      return 0;
    }
    return Math.min(Math.max(calendarHeight, 220), calendarMaxHeight);
  }, [activeTab, calendarHeight, calendarMaxHeight]);

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
      
      // Next A becomes Week A, Next B becomes Week B
      const [nextARes, nextBRes] = await Promise.all([
        axios.get(`${API}/roster/nextA`),
        axios.get(`${API}/roster/nextB`)
      ]);
      
      const nextAData = nextARes.data || {};
      const nextBData = nextBRes.data || {};
      
      // Move Next A/B to Week A/B and clear Next A/B
      await Promise.all([
        axios.post(`${API}/roster/weekA`, nextAData),
        axios.post(`${API}/roster/weekB`, nextBData),
        axios.post(`${API}/roster/nextA`, {}),
        axios.post(`${API}/roster/nextB`, {})
      ]);
      
      // Update last transition timestamp
      localStorage.setItem('lastWeekTransition', new Date().toISOString());
      
      // Refresh data
      queryClient.invalidateQueries(['rosterData']);
      
      console.log('Week transition completed: Next A→Week A, Next B→Week B, Next A/B cleared');
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

  // Fetch roster data (roster + planner)
  const { data: rosterData = {}, isLoading: rosterLoading } = useQuery({
    queryKey: ['rosterData'],
    queryFn: async () => {
      const [roster, planner] = await Promise.all([
        axios.get(`${API}/roster/roster`),
        axios.get(`${API}/roster/planner`)
      ]);
      return {
        roster: roster.data,
        planner: planner.data
      };
    }
  });

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
    { id: 'admin', label: 'Admin', color: '#9A8F85' },
    { id: 'hours', label: 'Hours', color: '#A89080' }
  ];

  const toggleHoursTracker = () => {
    setActiveTab('hours');
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const handleRosterUpdate = (data) => {
    updateRosterMutation.mutate({ weekType: activeTab, data });
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

  // Copy Roster to Planner with week type flip
  const copyToTemplate = async () => {
    // Only allow copying from roster to planner
    if (copyTemplateRunning) return;
    if (activeTab !== 'roster') {
      toast.error('Copy is only available from Roster tab.');
      return;
    }

    setCopyTemplateRunning(true);
    const toastId = toast.loading(`Copying ${sourceWeek} to ${destWeek}...`);

    try {
      // 2. Fetch source data from the API
      const response = await fetch(`${API}/roster/${sourceWeek}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const sourceData = await response.json();

      if (!sourceData || Object.keys(sourceData).length === 0) {
        throw new Error(`No data found in ${sourceWeek} to copy.`);
      }

      // 3. Remap dates to destination week + regenerate shift numbers (timezone-safe)
      // Map static starts aligned with ParticipantSchedule.js (as YYYY-MM-DD strings)
      const weekStartMap = {
        weekA: '2025-09-22',
        weekB: '2025-09-29',
        nextA: '2025-10-06',
        nextB: '2025-10-13'
      };
      
      // Participant code to initial mapping
      const participantInitials = {
        'JAM001': 'J',
        'LIB001': 'L',
        'ACE001': 'A',
        'GRA001': 'G',
        'MIL001': 'M'
      };

      // Calculate day offset between weeks
      const sourceStart = new Date(weekStartMap[sourceWeek] + 'T00:00:00Z');
      const destStart = new Date(weekStartMap[destWeek] + 'T00:00:00Z');
      const offsetDays = Math.round((destStart - sourceStart) / (24 * 60 * 60 * 1000));

      const remappedData = {};
      Object.entries(sourceData).forEach(([participantCode, datesObj]) => {
        const newDatesObj = {};
        Object.entries(datesObj || {}).forEach(([dateKey, shifts]) => {
          // Parse date in UTC to avoid timezone shifts
          const [year, month, day] = dateKey.split('-').map(Number);
          const sourceDate = new Date(Date.UTC(year, month - 1, day));
          const destDate = new Date(sourceDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
          
          // Format as YYYY-MM-DD in UTC
          const newDateKey = destDate.toISOString().split('T')[0];
          
          // Sort shifts by start time before assigning serial numbers
          const sortedShifts = [...(shifts || [])].sort((a, b) => {
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
          });
          
          // Regenerate shift numbers based on new date
          const participantInitial = participantInitials[participantCode] || participantCode[0];
          const dateStr = newDateKey.replace(/-/g, ''); // YYYYMMDD
          
          newDatesObj[newDateKey] = sortedShifts.map((shift, index) => {
            const serialNum = String(index + 1).padStart(2, '0');
            const newShiftNumber = `${participantInitial}${dateStr}${serialNum}`;
            
            return {
              ...shift,
              date: newDateKey,
              id: newShiftNumber,
              shiftNumber: newShiftNumber,
              // Preserve locked status
              locked: shift.locked || false
            };
          });
        });
        remappedData[participantCode] = newDatesObj;
      });

      // 4. Post the remapped data to the destination
      const postResponse = await fetch(`${API}/roster/${destWeek}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remappedData)
      });

      if (!postResponse.ok) {
        const errorText = await postResponse.text();
        throw new Error(`Failed to save copied data: ${postResponse.status} - ${errorText}`);
      }

      // 4. Success - update cache immediately and then ensure refetch completes before switching
      toast.success(`Copied ${sourceWeek} to ${destWeek} successfully!`, { id: toastId });

      // Optimistically set destination week in cache so UI has data instantly
      queryClient.setQueryData(['rosterData'], (prev) => {
        const prevData = prev || {};
        return { ...prevData, [destWeek]: remappedData };
      });

      // Ensure the fresh data is fetched from backend and written to cache
      await queryClient.refetchQueries({ queryKey: ['rosterData'], type: 'active' });

      // Now switch to the destination tab - data is guaranteed present
      setActiveTab(destWeek);
      localStorage.setItem('activeTab', destWeek);

    } catch (error) {
      toast.error(`Copy failed: ${error.message}`, { id: toastId });
    } finally {
      setCopyTemplateRunning(false);
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

      {/* Tab Navigation */}
      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              '--tab-color': tab.color,
              borderBottom: activeTab === tab.id ? `3px solid var(--accent-primary)` : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Fixed Calendar Section - Stays at top while content scrolls */}
      {activeTab !== 'admin' && activeTab !== 'hours' && (
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
            <CalendarAppointments 
              weekType={activeTab} 
              onHeightChange={(height) => setCalendarHeight(height)}
              editMode={editMode}
              onToggleEditMode={toggleEditMode}
              onExportRoster={exportRoster}
              onCopyToTemplate={copyToTemplate}
              copyTemplateRunning={copyTemplateRunning}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="tab-content" style={{ 
        marginTop: activeTab !== 'admin' && activeTab !== 'hours' ? `${calendarTop + effectiveCalendarHeight}px` : `${calendarTop}px` 
      }}>
        {activeTab === 'admin' ? (
          <WorkerManagement
            workers={workers}
            locations={locations}
            onWorkersUpdate={handleForceRefetchWorkers}
          />
        ) : activeTab === 'hours' ? (
          <HoursTracker 
            participants={participants}
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
                    weekType={activeTab}
                    rosterData={rosterData[activeTab]?.[participant.code] || {}}
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