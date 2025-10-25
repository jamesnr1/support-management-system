import React, { memo, useMemo, useCallback } from 'react';

const WorkerSelectorOptimized = memo(({ 
  workers, 
  selectedWorkers, 
  onWorkerToggle, 
  unavailableWorkers, 
  getDisplayName,
  isWorkerUnavailable,
  isWorkerAvailableForTime
}) => {
  // Memoize the worker list to prevent unnecessary re-renders
  const memoizedWorkers = useMemo(() => workers, [workers]);
  
  // Memoize the display name function
  const memoizedGetDisplayName = useMemo(() => getDisplayName, [getDisplayName]);
  
  // Memoize the worker availability check functions
  const memoizedIsWorkerUnavailable = useMemo(() => isWorkerUnavailable, [isWorkerUnavailable]);
  const memoizedIsWorkerAvailableForTime = useMemo(() => isWorkerAvailableForTime, [isWorkerAvailableForTime]);
  
  // Memoize the selected workers set for faster lookups
  const selectedWorkersSet = useMemo(() => new Set(selectedWorkers), [selectedWorkers]);
  
  // Memoize the unavailable workers set
  const unavailableWorkersSet = useMemo(() => new Set(unavailableWorkers), [unavailableWorkers]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Workers
      </label>
      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
        {memoizedWorkers.map(worker => {
          const isUnavailable = memoizedIsWorkerUnavailable(worker.id);
          const isSelected = selectedWorkersSet.has(worker.id);
          const isDisabled = isUnavailable || !memoizedIsWorkerAvailableForTime(worker.id);
          
          return (
            <WorkerItem
              key={worker.id}
              worker={worker}
              isSelected={isSelected}
              isDisabled={isDisabled}
              isUnavailable={isUnavailable}
              onToggle={onWorkerToggle}
              getDisplayName={memoizedGetDisplayName}
            />
          );
        })}
      </div>
    </div>
  );
});

// Memoized individual worker item component
const WorkerItem = memo(({ 
  worker, 
  isSelected, 
  isDisabled, 
  isUnavailable, 
  onToggle, 
  getDisplayName 
}) => {
  const handleToggle = useCallback(() => {
    onToggle(worker.id);
  }, [onToggle, worker.id]);
  
  const displayName = useMemo(() => getDisplayName(worker.full_name), [getDisplayName, worker.full_name]);
  
  return (
    <label
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
        onChange={handleToggle}
        disabled={isDisabled}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="flex-1">
        {displayName}
        {isUnavailable && (
          <span className="ml-2 text-xs text-red-600">
            (Unavailable)
          </span>
        )}
        {!isUnavailable && isDisabled && (
          <span className="ml-2 text-xs text-orange-600">
            (Not available for this time)
          </span>
        )}
      </span>
    </label>
  );
});

WorkerSelectorOptimized.displayName = 'WorkerSelectorOptimized';
WorkerItem.displayName = 'WorkerItem';

export default WorkerSelectorOptimized;
