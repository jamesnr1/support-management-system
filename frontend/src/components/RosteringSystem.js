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
      toast.success('Roster updated successfully');
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
    toast.success(`Edit mode ${!editMode ? 'enabled' : 'disabled'}`);
  };

  const handleRosterUpdate = (data) => {
    updateRosterMutation.mutate({ weekType: activeTab, data });
  };

  // Export functionality - CSV for shifts to support provider
  const exportRoster = async () => {
    try {
      let csvContent = "Participant,Date,Start Time,End Time,Duration,Support Type,Ratio,Workers,Location,Shift Number,Notes\n";
      
      // Fetch all roster data
      for (const tab of ['weekA', 'weekB', 'nextA', 'nextB']) {
        const response = await axios.get(`${API}/roster/${tab}`);
        const tabData = response.data;
        
        Object.entries(tabData).forEach(([participantCode, participantData]) => {
          const participant = participants.find(p => p.code === participantCode);
          const participantName = participant ? participant.full_name : participantCode;
          
          Object.entries(participantData).forEach(([date, shifts]) => {
            shifts.forEach(shift => {
              const workerNames = shift.workers ? 
                shift.workers.map(id => workers.find(w => w.id === id)?.full_name || `Worker-${id}`).join('; ') : '';
              const locationName = shift.location ? 
                locations.find(l => l.id === shift.location)?.name || `Location-${shift.location}` : '';
              
              csvContent += `"${participantName}","${date}","${shift.startTime}","${shift.endTime}","${shift.duration || '0'}h","${shift.supportType || 'Self-Care'}","${shift.ratio || '1:1'}","${workerNames}","${locationName}","${shift.shiftNumber || ''}","${shift.notes || ''}"\n`;
            });
          });
        });
      }
      
      // Create downloadable CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', `roster_shifts_${new Date().toISOString().split('T')[0]}.csv`);
      linkElement.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Shift roster exported to CSV successfully');
    } catch (error) {
      toast.error('Failed to export roster: ' + error.message);
    }
  };

  // Template copying function - Properly fixed
  const copyToTemplate = async () => {
    alert('Copy to Template button clicked!'); // Debug alert
    
    if (window.confirm('Copy Week A and Week B schedules to Next A and Next B?')) {
      alert('User confirmed, proceeding with copy...'); // Debug alert
      
      try {
        console.log('Starting copy template process...');
        
        // Fetch Week A and Week B data
        const weekAResponse = await axios.get(`${API}/roster/weekA`);
        const weekBResponse = await axios.get(`${API}/roster/weekB`);
        
        const weekAData = weekAResponse.data || {};
        const weekBData = weekBResponse.data || {};
        
        console.log('Week A data to copy:', Object.keys(weekAData).length, 'participants');
        console.log('Week B data to copy:', Object.keys(weekBData).length, 'participants');
        
        // Check if there's data to copy
        const hasWeekAData = Object.keys(weekAData).length > 0;
        const hasBothData = hasWeekAData && Object.keys(weekBData).length > 0;
        
        if (!hasWeekAData && Object.keys(weekBData).length === 0) {
          alert('No data found to copy');
          toast.error('No data found in Week A or Week B to copy. Please add some shifts first.');
          return;
        }
        
        // Post data to Next A and Next B
        if (hasWeekAData) {
          console.log('Copying Week A to Next A...');
          await axios.post(`${API}/roster/nextA`, weekAData);
          alert('Week A copied to Next A');
        }
        
        if (Object.keys(weekBData).length > 0) {
          console.log('Copying Week B to Next B...');
          await axios.post(`${API}/roster/nextB`, weekBData);
          alert('Week B copied to Next B');
        }
        
        // Refresh queries for Next weeks
        queryClient.invalidateQueries(['roster', 'nextA']);
        queryClient.invalidateQueries(['roster', 'nextB']);
        
        const message = hasBothData 
          ? `Successfully copied! Week A (${Object.keys(weekAData).length} participants) → Next A, Week B (${Object.keys(weekBData).length} participants) → Next B`
          : hasWeekAData 
            ? `Successfully copied Week A (${Object.keys(weekAData).length} participants) → Next A. Week B was empty.`
            : `Successfully copied Week B (${Object.keys(weekBData).length} participants) → Next B. Week A was empty.`;
            
        alert(message); // Debug alert
        toast.success(message);
        
      } catch (error) {
        console.error('Copy template error:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
        alert(`Error: ${errorMessage}`); // Debug alert
        toast.error(`Failed to copy templates: ${errorMessage}`);
      }
    } else {
      alert('User cancelled copy operation'); // Debug alert
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
            <h1 className="header-title">🏠 Support Management System</h1>
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
              📋 Copy to Template
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
              borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : 'none'
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