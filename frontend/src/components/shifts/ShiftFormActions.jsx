import React from 'react';

const ShiftFormActions = ({ 
  isSaving, 
  onSave, 
  onCancel,
  canSave = true 
}) => {
  return (
    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !canSave}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Shift'}
      </button>
    </div>
  );
};

export default ShiftFormActions;
