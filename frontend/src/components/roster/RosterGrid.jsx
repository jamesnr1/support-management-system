import React, { useMemo } from 'react';
import { useRoster } from '../../contexts/RosterContext';
import ParticipantCard from './ParticipantCard';
import LoadingSpinner from '../common/LoadingSpinner';

const RosterGrid = ({ rosterData, selectedWeek, editMode, updateRoster, isUpdating }) => {
  const { participants, workers } = useRoster();

  // Get the days of the week
  const weekDays = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days;
  }, []);

  // Get shifts for the current week
  const weekShifts = useMemo(() => {
    if (!rosterData?.data?.shifts) return [];
    return rosterData.data.shifts;
  }, [rosterData]);

  if (!participants || participants.length === 0) {
    return <LoadingSpinner message="Loading participants..." />;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Roster Grid - {selectedWeek.replace('_', ' ').toUpperCase()}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participant
              </th>
              {weekDays.map((day) => (
                <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participants.map((participant) => (
              <tr key={participant.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {participant.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {participant.code}
                      </div>
                    </div>
                  </div>
                </td>
                {weekDays.map((day) => (
                  <td key={day} className="px-6 py-4 whitespace-nowrap">
                    <ParticipantCard
                      participant={participant}
                      day={day}
                      shifts={weekShifts}
                      workers={workers}
                      editMode={editMode}
                      updateRoster={updateRoster}
                      isUpdating={isUpdating}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RosterGrid;
