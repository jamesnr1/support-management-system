import React from 'react';

const LocationSelector = ({ 
  locations, 
  selectedLocation, 
  onLocationChange 
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Location
      </label>
      <select
        value={selectedLocation}
        onChange={(e) => onLocationChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select Location</option>
        {locations.map(location => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LocationSelector;
