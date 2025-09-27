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
  const [showHoursTracker, setShowHoursTracker] = useState(false);
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
    { id: 'admin', label: 'Admin', color: '#9A8F85' }
  ];

  const toggleHoursTracker = () => {
    setShowHoursTracker(!showHoursTracker);
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    toast.success(`Edit mode ${!editMode ? 'enabled' : 'disabled'}`);
  };

  const handleRosterUpdate = (data) => {
    updateRosterMutation.mutate({ weekType: activeTab, data });
  };

  // Export functionality
  const exportRoster = async () => {
    try {
      const allData = {
        participants,
        workers,
        locations,
        rosters: {}
      };
      
      // Fetch all roster data
      for (const tab of ['weekA', 'weekB', 'nextA', 'nextB']) {
        const response = await axios.get(`${API}/roster/${tab}`);
        allData.rosters[tab] = response.data;
      }
      
      // Create downloadable JSON file
      const dataStr = JSON.stringify(allData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `roster_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Roster data exported successfully');
    } catch (error) {
      toast.error('Failed to export data: ' + error.message);
    }
  };

  // Template copying function
  const copyToTemplate = async () => {
    if (window.confirm('Copy Week A and Week B schedules to Next A and Next B?')) {
      try {
        // Fetch current Week A and Week B data
        const weekAResponse = await axios.get(`${API}/roster/weekA`);
        const weekBResponse = await axios.get(`${API}/roster/weekB`);
        
        // Update Next A and Next B with the data
        await axios.post(`${API}/roster/nextA`, weekAResponse.data);
        await axios.post(`${API}/roster/nextB`, weekBResponse.data);
        
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries(['roster']);
        
        toast.success('Templates copied successfully! Week A→Next A, Week B→Next B');
      } catch (error) {
        toast.error('Failed to copy templates: ' + error.message);
      }
    }
  };

  console.log('Debug: participantsLoading:', participantsLoading, 'workersLoading:', workersLoading, 'locationsLoading:', locationsLoading);
  console.log('Errors:', { participantsError, workersError, locationsError });

  if (participantsLoading || workersLoading || locationsLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading system data...
        <div style={{ fontSize: '12px', marginTop: '10px', color: 'var(--text-muted)' }}>
          Participants: {participantsLoading ? 'Loading...' : 'Ready'}<br/>
          Workers: {workersLoading ? 'Loading...' : 'Ready'}<br/>
          Locations: {locationsLoading ? 'Loading...' : 'Ready'}
        </div>
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
              className="btn btn-primary"
              onClick={copyToTemplate}
              title="Copy Week A/B to Next A/B"
            >
              📋 Copy to Template
            </button>
            <button 
              className="btn btn-primary"
              onClick={exportRoster}
              title="Export all roster data to JSON"
            >
              💰 Export
            </button>
            <button 
              className="btn btn-primary"
              onClick={toggleHoursTracker}
              title="View worker hours tracker"
            >
              ⏱️ Hours
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
        {showHoursTracker ? (
          <HoursTracker 
            participants={participants}
            workers={workers}
            rosterData={rosterData}
            onClose={toggleHoursTracker}
          />
        ) : activeTab === 'admin' ? (
          <WorkerManagement 
            workers={workers}
            locations={locations}
            onWorkerUpdate={() => queryClient.invalidateQueries(['workers'])}
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
                  workers={workers}
                  locations={locations}
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