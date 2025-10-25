import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create context
const RosterContext = createContext();

// Custom hook to use the context
export const useRoster = () => {
  const context = useContext(RosterContext);
  if (!context) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return context;
};

// Provider component
export const RosterProvider = ({ children }) => {
  const queryClient = useQueryClient();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('isAuthenticated') === 'true'
  );
  
  // Roster state
  const [selectedRosterWeek, setSelectedRosterWeek] = useState(() => {
    return localStorage.getItem('selectedRosterWeek') || 'current';
  });
  
  const [editMode, setEditMode] = useState(false);
  const [copyTemplateRunning, setCopyTemplateRunning] = useState(false);

  // Save selectedRosterWeek to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('selectedRosterWeek', selectedRosterWeek);
  }, [selectedRosterWeek]);

  // API functions
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    return token ? { 'X-Admin-Token': token } : {};
  }, []);

  // Queries
  const { data: rosterData, isLoading: rosterLoading, error: rosterError } = useQuery({
    queryKey: ['roster', selectedRosterWeek],
    queryFn: async () => {
      const response = await axios.get(`${API}/roster/${selectedRosterWeek}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });

  const { data: workers, isLoading: workersLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await axios.get(`${API}/workers`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: participants, isLoading: participantsLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const response = await axios.get(`${API}/participants`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations
  const updateRosterMutation = useMutation({
    mutationFn: async ({ weekType, data }) => {
      const response = await axios.post(`${API}/roster/${weekType}`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roster']);
      toast.success('Roster updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update roster: ${error.response?.data?.detail || error.message}`);
    },
  });

  const copyToPlannerMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${API}/roster/copy_to_planner`, {}, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roster']);
      toast.success('Roster copied to planner successfully');
    },
    onError: (error) => {
      toast.error(`Failed to copy roster: ${error.response?.data?.detail || error.message}`);
    },
  });

  const transitionToRosterMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${API}/roster/transition_to_roster`, {}, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roster']);
      toast.success('Planner moved to roster successfully');
    },
    onError: (error) => {
      toast.error(`Failed to transition roster: ${error.response?.data?.detail || error.message}`);
    },
  });

  // Authentication functions
  const login = useCallback(async (password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { password });
      const { token } = response.data;
      
      localStorage.setItem('adminToken', token);
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      
      toast.success('Login successful');
      return true;
    } catch (error) {
      toast.error('Invalid password');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  }, []);

  // Roster functions
  const updateRoster = useCallback((weekType, data) => {
    updateRosterMutation.mutate({ weekType, data });
  }, [updateRosterMutation]);

  const copyToPlanner = useCallback(() => {
    copyToPlannerMutation.mutate();
  }, [copyToPlannerMutation]);

  const transitionToRoster = useCallback(() => {
    transitionToRosterMutation.mutate();
  }, [transitionToRosterMutation]);

  const validateRoster = useCallback(async (weekType, data) => {
    try {
      const response = await axios.post(`${API}/roster/${weekType}/validate`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      toast.error(`Validation failed: ${error.response?.data?.detail || error.message}`);
      return { valid: false, errors: ['Validation request failed'] };
    }
  }, [getAuthHeaders]);

  // Context value
  const value = {
    // Authentication
    isAuthenticated,
    login,
    logout,
    
    // Roster state
    selectedRosterWeek,
    setSelectedRosterWeek,
    editMode,
    setEditMode,
    copyTemplateRunning,
    setCopyTemplateRunning,
    
    // Data
    rosterData,
    workers,
    participants,
    
    // Loading states
    rosterLoading,
    workersLoading,
    participantsLoading,
    
    // Errors
    rosterError,
    
    // Actions
    updateRoster,
    copyToPlanner,
    transitionToRoster,
    validateRoster,
    
    // Mutation states
    isUpdating: updateRosterMutation.isPending,
    isCopying: copyToPlannerMutation.isPending,
    isTransitioning: transitionToRosterMutation.isPending,
  };

  return (
    <RosterContext.Provider value={value}>
      {children}
    </RosterContext.Provider>
  );
};
