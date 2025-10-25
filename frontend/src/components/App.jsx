import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { RosterProvider } from '../contexts/RosterContext';
import Login from './Login';
import MainLayout from './layout/MainLayout';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('isAuthenticated') === 'true'
  );

  const handleLogin = (success) => {
    setIsAuthenticated(success);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Login onLogin={handleLogin} />
        </div>
        <Toaster position="top-right" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RosterProvider>
        <div className="min-h-screen bg-gray-50">
          <MainLayout onLogout={handleLogout} />
        </div>
        <Toaster position="top-right" />
      </RosterProvider>
    </QueryClientProvider>
  );
};

export default App;
