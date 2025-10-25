import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API_BASE_URL = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers['X-Admin-Token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('adminToken');
      localStorage.removeItem('isAuthenticated');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const apiClient = {
  // Authentication
  auth: {
    login: (password) => api.post('/auth/login', { password }),
    logout: () => api.post('/auth/logout'),
  },

  // Workers
  workers: {
    getAll: () => api.get('/workers'),
    getById: (id) => api.get(`/workers/${id}`),
    create: (workerData) => api.post('/workers', workerData),
    update: (id, workerData) => api.put(`/workers/${id}`, workerData),
    delete: (id) => api.delete(`/workers/${id}`),
    getAvailability: (id) => api.get(`/workers/${id}/availability`),
    updateAvailability: (id, availability) => api.put(`/workers/${id}/availability`, availability),
  },

  // Participants
  participants: {
    getAll: () => api.get('/participants'),
    getById: (id) => api.get(`/participants/${id}`),
    getShifts: (id) => api.get(`/participants/${id}/shifts`),
  },

  // Roster
  roster: {
    get: (weekType) => api.get(`/roster/${weekType}`),
    update: (weekType, data) => api.post(`/roster/${weekType}`, data),
    copyToPlanner: () => api.post('/roster/copy_to_planner'),
    transitionToRoster: () => api.post('/roster/transition_to_roster'),
    validate: (weekType, data) => api.post(`/roster/${weekType}/validate`, data),
  },

  // Health
  health: {
    check: () => api.get('/health'),
    ready: () => api.get('/ready'),
  },
};

export default api;
