import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const ValidationConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('standard');
  const [customConfig, setCustomConfig] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/validation/config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setSelectedLevel(data.config.level);
        setCustomConfig(data.config);
      } else {
        toast.error('Failed to load validation configuration');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error loading validation configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const updates = showAdvanced ? customConfig : {};
      const response = await fetch('/api/validation/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: selectedLevel,
          updates: updates
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        toast.success('Validation configuration updated successfully');
      } else {
        toast.error('Failed to update validation configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error updating validation configuration');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (level) => {
    try {
      const response = await fetch(`/api/validation/presets/${level}`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setSelectedLevel(level);
        toast.success(`Applied ${level} validation preset`);
      } else {
        toast.error('Failed to apply validation preset');
      }
    } catch (error) {
      console.error('Error applying preset:', error);
      toast.error('Error applying validation preset');
    }
  };

  const handleCustomConfigChange = (key, value) => {
    setCustomConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Validation Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure validation rules for roster data
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Validation Level Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Validation Level
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { level: 'relaxed', title: 'Relaxed', description: 'Minimal restrictions' },
                { level: 'standard', title: 'Standard', description: 'Balanced rules' },
                { level: 'strict', title: 'Strict', description: 'Maximum compliance' }
              ].map(({ level, title, description }) => (
                <div
                  key={level}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedLevel === level
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedLevel(level)}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="validation-level"
                      value={level}
                      checked={selectedLevel === level}
                      onChange={() => setSelectedLevel(level)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{title}</div>
                      <div className="text-sm text-gray-600">{description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Configuration Display */}
          {config && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Current Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Rest Periods:</span>
                  <span className="ml-2 text-gray-600">
                    {config.rest_periods?.minimum_rest_hours || 8}h minimum
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Work Limits:</span>
                  <span className="ml-2 text-gray-600">
                    {config.work_limits?.max_weekly_hours || 40}h weekly max
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Split Shifts:</span>
                  <span className="ml-2 text-gray-600">
                    {config.split_shifts?.allowed ? 'Allowed' : 'Not allowed'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Overnight Staffing:</span>
                  <span className="ml-2 text-gray-600">
                    {config.overnight_shifts?.staffing_required ? 'Required' : 'Optional'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Configuration */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Configuration
              <svg
                className={`ml-1 h-4 w-4 transition-transform ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Rest Hours
                    </label>
                    <input
                      type="number"
                      value={customConfig.min_rest_hours || 8}
                      onChange={(e) => handleCustomConfigChange('min_rest_hours', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="24"
                      step="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Continuous Hours
                    </label>
                    <input
                      type="number"
                      value={customConfig.max_continuous_hours || 12}
                      onChange={(e) => handleCustomConfigChange('max_continuous_hours', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="24"
                      step="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Daily Hours
                    </label>
                    <input
                      type="number"
                      value={customConfig.max_daily_hours || 16}
                      onChange={(e) => handleCustomConfigChange('max_daily_hours', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="24"
                      step="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Weekly Hours
                    </label>
                    <input
                      type="number"
                      value={customConfig.max_weekly_hours || 40}
                      onChange={(e) => handleCustomConfigChange('max_weekly_hours', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="80"
                      step="0.5"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customConfig.allow_split_shifts !== false}
                        onChange={(e) => handleCustomConfigChange('allow_split_shifts', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Allow Split Shifts</span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customConfig.strict_rest_validation === true}
                        onChange={(e) => handleCustomConfigChange('strict_rest_validation', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Strict Rest Validation</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={() => applyPreset('relaxed')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Apply Relaxed
              </button>
              <button
                onClick={() => applyPreset('standard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Apply Standard
              </button>
              <button
                onClick={() => applyPreset('strict')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Apply Strict
              </button>
            </div>

            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationConfig;
