import React from 'react';

const WorkerCard = ({ worker }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            {worker.full_name}
          </h3>
          
          {worker.email && (
            <p className="text-sm text-gray-600 mt-1">
              {worker.email}
            </p>
          )}
          
          {worker.phone && (
            <p className="text-sm text-gray-600">
              {worker.phone}
            </p>
          )}
        </div>
        
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(worker.status)}`}>
          {worker.status || 'Unknown'}
        </span>
      </div>
      
      {worker.skills && worker.skills.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
          <div className="flex flex-wrap gap-1">
            {worker.skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-500">
          <span>ID: {worker.id}</span>
          {worker.created_at && (
            <span>Added: {new Date(worker.created_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerCard;
