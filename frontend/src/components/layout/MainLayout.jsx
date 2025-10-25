import React, { useState } from 'react';
import { useRoster } from '../../contexts/RosterContext';
import Header from './Header';
import Sidebar from './Sidebar';
import RosterView from '../roster/RosterView';
import StaffView from '../staff/StaffView';
import ShiftsView from '../shifts/ShiftsView';
import CalendarView from '../calendar/CalendarView';
import HoursView from '../hours/HoursView';
import AIView from '../ai/AIView';

const MainLayout = ({ onLogout }) => {
  const { isAuthenticated } = useRoster();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'roster';
  });

  // Save activeTab to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'roster':
        return <RosterView />;
      case 'staff':
        return <StaffView />;
      case 'shifts':
        return <ShiftsView />;
      case 'calendar':
        return <CalendarView />;
      case 'hours':
        return <HoursView />;
      case 'ai':
        return <AIView />;
      default:
        return <RosterView />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={onLogout} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
