import React from 'react';

const WeekSelector = ({ selectedWeek, onWeekChange }) => {
  const weekOptions = [
    { value: 'roster', label: 'Current Week' },
    { value: 'roster_next', label: 'Next Week' },
    { value: 'roster_after', label: 'Week After' },
    { value: 'planner', label: 'Planner' },
  ];

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="week-selector" className="text-sm font-medium text-gray-700">
        Week:
      </label>
      <select
        id="week-selector"
        value={selectedWeek}
        onChange={(e) => onWeekChange(e.target.value)}
        className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {weekOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WeekSelector;
