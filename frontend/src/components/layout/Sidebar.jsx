import React from 'react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'roster', label: 'Roster', icon: '📅' },
    { id: 'staff', label: 'Staff', icon: '👥' },
    { id: 'shifts', label: 'Shifts', icon: '⏰' },
    { id: 'calendar', label: 'Calendar', icon: '📆' },
    { id: 'hours', label: 'Hours', icon: '⏱️' },
    { id: 'ai', label: 'AI Assistant', icon: '🤖' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="mr-3 text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
