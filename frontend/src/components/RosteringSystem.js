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
  const exportRoster = async () => {
    try {
      // Ask user which format they want
      const choice = prompt('Choose export format:\n1 = Payroll Export\n2 = Shift Report Export\n\nEnter 1 or 2:');
      if (!choice || (choice !== '1' && choice !== '2')) {
        toast.info('Export cancelled');
        return;
      }
      const exportType = choice === '1';
      
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

  // Template copying function - Clean version
  const copyToTemplate = async () => {
    try {
      console.log('Copy Template function called!');
      if (!window.confirm('Copy Week A and Week B schedules to Next A and Next B?')) {
        console.log('User cancelled the copy operation');
        return;
      }
      
      console.log('Fetching FRESH Week A and Week B data...');
      // Force fresh fetch of Week A and Week B data (bypassing cache)
      const [weekAResponse, weekBResponse] = await Promise.all([
        axios.get(`${API}/roster/weekA?t=${Date.now()}`),  // Add timestamp to bypass cache
        axios.get(`${API}/roster/weekB?t=${Date.now()}`)   // Add timestamp to bypass cache
      ]);
      
      const weekAData = weekAResponse.data || {};
      const weekBData = weekBResponse.data || {};
      
      console.log('Fresh Week A data:', JSON.stringify(weekAData, null, 2));
      console.log('Fresh Week B data:', JSON.stringify(weekBData, null, 2));
      console.log('Week A participants:', Object.keys(weekAData).length);
      console.log('Week B participants:', Object.keys(weekBData).length);
      
      // Post data to Next A and Next B
      console.log('Posting data to Next A and Next B...');
      const [nextAResponse, nextBResponse] = await Promise.all([
        axios.post(`${API}/roster/nextA`, weekAData),
        axios.post(`${API}/roster/nextB`, weekBData)
      ]);
      
      console.log('Next A response:', nextAResponse.data);
      console.log('Next B response:', nextBResponse.data);
      
      // Refresh the roster data
      queryClient.invalidateQueries(['roster']);
      
      toast.success(`Copy completed! Week A (${Object.keys(weekAData).length} participants) → Next A, Week B (${Object.keys(weekBData).length} participants) → Next B`);
      console.log('Copy template completed successfully');
      
    } catch (error) {
      console.error('Copy template error:', error);
      toast.error('Failed to copy templates: ' + (error.response?.data?.detail || error.message));
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
              onClick={exportRoster}
              title="Export all roster data to CSV"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              💰 Export
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