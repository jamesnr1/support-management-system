import React from 'react';

const RosterControls = ({
  selectedWeek,
  editMode,
  copyTemplateRunning,
  setCopyTemplateRunning,
  updateRoster,
  copyToPlanner,
  transitionToRoster,
  isUpdating,
  isCopying,
  isTransitioning,
}) => {
  const handleCopyToPlanner = async () => {
    setCopyTemplateRunning(true);
    try {
      await copyToPlanner();
    } finally {
      setCopyTemplateRunning(false);
    }
  };

  const handleTransitionToRoster = async () => {
    try {
      await transitionToRoster();
    } catch (error) {
      console.error('Transition failed:', error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleCopyToPlanner}
          disabled={isCopying || copyTemplateRunning}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isCopying ? 'Copying...' : 'Copy to Planner'}
        </button>

        <button
          onClick={handleTransitionToRoster}
          disabled={isTransitioning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isTransitioning ? 'Transitioning...' : 'Move Planner to Roster'}
        </button>
      </div>

      <div className="text-sm text-gray-600">
        {editMode && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Edit Mode Active
          </span>
        )}
      </div>

      {isUpdating && (
        <div className="flex items-center text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Updating roster...
        </div>
      )}
    </div>
  );
};

export default RosterControls;
