import React from 'react';
import { useRoster } from '../../contexts/RosterContext';
import WorkerList from './WorkerList';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const StaffView = () => {
  const { workers, workersLoading, isAuthenticated } = useRoster();

  if (!isAuthenticated) {
    return <ErrorMessage message="Please log in to view staff information" />;
  }

  if (workersLoading) {
    return <LoadingSpinner message="Loading staff..." />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <div className="text-sm text-gray-500">
            {workers?.length || 0} active staff members
          </div>
        </div>

        <WorkerList workers={workers || []} />
      </div>
    </div>
  );
};

export default StaffView;
