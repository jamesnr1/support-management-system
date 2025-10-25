import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const BatchValidation = () => {
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [workers, setWorkers] = useState({});
  const [participants, setParticipants] = useState({});
  const [validationOptions, setValidationOptions] = useState({
    template_validation: true,
    participant_specific: true,
    smart_validation: true
  });

  const validateBatch = async () => {
    if (shifts.length === 0) {
      toast.error('Please add at least one shift to validate');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/validation/advanced/batch/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shifts,
          workers,
          participants,
          validation_options: validationOptions,
          template_validation: validationOptions.template_validation,
          participant_specific: validationOptions.participant_specific,
          smart_validation: validationOptions.smart_validation
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setValidationResult(data.result);
        toast.success(`Batch validation completed: ${data.result.overall_status}`);
      } else {
        toast.error('Batch validation failed');
      }
    } catch (error) {
      console.error('Error running batch validation:', error);
      toast.error('Error running batch validation');
    } finally {
      setLoading(false);
    }
  };

  const addSampleShift = () => {
    const newShift = {
      id: `shift_${Date.now()}`,
      participant: 'P001',
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '17:00',
      duration: 8.0,
      ratio: '1:1',
      funding_category: 'core',
      workers: ['1']
    };
    setShifts([...shifts, newShift]);
  };

  const removeShift = (index) => {
    setShifts(shifts.filter((_, i) => i !== index));
  };

  const updateShift = (index, field, value) => {
    const updatedShifts = [...shifts];
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };
    setShifts(updatedShifts);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
      case 'critical':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Batch Validation</h2>
          <p className="text-sm text-gray-600 mt-1">
            Validate multiple shifts at once with comprehensive checks
          </p>
        </div>

        <div className="p-6">
          {/* Validation Options */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Validation Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={validationOptions.template_validation}
                  onChange={(e) => setValidationOptions({
                    ...validationOptions,
                    template_validation: e.target.checked
                  })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Template Validation</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={validationOptions.participant_specific}
                  onChange={(e) => setValidationOptions({
                    ...validationOptions,
                    participant_specific: e.target.checked
                  })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Participant-Specific Rules</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={validationOptions.smart_validation}
                  onChange={(e) => setValidationOptions({
                    ...validationOptions,
                    smart_validation: e.target.checked
                  })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Smart Validation</span>
              </label>
            </div>
          </div>

          {/* Shifts Management */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Shifts to Validate</h3>
              <button
                onClick={addSampleShift}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Shift
              </button>
            </div>

            {shifts.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-gray-600">No shifts added yet. Click "Add Shift" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {shifts.map((shift, index) => (
                  <div key={shift.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Shift {index + 1}</h4>
                      <button
                        onClick={() => removeShift(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Participant</label>
                        <input
                          type="text"
                          value={shift.participant}
                          onChange={(e) => updateShift(index, 'participant', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={shift.date}
                          onChange={(e) => updateShift(index, 'date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={shift.startTime}
                          onChange={(e) => updateShift(index, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={shift.endTime}
                          onChange={(e) => updateShift(index, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                        <input
                          type="number"
                          step="0.5"
                          value={shift.duration}
                          onChange={(e) => updateShift(index, 'duration', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ratio</label>
                        <select
                          value={shift.ratio}
                          onChange={(e) => updateShift(index, 'ratio', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="1:1">1:1</option>
                          <option value="2:1">2:1</option>
                          <option value="1:2">1:2</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Funding</label>
                        <select
                          value={shift.funding_category}
                          onChange={(e) => updateShift(index, 'funding_category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="core">Core</option>
                          <option value="capacity">Capacity</option>
                          <option value="capital">Capital</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Workers</label>
                        <input
                          type="text"
                          value={shift.workers.join(', ')}
                          onChange={(e) => updateShift(index, 'workers', e.target.value.split(',').map(w => w.trim()))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1, 2, 3"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validate Button */}
          <div className="flex justify-center">
            <button
              onClick={validateBatch}
              disabled={loading || shifts.length === 0}
              className="px-8 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Validating...
                </div>
              ) : (
                `Validate ${shifts.length} Shift${shifts.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="mt-6 bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Validation Results</h3>
                <p className="text-sm text-gray-600">
                  Processed {validationResult.total_shifts} shifts in {validationResult.processing_time.toFixed(2)}s
                </p>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(validationResult.overall_status)}`}>
                {getStatusIcon(validationResult.overall_status)}
                <span className="ml-2 capitalize">{validationResult.overall_status}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{validationResult.validated_shifts}</div>
                  <div className="text-gray-600">Validated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{validationResult.failed_validations}</div>
                  <div className="text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{validationResult.summary.successful}</div>
                  <div className="text-gray-600">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{validationResult.summary.warnings}</div>
                  <div className="text-gray-600">Warnings</div>
                </div>
              </div>
            </div>

            {/* Individual Results */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Individual Shift Results</h4>
              {validationResult.results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">{result.shift_id}</h5>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)}
                      <span className="ml-1 capitalize">{result.status}</span>
                    </div>
                  </div>

                  {result.validations && result.validations.length > 0 && (
                    <div className="space-y-2">
                      {result.validations.map((validation, vIndex) => (
                        <div key={vIndex} className="text-sm">
                          <div className="font-medium text-gray-700 capitalize">{validation.type} Validation</div>
                          {validation.errors && validation.errors.length > 0 && (
                            <div className="text-red-600">
                              {validation.errors.map((error, eIndex) => (
                                <div key={eIndex}>• {error}</div>
                              ))}
                            </div>
                          )}
                          {validation.warnings && validation.warnings.length > 0 && (
                            <div className="text-yellow-600">
                              {validation.warnings.map((warning, wIndex) => (
                                <div key={wIndex}>• {warning}</div>
                              ))}
                            </div>
                          )}
                          {validation.info && validation.info.length > 0 && (
                            <div className="text-blue-600">
                              {validation.info.map((info, iIndex) => (
                                <div key={iIndex}>• {info}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.error && (
                    <div className="text-sm text-red-600">
                      Error: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchValidation;
