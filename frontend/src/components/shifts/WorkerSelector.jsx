import React from 'react';

const WorkerSelector = ({ 
  workers, 
  selectedWorkers, 
  onWorkerToggle, 
  unavailableWorkers, 
  getDisplayName,
  isWorkerUnavailable,
  isWorkerAvailableForTime
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Workers
      </label>
      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
        {workers.map(worker => {
          const isUnavailable = isWorkerUnavailable(worker.id);
          const isSelected = selectedWorkers.includes(worker.id);
          const isDisabled = isUnavailable || !isWorkerAvailableForTime(worker.id);
          
          return (
            <label
              key={worker.id}
              className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                isDisabled 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onWorkerToggle(worker.id)}
                disabled={isDisabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex-1">
                {getDisplayName(worker.full_name)}
                {isUnavailable && (
                  <span className="ml-2 text-xs text-red-600">
                    (Unavailable)
                  </span>
                )}
                {!isWorkerAvailableForTime(worker.id) && !isUnavailable && (
                  <span className="ml-2 text-xs text-orange-600">
                    (Not available for this time)
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default WorkerSelector;
