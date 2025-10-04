import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Optimized query hook with better caching
 */
export const useOptimizedQuery = (key, queryFn, options = {}) => {
  return useQuery({
    queryKey: key,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    cacheTime: 10 * 60 * 1000, // 10 minutes - cache persists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2, // Retry failed requests twice
    ...options
  });
};

/**
 * Optimized workers query - workers change rarely
 */
export const useWorkers = () => {
  return useOptimizedQuery(
    ['workers'],
    async () => {
      const response = await axios.get(`${API}/workers`);
      return response.data;
    },
    { staleTime: 10 * 60 * 1000 } // 10 minutes
  );
};

/**
 * Optimized participants query - participants change rarely
 */
export const useParticipants = () => {
  return useOptimizedQuery(
    ['participants'],
    async () => {
      const response = await axios.get(`${API}/participants`);
      return response.data;
    },
    { staleTime: 10 * 60 * 1000 } // 10 minutes
  );
};

/**
 * Optimized locations query - locations almost never change
 */
export const useLocations = () => {
  return useOptimizedQuery(
    ['locations'],
    async () => {
      const response = await axios.get(`${API}/locations`);
      return response.data;
    },
    { staleTime: 30 * 60 * 1000 } // 30 minutes
  );
};

/**
 * Batch fetch all initial data in parallel
 */
export const useInitialData = () => {
  return useOptimizedQuery(
    ['initialData'],
    async () => {
      const [workersRes, locationsRes, participantsRes] = await Promise.all([
        axios.get(`${API}/workers`),
        axios.get(`${API}/locations`),
        axios.get(`${API}/participants`)
      ]);
      return {
        workers: workersRes.data,
        locations: locationsRes.data,
        participants: participantsRes.data
      };
    },
    { staleTime: 10 * 60 * 1000 }
  );
};

export default useOptimizedQuery;

