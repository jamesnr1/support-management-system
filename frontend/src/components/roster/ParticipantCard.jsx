import React, { useMemo } from 'react';

const ParticipantCard = ({ participant, day, shifts, workers, editMode, updateRoster, isUpdating }) => {
  // Filter shifts for this participant and day
  const dayShifts = useMemo(() => {
    if (!shifts || !Array.isArray(shifts)) return [];
    
    return shifts.filter(shift => 
      shift.participant_id === participant.id && 
      shift.day === day
    );
  }, [shifts, participant.id, day]);

  // Calculate total hours for the day
  const totalHours = useMemo(() => {
    return dayShifts.reduce((total, shift) => total + (shift.duration || 0), 0);
  }, [dayShifts]);

  // Get worker names for display
  const getWorkerNames = (workerIds) => {
    if (!workers || !Array.isArray(workerIds)) return [];
    return workerIds.map(id => {
      const worker = workers.find(w => w.id === id);
      return worker ? worker.full_name : id;
    });
  };

  if (dayShifts.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-2">
        No shifts
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {dayShifts.map((shift, index) => (
        <div
          key={index}
          className="bg-blue-50 border border-blue-200 rounded p-2 text-xs"
        >
          <div className="font-medium text-blue-900">
            {shift.start_time} - {shift.end_time}
          </div>
          <div className="text-blue-700">
            {shift.duration}h
          </div>
          {shift.workers && shift.workers.length > 0 && (
            <div className="text-blue-600 mt-1">
              {getWorkerNames(shift.workers).join(', ')}
            </div>
          )}
        </div>
      ))}
      
      {totalHours > 0 && (
        <div className="text-xs font-medium text-gray-600 mt-1 pt-1 border-t border-gray-200">
          Total: {totalHours}h
        </div>
      )}
    </div>
  );
};

export default ParticipantCard;
