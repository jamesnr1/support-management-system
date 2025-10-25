import React from 'react';

const ShiftFormHeader = ({ 
  participant, 
  date, 
  editingShift, 
  onCancel,
  onDelete 
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {editingShift ? 'Edit Shift' : 'Add New Shift'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {participant?.full_name} - {formatDate(date)}
        </p>
      </div>
      <div className="flex space-x-2">
        {editingShift && (
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ShiftFormHeader;
