import React from 'react';
import { useRoster } from '../../contexts/RosterContext';
import WeekSelector from './WeekSelector';
import RosterGrid from './RosterGrid';
import RosterControls from './RosterControls';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const RosterView = () => {
  const {
    selectedRosterWeek,
    setSelectedRosterWeek,
    rosterData,
    rosterLoading,
    rosterError,
    editMode,
    setEditMode,
    copyTemplateRunning,
    setCopyTemplateRunning,
    updateRoster,
    copyToPlanner,
    transitionToRoster,
    isUpdating,
    isCopying,
    isTransitioning,
  } = useRoster();

  if (rosterLoading) {
    return <LoadingSpinner message="Loading roster..." />;
  }

  if (rosterError) {
    return <ErrorMessage message="Failed to load roster data" error={rosterError} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Roster Management</h2>
          <div className="flex items-center space-x-4">
            <WeekSelector
              selectedWeek={selectedRosterWeek}
              onWeekChange={setSelectedRosterWeek}
            />
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                editMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
            </button>
          </div>
        </div>

        <RosterControls
          selectedWeek={selectedRosterWeek}
          editMode={editMode}
          copyTemplateRunning={copyTemplateRunning}
          setCopyTemplateRunning={setCopyTemplateRunning}
          updateRoster={updateRoster}
          copyToPlanner={copyToPlanner}
          transitionToRoster={transitionToRoster}
          isUpdating={isUpdating}
          isCopying={isCopying}
          isTransitioning={isTransitioning}
        />
      </div>

      <RosterGrid
        rosterData={rosterData}
        selectedWeek={selectedRosterWeek}
        editMode={editMode}
        updateRoster={updateRoster}
        isUpdating={isUpdating}
      />
    </div>
  );
};

export default RosterView;
