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
  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const response = await axios.get(`${API}/participants`);
      return response.data;
    }
  });

  // Fetch workers
  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await axios.get(`${API}/workers`);
      return response.data;
    }
  });

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await axios.get(`${API}/locations`);
      return response.data;
    }
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

  const toggleEditMode = () => {
    setEditMode(!editMode);
    toast.success(`Edit mode ${!editMode ? 'enabled' : 'disabled'}`);
  };

  const handleRosterUpdate = (data) => {
    updateRosterMutation.mutate({ weekType: activeTab, data });
  };

  // Template copying function
  const copyToTemplate = () => {
    if (window.confirm('Copy Week A and Week B schedules to Next A and Next B?')) {
      // Get current Week A and Week B data
      const weekAData = rosterData.weekA || {};
      const weekBData = rosterData.weekB || {};
      
      // Update Next A and Next B
      updateRosterMutation.mutate({ weekType: 'nextA', data: weekAData });
      updateRosterMutation.mutate({ weekType: 'nextB', data: weekBData });
      
      toast.success('Templates copied successfully! Week A→Next A, Week B→Next B');
    }
  };

  if (participantsLoading || workersLoading || locationsLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading system data...
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
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Available in next stage"
            >
              📋 Copy to Template
            </button>
            <button 
              className="btn btn-primary"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Available in next stage"
            >
              💰 Export
            </button>
            <button 
              className="btn btn-primary"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Available in next stage"
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