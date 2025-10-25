import React, { memo, useCallback, useMemo } from 'react';

const TimeSelectorOptimized = memo(({ 
  startTime, 
  endTime, 
  onStartTimeChange, 
  onEndTimeChange,
  isFullDay,
  onFullDayToggle
}) => {
  // Memoize the full day toggle handler
  const handleFullDayToggle = useCallback(() => {
    onFullDayToggle();
  }, [onFullDayToggle]);
  
  // Memoize the start time change handler
  const handleStartTimeChange = useCallback((e) => {
    onStartTimeChange(e.target.value);
  }, [onStartTimeChange]);
  
  // Memoize the end time change handler
  const handleEndTimeChange = useCallback((e) => {
    onEndTimeChange(e.target.value);
  }, [onEndTimeChange]);
  
  // Memoize the time inputs visibility
  const showTimeInputs = useMemo(() => !isFullDay, [isFullDay]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="fullDay"
          checked={isFullDay}
          onChange={handleFullDayToggle}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="fullDay" className="text-sm font-medium text-gray-700">
          Full Day Shift
        </label>
      </div>
      
      {showTimeInputs && (
        <TimeInputs
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
        />
      )}
    </div>
  );
});

// Memoized time inputs component
const TimeInputs = memo(({ 
  startTime, 
  endTime, 
  onStartTimeChange, 
  onEndTimeChange 
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Start Time
        </label>
        <input
          type="time"
          value={startTime}
          onChange={onStartTimeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          End Time
        </label>
        <input
          type="time"
          value={endTime}
          onChange={onEndTimeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
});

TimeSelectorOptimized.displayName = 'TimeSelectorOptimized';
TimeInputs.displayName = 'TimeInputs';

export default TimeSelectorOptimized;
