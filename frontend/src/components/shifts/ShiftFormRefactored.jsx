import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { validateRosterAPI } from '../../utils/shiftValidation';

// Import smaller components
import ShiftFormHeader from './ShiftFormHeader';
import WorkerSelector from './WorkerSelector';
import TimeSelector from './TimeSelector';
import LocationSelector from './LocationSelector';
import ShiftFormActions from './ShiftFormActions';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ShiftFormRefactored = ({ 
  participant, 
  date, 
  editingShift, 
  workers: allWorkers, 
  locations, 
  onSave, 
  onCancel,
  onDelete,
  existingShifts = [],
  weekType,
  rosterData = {}
}) => {
  // ===== STATE MANAGEMENT =====
  const [workers, setWorkers] = useState(allWorkers || []);
  const [isFormReady, setIsFormReady] = useState(false);
  const [unavailableWorkerPeriods, setUnavailableWorkerPeriods] = useState(new Map());
  const [unavailabilityCheckComplete, setUnavailabilityCheckComplete] = useState(false);
  const [workerAvailabilityRules, setWorkerAvailabilityRules] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // ===== FORM STATE =====
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isFullDay, setIsFullDay] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [notes, setNotes] = useState('');

  // ===== HELPER FUNCTIONS =====
  const getDisplayName = (fullName) => {
    if (!fullName) return '';
    const match = fullName.match(/\(([^)]+)\)/);
    return match ? match[1] : fullName.split(' ')[0];
  };

  const calculateWorkerHours = (workerId, currentWeekType) => {
    if (!rosterData || !workerId) return 0;
    
    let totalHours = 0;
    
    Object.keys(rosterData).forEach(participantCode => {
      const participantData = rosterData[participantCode];
      if (!participantData) return;
      
      Object.keys(participantData).forEach(date => {
        const shifts = Array.isArray(participantData[date]) ? participantData[date] : [];
        
        shifts.forEach(shift => {
          if (shift.workers && shift.workers.includes(workerId)) {
            const shiftHours = calculateShiftHours(shift);
            totalHours += shiftHours;
          }
        });
      });
    });
    
    return totalHours;
  };

  const calculateShiftHours = (shift) => {
    if (shift.isFullDay) return 8; // Assume 8 hours for full day
    
    const start = shift.startTime || '09:00';
    const end = shift.endTime || '17:00';
    
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  // ===== AVAILABILITY CHECKING =====
  const isWorkerUnavailable = useCallback((workerId) => {
    if (!unavailabilityCheckComplete) return false;
    return unavailableWorkerPeriods.has(workerId);
  }, [unavailableWorkerPeriods, unavailabilityCheckComplete]);

  const isWorkerAvailableForTime = useCallback((workerId) => {
    if (!unavailabilityCheckComplete) return true;
    
    const rules = workerAvailabilityRules[workerId];
    if (!rules || rules.length === 0) return true;
    
    const dayOfWeek = new Date(date).getDay();
    const dayRules = rules.filter(rule => rule.weekday === dayOfWeek);
    
    if (dayRules.length === 0) return false;
    
    return dayRules.some(rule => {
      if (rule.is_full_day) return true;
      
      const ruleStart = rule.from_time || '00:00';
      const ruleEnd = rule.to_time || '23:59';
      
      return startTime >= ruleStart && endTime <= ruleEnd;
    });
  }, [workerAvailabilityRules, date, startTime, endTime, unavailabilityCheckComplete]);

  // ===== EVENT HANDLERS =====
  const handleWorkerToggle = (workerId) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleStartTimeChange = (time) => {
    setStartTime(time);
  };

  const handleEndTimeChange = (time) => {
    setEndTime(time);
  };

  const handleFullDayToggle = () => {
    setIsFullDay(!isFullDay);
    if (!isFullDay) {
      setStartTime('09:00');
      setEndTime('17:00');
    }
  };

  const handleLocationChange = (locationId) => {
    setSelectedLocation(locationId);
  };

  const handleSave = async () => {
    if (selectedWorkers.length === 0) {
      toast.error('Please select at least one worker');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    setIsSaving(true);

    try {
      const shiftData = {
        workers: selectedWorkers,
        startTime: isFullDay ? null : startTime,
        endTime: isFullDay ? null : endTime,
        isFullDay,
        location: selectedLocation,
        notes: notes.trim() || null
      };

      await onSave(shiftData);
      toast.success('Shift saved successfully!');
    } catch (error) {
      toast.error('Failed to save shift');
      console.error('Error saving shift:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (editingShift && onDelete) {
      try {
        await onDelete(editingShift.id);
        toast.success('Shift deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete shift');
        console.error('Error deleting shift:', error);
      }
    }
  };

  // ===== VALIDATION =====
  const canSave = useMemo(() => {
    return selectedWorkers.length > 0 && selectedLocation && !isSaving;
  }, [selectedWorkers, selectedLocation, isSaving]);

  // ===== EFFECTS =====
  useEffect(() => {
    if (editingShift) {
      setSelectedWorkers(editingShift.workers || []);
      setStartTime(editingShift.startTime || '09:00');
      setEndTime(editingShift.endTime || '17:00');
      setIsFullDay(editingShift.isFullDay || false);
      setSelectedLocation(editingShift.location || '');
      setNotes(editingShift.notes || '');
    }
  }, [editingShift]);

  useEffect(() => {
    setWorkers(allWorkers || []);
    setIsFormReady(true);
  }, [allWorkers]);

  // ===== RENDER =====
  if (!isFormReady) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <ShiftFormHeader
        participant={participant}
        date={date}
        editingShift={editingShift}
        onCancel={onCancel}
        onDelete={handleDelete}
      />

      <div className="space-y-6">
        <WorkerSelector
          workers={workers}
          selectedWorkers={selectedWorkers}
          onWorkerToggle={handleWorkerToggle}
          unavailableWorkers={unavailableWorkerPeriods}
          getDisplayName={getDisplayName}
          isWorkerUnavailable={isWorkerUnavailable}
          isWorkerAvailableForTime={isWorkerAvailableForTime}
        />

        <TimeSelector
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          isFullDay={isFullDay}
          onFullDayToggle={handleFullDayToggle}
        />

        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about this shift..."
          />
        </div>
      </div>

      <ShiftFormActions
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={onCancel}
        canSave={canSave}
      />
    </div>
  );
};

export default ShiftFormRefactored;
