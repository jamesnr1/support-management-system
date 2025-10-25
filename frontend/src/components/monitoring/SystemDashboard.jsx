import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const SystemDashboard = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Health check query
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.health.check(),
    refetchInterval: refreshInterval,
    retry: 3,
  });

  // System metrics (mock data for now)
  const [metrics, setMetrics] = useState({
    uptime: '99.9%',
    responseTime: '45ms',
    errorRate: '0.1%',
    activeUsers: 12,
    totalRequests: 15420,
  });

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        responseTime: `${Math.floor(Math.random() * 50) + 20}ms`,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 5),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'unhealthy':
        return '❌';
      default:
        return '⚠️';
    }
  };

  if (healthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">System Dashboard</h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Refresh:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
          </div>
        </div>

        {/* Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">
                  {getStatusIcon(healthData?.data?.status)}
                </span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">System Status</p>
                <p className={`text-lg font-semibold ${getStatusColor(healthData?.data?.status)}`}>
                  {healthData?.data?.status || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Response Time</p>
                <p className="text-lg font-semibold text-gray-900">{metrics.responseTime}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Uptime</p>
                <p className="text-lg font-semibold text-green-600">{metrics.uptime}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-lg font-semibold text-gray-900">{metrics.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Health Information */}
        {healthData?.data && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Health Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Database</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Connected:</span>
                    <span className={`text-sm font-medium ${
                      healthData.data.database?.connected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {healthData.data.database?.connected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Can Query:</span>
                    <span className={`text-sm font-medium ${
                      healthData.data.database?.can_query ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {healthData.data.database?.can_query ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Application</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Version:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {healthData.data.version || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Environment:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {healthData.data.environment || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Check:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(healthData.data.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {healthError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Health Check Failed
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{healthError.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Metrics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{metrics.totalRequests.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{metrics.errorRate}</div>
            <div className="text-sm text-gray-500">Error Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{metrics.activeUsers}</div>
            <div className="text-sm text-gray-500">Active Users</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard;
