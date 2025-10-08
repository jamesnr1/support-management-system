import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import WorkerCard from './WorkerCard';
import { useQuery } from '@tanstack/react-query';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StaffTab = ({ workers = [], locations = [], onWorkersUpdate, rosterData, participants = [] }) => {
  // Batch availability data - fetch once for all workers to avoid 48 sequential API calls
  const [allAvailabilityData, setAllAvailabilityData] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  
  // Filter state
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'unavailable'

  // Helper to extract preferred name (in brackets) or first name
  const getDisplayNameForSort = (fullName) => {
    if (!fullName) return '';
    const match = fullName.match(/\(([^)]+)\)/);
    return match ? match[1] : fullName.split(' ')[0]; // Use preferred name or first name
  };

  // Sort workers alphabetically by preferred name (in brackets) or first name
  const sortedWorkers = [...workers].sort((a, b) => 
    getDisplayNameForSort(a.full_name).localeCompare(getDisplayNameForSort(b.full_name))
  );

  // Apply filters
  const filteredWorkers = sortedWorkers;

  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);
  const [showUnavailability, setShowUnavailability] = useState({});
  const [unavailabilityData, setUnavailabilityData] = useState({
    from: '',
    to: '',
    reason: ''
  });
  const [existingUnavailability, setExistingUnavailability] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Telegram messaging state
  const [telegramMessage, setTelegramMessage] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [sendToAll, setSendToAll] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);

  // Week selector for shifts
  const [selectedWeek, setSelectedWeek] = useState('current');

  // Calculate week date ranges
  const weekRanges = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - daysFromMonday);
    currentMonday.setHours(0, 0, 0, 0);
    
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(currentMonday.getDate() + 7);
    
    const afterMonday = new Date(currentMonday);
    afterMonday.setDate(currentMonday.getDate() + 14);

    const formatDateRange = (monday) => {
      const start = new Date(monday);
      const end = new Date(monday);
      end.setDate(monday.getDate() + 6);
      return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    };

    return {
      current: { label: formatDateRange(currentMonday), startDate: currentMonday, endDate: new Date(currentMonday.getTime() + 6 * 24 * 60 * 60 * 1000) },
      next: { label: formatDateRange(nextMonday), startDate: nextMonday, endDate: new Date(nextMonday.getTime() + 6 * 24 * 60 * 60 * 1000) },
      week_after: { label: formatDateRange(afterMonday), startDate: afterMonday, endDate: new Date(afterMonday.getTime() + 6 * 24 * 60 * 60 * 1000) }
    };
  }, []);

  const startDate = weekRanges[selectedWeek]?.startDate;
  const endDate = weekRanges[selectedWeek]?.endDate;

  // Organize shifts by worker (from ShiftsTab logic)
  const workerShifts = useMemo(() => {
    if (!rosterData || !workers) return {};

    const shifts = {};
    let dataSource = rosterData.current?.data;
    
    if (!dataSource) return {};

    const participantLookup = (workers || []).reduce((acc, worker) => {
      acc[worker.id] = worker;
      return acc;
    }, {});

    Object.entries(dataSource).forEach(([participantCode, participantShifts]) => {
      Object.entries(participantShifts).forEach(([date, dayShifts]) => {
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);

        if (dateObj >= startDate && dateObj <= endDate && Array.isArray(dayShifts)) {
          dayShifts.forEach(shift => {
            const workerIds = shift.workers || [];

            workerIds.forEach(workerId => {
              if (!shifts[workerId]) {
                shifts[workerId] = [];
              }

              shifts[workerId].push({
                date,
                day: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                participant: participantCode,
                startTime: shift.start_time || shift.startTime,
                endTime: shift.end_time || shift.endTime,
                hours: shift.duration || 0
              });
            });
          });
        }
      });
    });

    return shifts;
  }, [rosterData, selectedWeek, startDate, endDate, workers]);

  // Calculate total hours for each worker
  const workerTotalHours = useMemo(() => {
    const totals = {};
    Object.keys(workerShifts).forEach(workerId => {
      const total = workerShifts[workerId].reduce((sum, shift) => sum + (shift.hours || 0), 0);
      totals[workerId] = total;
    });
    return totals;
  }, [workerShifts]);

  // Filter workers who have telegram
  const workersWithTelegram = useMemo(() => {
    return workers?.filter(w => w.telegram) || [];
  }, [workers]);

  // Batch fetch all availability data
  useEffect(() => {
    const fetchAllAvailability = async () => {
      if (!workers || workers.length === 0) {
        setAvailabilityLoading(false);
        return;
      }

      setAvailabilityLoading(true);
      try {
        const availabilityPromises = workers.map(async (worker) => {
          try {
            const response = await axios.get(`${API}/workers/${worker.id}/availability`);
            return { workerId: worker.id, data: response.data };
          } catch (error) {
            console.error(`Error fetching availability for worker ${worker.id}:`, error);
            return { workerId: worker.id, data: null };
          }
        });

        const results = await Promise.all(availabilityPromises);
        const availabilityMap = {};
        results.forEach(({ workerId, data }) => {
          availabilityMap[workerId] = data;
        });

        setAllAvailabilityData(availabilityMap);
      } catch (error) {
        console.error('Error fetching availability data:', error);
        toast.error('Failed to load availability data');
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAllAvailability();
  }, [workers]);

  // Get availability rules for a worker
  const getAvailabilityRules = (workerId) => {
    return allAvailabilityData[workerId]?.weeklyAvailability || {};
  };

  // Check if worker is available on a specific day
  const isWorkerAvailable = (workerId, dayOfWeek) => {
    const rules = getAvailabilityRules(workerId);
    const dayData = rules[dayOfWeek];
    if (!dayData || !dayData.available) return false;

    const isFullDay = dayData.from_time === '00:00' && (dayData.to_time === '23:59' || dayData.to_time === '24:00');
    const wraps_midnight = !isFullDay && dayData.from_time === dayData.to_time && dayData.from_time !== '00:00';
    
    return isFullDay || wraps_midnight || dayData.from_time !== dayData.to_time;
  };

  // Get availability display text for a worker
  const getAvailabilityDisplay = (worker) => {
    const rules = getAvailabilityRules(worker.id);
    const availableDays = Object.keys(rules).filter(day => 
      rules[day].available && isWorkerAvailable(worker.id, day)
    );

    if (availableDays.length === 0) {
      return "Unavailable";
    }

    if (availableDays.length === 7) {
      return "Available 24/7";
    }

    return `Available ${availableDays.length} days`;
  };

  // Get availability date range
  const getAvailabilityDateRange = (worker) => {
    const rules = getAvailabilityRules(worker.id);
    const availableDays = Object.keys(rules).filter(day => 
      rules[day].available && isWorkerAvailable(worker.id, day)
    );

    if (availableDays.length === 0) {
      return "No availability set";
    }

    // Find the earliest and latest available times
    let earliestTime = "23:59";
    let latestTime = "00:00";

    availableDays.forEach(day => {
      const dayData = rules[day];
      if (dayData.from_time && dayData.to_time) {
        if (dayData.from_time < earliestTime) {
          earliestTime = dayData.from_time;
        }
        if (dayData.to_time > latestTime) {
          latestTime = dayData.to_time;
        }
      }
    });

    return `${earliestTime} - ${latestTime}`;
  };

  // Get shift summary for a worker
  const getShiftSummary = (workerId) => {
    const shifts = workerShifts[workerId] || [];
    if (shifts.length === 0) {
      return null;
    }

    const totalHours = workerTotalHours[workerId] || 0;
    return {
      count: shifts.length,
      hours: totalHours.toFixed(1),
      shifts: shifts
    };
  };

  // Telegram handlers
  const handleWorkerSelection = (workerId, isChecked) => {
    const newSelected = new Set(selectedWorkers);
    if (isChecked) {
      newSelected.add(workerId);
    } else {
      newSelected.delete(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const handleSendTelegramMessage = async () => {
    if (!telegramMessage.trim()) return;
    
    try {
      const workersToSend = sendToAll 
        ? workersWithTelegram.map(w => w.id)
        : Array.from(selectedWorkers);
      
      await axios.post(`${API}/telegram/send`, {
        message: telegramMessage,
        worker_ids: workersToSend
      });
      
      toast.success('Message sent successfully! ✅');
      setTelegramMessage('');
      setSelectedWorkers(new Set());
      setSendToAll(false);
    } catch (error) {
      console.error('Error sending telegram message:', error);
      toast.error('❌ Failed to send message: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleClearTelegramMessage = () => {
    setTelegramMessage('');
    setSelectedWorkers(new Set());
    setSendToAll(false);
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Week Selector */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <option value="current">Current Week</option>
          <option value="next">Next Week</option>
          <option value="week_after">Week After</option>
        </select>
        <button
          onClick={() => setShowWorkerModal(true)}
          style={{
            padding: '8px 15px',
            borderRadius: '25px',
            border: 'none',
            background: 'var(--accent)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Add Worker
        </button>
      </div>

      {/* Main layout: Worker cards on left, Telegram panel on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left side: Worker cards */}
        <div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {filteredWorkers.map(worker => {
              const shiftSummary = getShiftSummary(worker.id);
              
              return (
                <div key={worker.id}>
                  <WorkerCard
                    worker={{
                      ...worker,
                      shift_hours: shiftSummary ? shiftSummary.hours : '0'
                    }}
                    locations={locations}
                    onEdit={() => {
                      console.log('Edit button clicked for worker:', worker.full_name);
                      setEditingWorker(worker);
                      setShowWorkerModal(true);
                    }}
                    onManageAvailability={() => {
                      console.log('Availability button clicked for worker:', worker.full_name);
                      setSelectedWorker(worker);
                      setShowAvailabilityModal(true);
                    }}
                    onDelete={async (workerToDelete) => {
                      try {
                        await axios.delete(`${API}/workers/${workerToDelete.id}`);
                        toast.success(`${workerToDelete.full_name} deleted successfully`);
                        onWorkersUpdate();
                      } catch (error) {
                        console.error('Error deleting worker:', error);
                        toast.error('Failed to delete worker');
                      }
                    }}
                    availabilityData={allAvailabilityData[worker.id]}
                    availabilityLoading={availabilityLoading}
                    // Override availability display with shift info only when there are shifts
                    customAvailabilityDisplay={shiftSummary && shiftSummary.shifts.length > 0 ? 
                      shiftSummary.shifts.map(shift => {
                        const participant = participants.find(p => p.code === shift.participant);
                        const participantName = participant ? 
                          (participant.full_name.match(/\(([^)]+)\)/)?.[1] || participant.full_name.split(' ')[0]) : 
                          shift.participant;
                        return `${shift.day?.charAt(0)} - ${participantName} - ${shift.startTime}-${shift.endTime}`;
                      }) : 
                      null
                    }
                    customAvailabilityDateRange={''}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side: Telegram messaging panel */}
        <div className="telegram-panel" style={{ 
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 2px 4px var(--shadow)',
          padding: '0',
          position: 'sticky',
          top: '1rem',
          overflow: 'hidden',
          maxHeight: '600px'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--hover-bg)'
          }}>
            <span style={{ 
              color: 'var(--accent)', 
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Telegram
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Messaging
            </span>
          </div>

          {/* Content */}
          <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
            {/* Message composition area */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Message
              </label>
              <textarea
                value={telegramMessage}
                onChange={(e) => setTelegramMessage(e.target.value)}
                placeholder="Type your message here..."
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              />
            </div>

            {/* Worker selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Send to
              </label>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid var(--border)', 
                borderRadius: '8px',
                background: 'var(--card-bg)'
              }}>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={sendToAll}
                      onChange={(e) => setSendToAll(e.target.checked)}
                      style={{ transform: 'scale(1.1)', cursor: 'pointer' }} 
                    />
                    All Workers ({workersWithTelegram.length} with Telegram)
                  </label>
                </div>
                {!sendToAll && workersWithTelegram.map(worker => (
                  <div key={worker.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedWorkers.has(worker.id)}
                        onChange={(e) => handleWorkerSelection(worker.id, e.target.checked)}
                        style={{ transform: 'scale(1.1)', cursor: 'pointer' }} 
                      />
                      {worker.full_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleSendTelegramMessage}
                disabled={!telegramMessage.trim() || (!sendToAll && selectedWorkers.size === 0)}
                className="btn btn-primary"
                style={{ 
                  flex: '1', 
                  fontSize: '0.85rem', 
                  padding: '0.6rem',
                  borderRadius: '25px',
                  background: 'var(--accent)',
                  color: 'white',
                  opacity: (!sendToAll && selectedWorkers.size === 0) ? 0.5 : 1,
                  cursor: (!telegramMessage.trim() || (!sendToAll && selectedWorkers.size === 0)) ? 'not-allowed' : 'pointer'
                }}
              >
                Send Message
              </button>
              <button 
                onClick={handleClearTelegramMessage}
                className="btn btn-secondary"
                style={{ 
                  fontSize: '0.85rem', 
                  padding: '0.6rem 1rem',
                  borderRadius: '25px'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Modal */}
      {showWorkerModal && (
        <div className="modal-overlay" onClick={() => setShowWorkerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h3>
              <button 
                className="btn-cancel-x"
                onClick={() => {
                  setShowWorkerModal(false);
                  setEditingWorker(null);
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                Worker editing functionality will be implemented here.
                <br />
                <strong>Worker:</strong> {editingWorker?.full_name}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowWorkerModal(false);
                    setEditingWorker(null);
                  }}
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  Close
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    toast.success(`Worker ${editingWorker?.full_name} would be saved here`);
                    setShowWorkerModal(false);
                    setEditingWorker(null);
                  }}
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && selectedWorker && (
        <AvailabilityModal
          worker={selectedWorker}
          initialAvailabilityData={allAvailabilityData[selectedWorker.id]}
          onClose={() => setShowAvailabilityModal(false)}
        />
      )}
    </div>
  );
};

// Full Availability Modal Component
const AvailabilityModal = ({ worker, onClose, initialAvailabilityData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [loadingUnavailability, setLoadingUnavailability] = useState(false);
  const queryClient = useQueryClient();

  // Availability state - now supports split availability
  const [availabilityRules, setAvailabilityRules] = useState(() => {
    const rules = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Initialize with existing data or defaults
    if (initialAvailabilityData?.weeklyAvailability) {
      Object.entries(initialAvailabilityData.weeklyAvailability).forEach(([day, data]) => {
        const dayIndex = days.indexOf(day);
        if (dayIndex !== -1) {
          const isFullDay = data.from_time === '00:00:00' && (data.to_time === '23:59:00' || data.to_time === '24:00:00');
          
          rules[dayIndex] = {
            available: data.available || false,
            isFullDay: isFullDay,
            timeRanges: [
              {
                fromTime: data.from_time ? data.from_time.slice(0, 5) : '06:00',
                toTime: data.to_time ? data.to_time.slice(0, 5) : '14:00',
                enabled: true
              },
              {
                fromTime: '18:00',
                toTime: '23:00',
                enabled: false
              }
            ]
          };
        }
      });
    }
    
    // Also check for raw availability rules data (new format)
    if (initialAvailabilityData?.rules && Array.isArray(initialAvailabilityData.rules)) {
      initialAvailabilityData.rules.forEach(rule => {
        // Backend uses 0=Sunday, 1=Monday, etc.
        // Frontend now uses 0=Monday, 1=Tuesday, ..., 6=Sunday
        // Convert: backend 0 (Sunday) -> frontend 6, backend 1 (Monday) -> frontend 0, etc.
        const backendWeekday = rule.weekday;
        const dayIndex = backendWeekday === 0 ? 6 : backendWeekday - 1;
        if (dayIndex >= 0 && dayIndex <= 6) {
          if (!rules[dayIndex]) {
            rules[dayIndex] = {
              available: false,
              isFullDay: false,
              timeRanges: [
                { fromTime: '06:00', toTime: '14:00', enabled: false },
                { fromTime: '18:00', toTime: '23:00', enabled: false }
              ]
            };
          }
          
          rules[dayIndex].available = true;
          
          if (rule.is_full_day) {
            rules[dayIndex].isFullDay = true;
          } else {
            const sequenceNumber = rule.sequence_number || 1;
            const rangeIndex = sequenceNumber - 1;
            
            if (rangeIndex < rules[dayIndex].timeRanges.length) {
            rules[dayIndex].timeRanges[rangeIndex] = {
              fromTime: rule.from_time ? rule.from_time.slice(0, 5) : '06:00',
              toTime: rule.to_time ? rule.to_time.slice(0, 5) : '14:00',
              enabled: true
            };
            }
          }
        }
      });
    }
    
    // Fill in missing days with defaults
    for (let i = 0; i < 7; i++) {
      if (!rules[i]) {
        rules[i] = {
          available: false,
          isFullDay: false,
          timeRanges: [
            {
              fromTime: '06:00',
              toTime: '14:00',
              enabled: false
            },
            {
              fromTime: '18:00',
              toTime: '23:00',
              enabled: false
            }
          ]
        };
      }
    }
    
    return rules;
  });

  // Unavailability state
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState([]);
  const [newUnavailability, setNewUnavailability] = useState({
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Load existing unavailability periods
  useEffect(() => {
    const loadUnavailability = async () => {
      setLoadingUnavailability(true);
      try {
        const response = await axios.get(`${API}/workers/${worker.id}/unavailability`);
        setUnavailabilityPeriods(response.data || []);
      } catch (error) {
        console.error('Error loading unavailability periods:', error);
        toast.error('Failed to load unavailability periods');
      } finally {
        setLoadingUnavailability(false);
      }
    };

    loadUnavailability();
  }, [worker.id]);

  const handleAvailabilityChange = (dayIndex, field, value) => {
    setAvailabilityRules(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [field]: value
      }
    }));
  };

  const handleTimeRangeChange = (dayIndex, rangeIndex, field, value) => {
    setAvailabilityRules(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        timeRanges: prev[dayIndex].timeRanges.map((range, index) => 
          index === rangeIndex ? { ...range, [field]: value } : range
        )
      }
    }));
  };

  const handleSaveAvailability = async () => {
    setIsSaving(true);
    try {
      // Convert availability rules to backend format
      const rules = [];
      Object.entries(availabilityRules).forEach(([dayIndex, rule]) => {
        if (rule.available) {
          // Convert frontend index to backend weekday
          // Frontend: 0=Monday, 1=Tuesday, ..., 6=Sunday
          // Backend: 0=Sunday, 1=Monday, 2=Tuesday, etc.
          const frontendIndex = parseInt(dayIndex);
          const backendWeekday = frontendIndex === 6 ? 0 : frontendIndex + 1;
          
          if (rule.isFullDay) {
            // Full day availability
            rules.push({
              weekday: backendWeekday,
              sequence_number: 1,
              from_time: '00:00',
              to_time: '23:59',
              is_full_day: true,
              wraps_midnight: false,
              rule_type: 'full_day'
            });
          } else {
            // Split availability - create separate rules for each enabled time range
            rule.timeRanges.forEach((timeRange, index) => {
              if (timeRange.enabled) {
                rules.push({
                  weekday: backendWeekday,
                  sequence_number: index + 1,
                  from_time: timeRange.fromTime,
                  to_time: timeRange.toTime,
                  is_full_day: false,
                  wraps_midnight: false,
                  rule_type: index === 0 ? 'morning' : 'evening'
                });
              }
            });
          }
        }
      });

      await axios.post(`${API}/workers/${worker.id}/availability`, { rules });
      toast.success(`Availability for ${worker.full_name} saved successfully!`);
      
      // Refresh the query cache
      queryClient.invalidateQueries(['workers']);
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUnavailability = async () => {
    if (!newUnavailability.fromDate || !newUnavailability.toDate) {
      toast.error('Please select both from and to dates');
      return;
    }

    try {
      const response = await axios.post(`${API}/workers/${worker.id}/unavailability`, {
        from_date: newUnavailability.fromDate,
        to_date: newUnavailability.toDate,
        reason: newUnavailability.reason || 'Other'
      });

      setUnavailabilityPeriods(prev => [...prev, response.data]);
      setNewUnavailability({ fromDate: '', toDate: '', reason: '' });
      toast.success('Unavailability period added successfully!');
    } catch (error) {
      console.error('Error adding unavailability period:', error);
      toast.error('Failed to add unavailability period');
    }
  };

  const handleDeleteUnavailability = async (periodId) => {
    try {
      await axios.delete(`${API}/unavailability/${periodId}`);
      setUnavailabilityPeriods(prev => prev.filter(p => p.id !== periodId));
      toast.success('Unavailability period deleted successfully!');
    } catch (error) {
      console.error('Error deleting unavailability period:', error);
      toast.error('Failed to delete unavailability period');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
        <div className="modal-header" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Availability: {worker.full_name}</h3>
          <button 
            className="btn-cancel-x" 
            onClick={onClose} 
            style={{ 
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              padding: '0.2rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ padding: '0.75rem', overflow: 'auto', paddingBottom: '0.5rem', flex: 1 }}>
          {/* Weekly Availability Section */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.25rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600' }}>Weekly Availability</h4>
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              {days.map((day, index) => (
                <div key={index} style={{ 
                  padding: '0.4rem 0.5rem',
                  background: 'var(--hover-bg)',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  minHeight: '40px'
                }}>
                  {/* Day checkbox - fixed width */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500', width: '80px', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={availabilityRules[index]?.available || false}
                      onChange={(e) => handleAvailabilityChange(index, 'available', e.target.checked)}
                      style={{ transform: 'scale(1.1)' }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{day}</span>
                  </label>
                  
                  {/* Full day option - fixed width */}
                  {availabilityRules[index]?.available && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '80px', flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={availabilityRules[index]?.isFullDay || false}
                        onChange={(e) => {
                          const isFullDay = e.target.checked;
                          handleAvailabilityChange(index, 'isFullDay', isFullDay);
                        }}
                        style={{ transform: 'scale(1.1)' }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>Full</span>
                    </label>
                  )}
                  
                  {/* Two time ranges - compact layout */}
                  {availabilityRules[index]?.available && !availabilityRules[index]?.isFullDay && (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                      {availabilityRules[index]?.timeRanges?.map((timeRange, rangeIndex) => (
                        <div key={rangeIndex} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.2rem',
                          flex: 1,
                          minWidth: 0
                        }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.75rem', width: '28px', flexShrink: 0 }}>
                            <input
                              type="checkbox"
                              checked={timeRange.enabled || false}
                              onChange={(e) => handleTimeRangeChange(index, rangeIndex, 'enabled', e.target.checked)}
                              style={{ transform: 'scale(1.1)' }}
                            />
                            <span>{rangeIndex === 0 ? '1st' : '2nd'}</span>
                          </label>
                          
                          {timeRange.enabled && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1 }}>
                              <select
                                value={timeRange.fromTime || (rangeIndex === 0 ? '06:00' : '18:00')}
                                onChange={(e) => handleTimeRangeChange(index, rangeIndex, 'fromTime', e.target.value)}
                                style={{ 
                                  padding: '0.4rem 0.5rem', 
                                  borderRadius: '4px', 
                                  border: '1px solid var(--border)', 
                                  fontSize: '1rem',
                                  width: '90px',
                                  background: 'var(--card-bg)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                              >
                                {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>-</span>
                              <select
                                value={timeRange.toTime || (rangeIndex === 0 ? '14:00' : '23:00')}
                                onChange={(e) => handleTimeRangeChange(index, rangeIndex, 'toTime', e.target.value)}
                                style={{ 
                                  padding: '0.4rem 0.5rem', 
                                  borderRadius: '4px', 
                                  border: '1px solid var(--border)', 
                                  fontSize: '1rem',
                                  width: '90px',
                                  background: 'var(--card-bg)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                              >
                                {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Unavailability Periods Section */}
          <div style={{ marginBottom: '0.5rem' }}>
            <h4 style={{ marginBottom: '0.25rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600' }}>Unavailability Periods</h4>
            
            {/* Add new unavailability - compact form */}
            <div style={{ 
              padding: '0.5rem', 
              background: 'var(--hover-bg)', 
              borderRadius: '4px', 
              border: '1px solid var(--border)',
              marginBottom: '0.5rem'
            }}>
              <h5 style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Add Period</h5>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From:</label>
                  <input
                    type="date"
                    value={newUnavailability.fromDate}
                    onChange={(e) => setNewUnavailability(prev => ({ ...prev, fromDate: e.target.value }))}
                    style={{ padding: '0.25rem', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '120px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To:</label>
                  <input
                    type="date"
                    value={newUnavailability.toDate}
                    onChange={(e) => setNewUnavailability(prev => ({ ...prev, toDate: e.target.value }))}
                    style={{ padding: '0.25rem', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '120px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reason:</label>
                  <input
                    type="text"
                    value={newUnavailability.reason}
                    onChange={(e) => setNewUnavailability(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Optional"
                    style={{ flex: 1, padding: '0.25rem', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '0.8rem' }}
                  />
                </div>
                <button
                  onClick={handleAddUnavailability}
                  className="btn btn-primary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* List existing periods - compact view */}
            <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
              {loadingUnavailability ? (
                <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading...</div>
              ) : unavailabilityPeriods.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No periods set</div>
              ) : (
                unavailabilityPeriods.map((period) => (
                  <div key={period.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.3rem 0.5rem',
                    background: 'var(--card-bg)',
                    borderRadius: '3px',
                    border: '1px solid var(--border)',
                    marginBottom: '0.25rem',
                    fontSize: '0.8rem'
                  }}>
                    <div>
                      <strong>{new Date(period.from_date).toLocaleDateString()}</strong> - <strong>{new Date(period.to_date).toLocaleDateString()}</strong>
                      {period.reason && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({period.reason})</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteUnavailability(period.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Buttons - fixed at bottom */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center', 
          padding: '0.75rem 1rem', 
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--card-bg)'
        }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveAvailability}
            disabled={isSaving}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {isSaving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffTab;
