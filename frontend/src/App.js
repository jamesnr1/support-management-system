import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import RosteringSystem from "./components/RosteringSystem";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <RosteringSystem />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#3E3B37',
              color: '#E8DDD4',
              border: '1px solid #D4A574'
            },
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

export default App;