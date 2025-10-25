import React from 'react';

const CalendarView = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h2>
        
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Calendar Integration</div>
          <div className="text-gray-400 text-sm mt-2">
            This feature will integrate with Google Calendar for appointment scheduling.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
