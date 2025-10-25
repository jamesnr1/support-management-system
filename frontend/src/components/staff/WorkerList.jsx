import React from 'react';
import WorkerCard from './WorkerCard';

const WorkerList = ({ workers }) => {
  if (!workers || workers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No staff members found</div>
        <div className="text-gray-400 text-sm mt-2">
          Add staff members to get started
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workers.map((worker) => (
        <WorkerCard key={worker.id} worker={worker} />
      ))}
    </div>
  );
};

export default WorkerList;
