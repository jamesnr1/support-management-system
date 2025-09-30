import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import WorkerManagement from './WorkerManagement';
import ParticipantSchedule from './ParticipantSchedule';
import HoursTracker from './HoursTracker';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RosteringSystem = () => {
  const [activeTab, setActiveTab] = useState('weekA');
  const [editMode, setEditMode] = useState(false);
  const queryClient = useQueryClient();

  // Fetch participants
  const { data: participants = [], isLoading: participantsLoading, error: participantsError } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      console.log('Fetching participants...');
      const response = await axios.get(`${API}/participants`);
      console.log('Participants response:', response.data);
      return response.data;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5
  });

  // Fetch workers
  const { data: workers = [], isLoading: workersLoading, error: workersError } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      console.log('Fetching workers from:', `${API}/workers`);
      try {
        const response = await axios.get(`${API}/workers`, { timeout: 10000 });
        console.log('Workers response success:', response.data.length, 'workers');
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
      console.log('Fetching locations from:', `${API}/locations`);
      try {
        const response = await axios.get(`${API}/locations`, { timeout: 10000 });
        console.log('Locations response success:', response.data.length, 'locations');
        return response.data;
      } catch (error) {
        console.error('Locations fetch error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5
  });

  // Fetch roster data
  const { data: rosterData = {}, isLoading: rosterLoading } = useQuery({
    queryKey: ['roster', activeTab],
    queryFn: async () => {
      const response = await axios.get(`${API}/roster/${activeTab}`);
      return response.data;
    }
  });

  // Update roster mutation
  const updateRosterMutation = useMutation({
    mutationFn: async ({ weekType, data }) => {
      const response = await axios.post(`${API}/roster/${weekType}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roster', activeTab]);
      // Removed redundant toast - shift creation shows its own toast
    },
    onError: (error) => {
      toast.error(`Failed to update roster: ${error.message}`);
    }
  });

  const tabs = [
    { id: 'weekA', label: 'Week A', color: '#D4A574' },
    { id: 'weekB', label: 'Week B', color: '#8B9A7B' },
    { id: 'nextA', label: 'Next A', color: '#C4915C' },
    { id: 'nextB', label: 'Next B', color: '#B87E7E' },
    { id: 'admin', label: 'Admin', color: '#9A8F85' },
    { id: 'hours', label: 'Hours', color: '#A89080' }
  ];

  const toggleHoursTracker = () => {
    setActiveTab('hours');
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    // Removed edit mode notifications per user request
  };

  const handleRosterUpdate = (data) => {
    updateRosterMutation.mutate({ weekType: activeTab, data });
  };

  // Export functionality - Two formats: Payroll and Shift Report
  const exportRoster = async (type) => {
    try {
      const exportType = type === 'payroll';
      
      let csvContent = '';
      let filename = '';
      
      if (exportType) {
        // PAYROLL EXPORT FORMAT
        csvContent = "Worker Name,Participant Name,Shift Date,Start Time,End Time,Total Hours,Location,Support Type,Support Ratio,Funding Code\n";
        filename = `payroll_export_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // SHIFT REPORT EXPORT FORMAT  
        csvContent = "Shift ID,Shift Number,Shift Date,Start Time,End Time,Total Hours,Location,Support Workers,Participants,Support Type,Support Ratio,Shift Category,Status\n";
        filename = `shift_report_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      // Fetch all roster data
      for (const tab of ['weekA', 'weekB', 'nextA', 'nextB']) {
        const response = await axios.get(`${API}/roster/${tab}`);
        const tabData = response.data;
        
        Object.entries(tabData).forEach(([participantCode, participantData]) => {
          const participant = participants.find(p => p.code === participantCode);
          const participantName = participant ? participant.full_name : participantCode;
          
          Object.entries(participantData).forEach(([date, shifts]) => {
            shifts.forEach((shift, index) => {
              const workerNames = shift.workers ? 
                shift.workers.map(id => workers.find(w => w.id === id)?.full_name || `Worker-${id}`).join('; ') : '';
              const locationName = shift.location ? 
                locations.find(l => l.id === shift.location)?.name || `Location-${shift.location}` : '';
              
              // Calculate funding code based on time and day
              const shiftDate = new Date(date);
              const startTime = parseInt(shift.startTime?.split(':')[0] || '9');
              const dayOfWeek = shiftDate.getDay();
              
              let fundingCode = '';
              let shiftCategory = '';
              
              if (dayOfWeek === 6) { // Saturday
                fundingCode = shift.supportType === 'Community Participation' ? 'CPSat' : 'SCSat';
                shiftCategory = 'Saturday';
              } else if (dayOfWeek === 0) { // Sunday
                fundingCode = shift.supportType === 'Community Participation' ? 'CPSun' : 'SCSun';
                shiftCategory = 'Sunday';
              } else if (startTime >= 20 || startTime < 6) { // Night
                fundingCode = shift.supportType === 'Community Participation' ? 'CPWN' : 'SCWN';
                shiftCategory = 'Night';
              } else if (startTime >= 18) { // Evening
                fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWE';
                shiftCategory = 'Evening';
              } else { // Weekday
                fundingCode = shift.supportType === 'Community Participation' ? 'CPWD' : 'SCWD';
                shiftCategory = 'Weekday';
              }
              
              if (exportType) {
                // PAYROLL FORMAT
                csvContent += `"${workerNames}","${participantName}","${date}","${shift.startTime}","${shift.endTime}","${shift.duration || '0'}","${locationName}","${shift.supportType || 'Self-Care'}","${shift.ratio || '1:1'}","${fundingCode}"\n`;
              } else {
                // SHIFT REPORT FORMAT
                const shiftId = `${participantCode}-${date}-${index}`;
                csvContent += `"${shiftId}","${shift.shiftNumber || ''}","${date}","${shift.startTime}","${shift.endTime}","${shift.duration || '0'}","${locationName}","${workerNames}","${participantName}","${shift.supportType || 'Self-Care'}","${shift.ratio || '1:1'}","${shiftCategory}","Scheduled"\n`;
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
      
      toast.success(`${exportType ? 'Payroll' : 'Shift Report'} exported successfully`);
    } catch (error) {
      toast.error('Failed to export roster: ' + error.message);
    }
  };

  // COPY TEMPLATE - Copy Week A and Week B to Next A and Next B
  const copyToTemplate = async () => {
    if (!window.confirm('Copy Week A and Week B schedules to Next A and Next B?')) {
      return;
    }
    
    console.log('COPY TEMPLATE - Starting copy operation');
    
    try {
      // Get fresh data from Week A and Week B
      console.log('Fetching Week A data...');
      const weekAResponse = await axios.get(`${API}/roster/weekA`);
      const weekAData = weekAResponse.data || {};
      
      console.log('Fetching Week B data...');  
      const weekBResponse = await axios.get(`${API}/roster/weekB`);
      const weekBData = weekBResponse.data || {};
      
      console.log('Week A has data for participants:', Object.keys(weekAData));
      console.log('Week B has data for participants:', Object.keys(weekBData));
      
      // Copy Week A data to Next A
      console.log('Copying Week A → Next A');
      await axios.post(`${API}/roster/nextA`, weekAData);
      
      // Copy Week B data to Next B
      console.log('Copying Week B → Next B');
      await axios.post(`${API}/roster/nextB`, weekBData);
      
      console.log('Copy Template completed successfully');
      
      // Show success and reload
      alert(`Copy Template Success!\n\nWeek A (${Object.keys(weekAData).length} participants) → Next A\nWeek B (${Object.keys(weekBData).length} participants) → Next B`);
      
      // Force page reload to show copied data
      window.location.reload();
      
    } catch (error) {
      console.error('Copy Template failed:', error);
      alert('Copy Template failed: ' + error.message);
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
            {activeTab !== 'admin' && (
              <button 
                className={`btn ${editMode ? 'btn-warning' : 'btn-secondary'}`}
                onClick={toggleEditMode}
              >
                {editMode ? '❌ Exit Edit' : '✏️ Edit Mode'}
              </button>
            )}
            <button 
              className="btn btn-secondary"
              onClick={copyToTemplate}
              title="Copy Week A/B to Next A/B"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              📋 Copy Template
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => exportRoster('payroll')}
              title="Export payroll data to CSV"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              📊 Export Payroll
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => exportRoster('shifts')}
              title="Export shift report to CSV"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              📋 Export Shifts
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

      {/* Content Area */}
      <div className="tab-content">
        {activeTab === 'admin' ? (
          <WorkerManagement 
            workers={workers}
            locations={locations}
            onWorkerUpdate={() => queryClient.invalidateQueries(['workers'])}
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
              participants.map(participant => (
                <ParticipantSchedule
                  key={participant.id}
                  participant={participant}
                  weekType={activeTab}
                  rosterData={rosterData}
                  workers={workers || []} // Ensure it's always an array
                  locations={locations || []} // Ensure it's always an array
                  editMode={editMode}
                  onRosterUpdate={handleRosterUpdate}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RosteringSystem;