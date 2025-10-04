import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { X, Edit, Trash2, Plus, Calendar } from 'lucide-react';
import WorkerCard from './WorkerCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkerManagement = ({ workers = [], locations = [], onWorkersUpdate }) => {
  // Batch availability data - fetch once for all workers to avoid 48 sequential API calls
  const [allAvailabilityData, setAllAvailabilityData] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  
  // When availability is saved in the modal, we bump this key so WorkerCard re-fetches
  const [cardsRefreshKey, setCardsRefreshKey] = useState(0);
  // Filter state (search removed per request)
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'unavailable'

  // Sort workers alphabetically by full name
  const sortedWorkers = [...workers].sort((a, b) => 
    (a.full_name || '').localeCompare(b.full_name || '')
  );

  // Apply filters (no name search)
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
  
  // Weekly availability state (0=Sunday, 1=Monday, ..., 6=Saturday)
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    0: { available: true, from_time: '09:00', to_time: '17:00' }, // Sunday
    1: { available: true, from_time: '09:00', to_time: '17:00' }, // Monday
    2: { available: true, from_time: '09:00', to_time: '17:00' }, // Tuesday
    3: { available: true, from_time: '09:00', to_time: '17:00' }, // Wednesday
    4: { available: true, from_time: '09:00', to_time: '17:00' }, // Thursday
    5: { available: true, from_time: '09:00', to_time: '17:00' }, // Friday
    6: { available: true, from_time: '09:00', to_time: '17:00' }  // Saturday
  });
  
  const queryClient = useQueryClient();

  // Batch fetch availability data for all workers on mount and when workers change
  useEffect(() => {
    const fetchAllAvailability = async () => {
      if (!workers || workers.length === 0) {
        setAvailabilityLoading(false);
        return;
      }

      setAvailabilityLoading(true);

      try {
        // Fetch all availability and unavailability data in parallel (not sequential)
        const allPromises = workers.map(async (worker) => {
          try {
            const [availRes, unavailRes] = await Promise.all([
              axios.get(`${API}/workers/${worker.id}/availability`),
              axios.get(`${API}/workers/${worker.id}/unavailability`)
            ]);
            return {
              workerId: worker.id,
              availability: availRes.data || [],
              unavailability: unavailRes.data || []
            };
          } catch (error) {
            console.error(`Failed to fetch availability for worker ${worker.id}:`, error);
            return {
              workerId: worker.id,
              availability: [],
              unavailability: []
            };
          }
        });

        const results = await Promise.all(allPromises);
        
        // Convert array to object keyed by workerId for fast lookup
        const availabilityMap = {};
        results.forEach(result => {
          availabilityMap[result.workerId] = {
            availability: result.availability,
            unavailability: result.unavailability
          };
        });

        setAllAvailabilityData(availabilityMap);
      } catch (error) {
        console.error('Failed to batch fetch availability:', error);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAllAvailability();
  }, [workers, cardsRefreshKey]); // Re-fetch when workers change or refresh key bumps

  // Create worker mutation
  const createWorkerMutation = useMutation({
    mutationFn: async (workerData) => {
      const response = await axios.post(`${API}/workers`, workerData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Worker created successfully');
      setShowWorkerModal(false);
      setEditingWorker(null);
      // Invalidate all related queries
      queryClient.invalidateQueries(['workers']);
      queryClient.invalidateQueries(['participants']);
      // Don't invalidate roster queries as worker changes don't affect existing roster data
      queryClient.refetchQueries(['workers']);
      if (onWorkersUpdate) onWorkersUpdate();
    },
    onError: (error) => {
      toast.error(`Failed to create worker: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Update worker mutation
  const updateWorkerMutation = useMutation({
    mutationFn: async ({ workerId, workerData }) => {
      const response = await axios.put(`${API}/workers/${workerId}`, workerData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Worker updated successfully');
      setShowWorkerModal(false);
      setEditingWorker(null);
      // Invalidate all related queries
      queryClient.invalidateQueries(['workers']);
      queryClient.invalidateQueries(['participants']);
      // Don't invalidate roster queries as worker changes don't affect existing roster data
      queryClient.refetchQueries(['workers']);
      if (onWorkersUpdate) onWorkersUpdate();
    },
    onError: (error) => {
      toast.error(`Failed to update worker: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Delete worker mutation
  const deleteWorkerMutation = useMutation({
    mutationFn: async (workerId) => {
      const response = await axios.delete(`${API}/workers/${workerId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Worker deleted successfully');
      // Invalidate all related queries
      queryClient.invalidateQueries(['workers']);
      queryClient.invalidateQueries(['participants']);
      // Don't invalidate roster queries as worker changes don't affect existing roster data
      queryClient.refetchQueries(['workers']);
    },
    onError: (error) => {
      toast.error(`Failed to deactivate worker: ${error.response?.data?.detail || error.message}`);
    }
  });

  const handleWorkerSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const workerData = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      max_hours: parseInt(formData.get('max_hours')) || null,
      car: formData.get('car'),
      skills: formData.get('skills'),
      sex: formData.get('sex'),
      telegram: formData.get('telegram') || null
    };

    // Only include code when editing
    if (editingWorker) {
      workerData.code = formData.get('code');
    }

    if (editingWorker) {
      updateWorkerMutation.mutate({ workerId: editingWorker.id, workerData });
    } else {
      createWorkerMutation.mutate(workerData);
    }
  };

  const handleEditWorker = (worker) => {
    setEditingWorker(worker);
    setShowWorkerModal(true);
  };

  const handleDeleteWorker = (worker) => {
    if (window.confirm(`⚠️ Are you sure you want to DELETE ${worker.full_name}?\n\nThis will deactivate the worker and they will no longer appear in the system.\n\nClick OK to confirm deletion or Cancel to abort.`)) {
      deleteWorkerMutation.mutate(worker.id);
    }
  };

  const handleCloseAvailabilityModal = async () => {
    setShowAvailabilityModal(false);
    const editedWorkerId = selectedWorker?.id;
    setSelectedWorker(null);
    
    // PERFORMANCE FIX: Only refresh the edited worker's data, not all 24 workers!
    // Re-fetch just this worker's availability and unavailability
    if (editedWorkerId) {
      try {
        const [availRes, unavailRes] = await Promise.all([
          axios.get(`${API}/workers/${editedWorkerId}/availability`),
          axios.get(`${API}/workers/${editedWorkerId}/unavailability`)
        ]);
        
        // Update only this worker's data in the batch cache
        setAllAvailabilityData(prev => ({
          ...prev,
          [editedWorkerId]: {
            availability: availRes.data || [],
            unavailability: unavailRes.data || []
          }
        }));
      } catch (error) {
        console.error(`Failed to refresh availability for worker ${editedWorkerId}:`, error);
      }
    }
    
    // Notify parent if needed (for roster updates)
    if (onWorkersUpdate) {
      onWorkersUpdate();
    }
    
    // NO LONGER bump cardsRefreshKey - this was causing ALL cards to refresh!
    // The targeted update above only refreshes the edited worker's card.
  };

  const handleManageAvailability = (worker) => {
    // Modal opens instantly - data already loaded from batch fetch
    setSelectedWorker(worker);
    setShowAvailabilityModal(true);
  };

  // Telegram functions
  const fetchTelegramStatus = async () => {
    try {
      const response = await axios.get(`${API}/telegram/status`);
      setTelegramStatus(response.data);
    } catch (error) {
      console.error('Error fetching Telegram status:', error);
      setTelegramStatus({ configured: false, coordinator_count: 0, bot_token_set: false });
    }
  };

  const handleSendTelegramMessage = async () => {
    if (!telegramMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      if (sendToAll) {
        // Broadcast to all workers
        const response = await axios.post(`${API}/telegram/broadcast`, {
          message: telegramMessage
        });
        toast.success(response.data.message);
      } else {
        // Send to selected workers
        if (selectedWorkers.size === 0) {
          toast.error('Please select at least one worker');
          return;
        }
        
        const workerIds = Array.from(selectedWorkers);
        const response = await axios.post(`${API}/telegram/send-message`, {
          worker_ids: workerIds,
          message: telegramMessage
        });
        toast.success(response.data.message);
      }
      
      // Clear message after sending
      setTelegramMessage('');
      
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      toast.error(`Failed to send message: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleClearTelegramMessage = () => {
    setTelegramMessage('');
    setSelectedWorkers(new Set());
    setSendToAll(false);
  };

  const handleWorkerSelection = (workerId, checked) => {
    const newSelection = new Set(selectedWorkers);
    if (checked) {
      newSelection.add(workerId);
    } else {
      newSelection.delete(workerId);
    }
    setSelectedWorkers(newSelection);
  };

  // Load Telegram status on component mount
  React.useEffect(() => {
    fetchTelegramStatus();
  }, []);

  // Removed handleUnavailabilitySubmit - unavailability is now handled in the availability modal

  return (
    <div>
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Support Workers</h3>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setEditingWorker(null);  // Clear any existing worker data
              setShowWorkerModal(true);
            }}
          >
            <Plus size={16} /> Add Worker
          </button>
        </div>

        {/* Worker cards - narrower layout without telegram panel */}
        <div className="workers-section" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {!filteredWorkers || filteredWorkers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              {!workers ? 'Loading workers...' : 'No workers found. Click "Add Worker" to create the first worker.'}
            </div>
          ) : (
            <div className="workers-grid">
              {filteredWorkers.map(worker => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  refreshKey={cardsRefreshKey}
                  onEdit={handleEditWorker}
                  onManageAvailability={handleManageAvailability}
                  onDelete={handleDeleteWorker}
                  availabilityData={allAvailabilityData[worker.id]}
                  isLoading={availabilityLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* Filter Bar removed per request */}

        {/* Workers Details Table removed per request */}
      </div>

      {/* Worker Modal */}
      {showWorkerModal && (
        <div className="modal-overlay" onClick={() => setShowWorkerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', padding: '2rem' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h3>
              <button 
                className="btn-cancel-x"
                onClick={() => {
                  setShowWorkerModal(false);
                  setEditingWorker(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleWorkerSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Worker Code</label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingWorker?.code || ''}
                  placeholder={editingWorker ? 'Edit code' : 'Auto-generated'}
                  disabled={!editingWorker}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: editingWorker ? 'var(--bg-input)' : 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                />
                {!editingWorker && <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Code will be auto-generated (e.g., SW001, SW002)</small>}
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  defaultValue={editingWorker?.full_name || ''}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingWorker?.email || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={editingWorker?.phone || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Max Hours</label>
                <input
                  type="number"
                  name="max_hours"
                  min="0"
                  max="60"
                  defaultValue={editingWorker?.max_hours || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Maximum 60 hours per week</small>
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Skills</label>
                <input
                  type="text"
                  name="skills"
                  defaultValue={editingWorker?.skills || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Car</label>
                <select 
                  name="car" 
                  defaultValue={editingWorker?.car || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Gender</label>
                <select 
                  name="sex" 
                  defaultValue={editingWorker?.sex || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select...</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Telegram Username</label>
                <input
                  type="text"
                  name="telegram"
                  placeholder="@username or user ID"
                  defaultValue={editingWorker?.telegram || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Enter @username or Telegram user ID</small>
              </div>
              
              <div className="modal-actions" style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                >
                  {editingWorker ? 'Update Worker' : 'Create Worker'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowWorkerModal(false);
                    setEditingWorker(null);
                  }}
                  style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && selectedWorker && (
        <AvailabilityModal
          worker={selectedWorker}
          onClose={handleCloseAvailabilityModal}
          initialAvailabilityData={allAvailabilityData[selectedWorker.id]}
        />
      )}
    </div>
  );
};

// =================================================================================
// Availability Modal Component - Now uses pre-loaded data for instant opening!
// =================================================================================
const AvailabilityModal = ({ worker, onClose, initialAvailabilityData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState(null);
  const [existingUnavailability, setExistingUnavailability] = useState([]);
  const [unavailabilityData, setUnavailabilityData] = useState({ from: '', to: '' });
  const queryClient = useQueryClient();

  // Use pre-loaded data instead of fetching - MASSIVE performance gain!
  useEffect(() => {
    if (!initialAvailabilityData) {
      // Fallback: data not loaded yet (shouldn't happen)
      console.warn(`⚠️ No pre-loaded data for ${worker.full_name}, using defaults`);
      const defaultSchedule = {};
      for (let i = 0; i < 7; i++) {
        defaultSchedule[i] = { available: false, from_time: '09:00', to_time: '17:00' };
      }
      setWeeklyAvailability(defaultSchedule);
      setExistingUnavailability([]);
      return;
    }

    // Process availability data into a map for the UI controls
    const availabilityMap = {};
    const availData = initialAvailabilityData.availability || [];
    
    availData.forEach(rule => {
      availabilityMap[rule.weekday] = {
        available: true,
        from_time: rule.from_time || '09:00',
        to_time: rule.to_time || '17:00',
        is_full_day: rule.is_full_day || false
      };
    });

    // Ensure all 7 days are present in the state
    const fullSchedule = {};
    for (let i = 0; i < 7; i++) {
      fullSchedule[i] = availabilityMap[i] || { available: false, from_time: '09:00', to_time: '17:00' };
    }
    setWeeklyAvailability(fullSchedule);
    setExistingUnavailability(initialAvailabilityData.unavailability || []);
  }, [worker.id, initialAvailabilityData]);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save weekly availability
      const availabilityRules = Object.keys(weeklyAvailability)
        .filter(day => weeklyAvailability[day].available)
        .map(day => {
          const dayData = weeklyAvailability[day];
          const isFullDay = dayData.from_time === '00:00' && (dayData.to_time === '23:59' || dayData.to_time === '24:00');
          return {
            weekday: parseInt(day),
            from_time: isFullDay ? null : dayData.from_time,
            to_time: isFullDay ? null : dayData.to_time,
            is_full_day: isFullDay,
          };
        });

      await axios.post(`${API}/workers/${worker.id}/availability`, { rules: availabilityRules });
      
      // 2. Save new unavailability period if entered
      if (unavailabilityData.from && unavailabilityData.to) {
        await axios.post(`${API}/workers/${worker.id}/unavailability`, {
          from_date: unavailabilityData.from,
          to_date: unavailabilityData.to,
        });
      }
      
      toast.success('Availability saved successfully!');
      
      // 3. THE FIX: Invalidate only the data for this specific worker.
      // This is extremely fast and will cause only the relevant WorkerCard to re-render.
      await queryClient.invalidateQueries({ queryKey: ['availability', worker.id] });
      await queryClient.invalidateQueries({ queryKey: ['unavailability', worker.id] });
      
      onClose(); // Close the modal

    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error(`Failed to save: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUnavailability = async (periodId) => {
    if (window.confirm('Are you sure you want to delete this unavailability period?')) {
      try {
        await axios.delete(`${API}/unavailability/${periodId}`);
        toast.success('Unavailability period deleted.');
        setExistingUnavailability(prev => prev.filter(p => p.id !== periodId)); // Update UI instantly

        // Invalidate this worker's unavailability query to ensure consistency
        await queryClient.invalidateQueries({ queryKey: ['unavailability', worker.id] });

      } catch (error) {
        console.error('Error deleting unavailability:', error);
        toast.error(`Failed to delete: ${error.response?.data?.detail || error.message}`);
      }
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '90vw' }}>
            <div className="modal-header">
          <h3>Availability - {worker.full_name}</h3>
          <button className="btn-cancel-x" onClick={onClose}><X size={20} /></button>
            </div>
            
        {!weeklyAvailability ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
        ) : (
            <div style={{ padding: '1rem' }}>
              {/* Weekly availability schedule */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Weekly Schedule</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', maxWidth: '100%' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, displayIndex) => {
                  // Map display order (Mon=0, Tue=1, ..., Sun=6) to backend weekday (Mon=1, Tue=2, ..., Sun=0)
                  const weekdayNumber = displayIndex === 6 ? 0 : displayIndex + 1;
                  const dayData = weeklyAvailability[weekdayNumber];
                    return (
                      <div key={day} style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: '4px', minWidth: '110px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{day}</div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            checked={dayData.available}
                          onChange={(e) => setWeeklyAvailability(prev => ({ ...prev, [weekdayNumber]: { ...prev[weekdayNumber], available: e.target.checked } }))}
                            style={{ marginRight: '0.25rem' }} 
                          />
                          <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Available</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <input 
                            type="time" 
                            value={dayData.from_time}
                            onChange={(e) => setWeeklyAvailability(prev => ({ ...prev, [weekdayNumber]: { ...prev[weekdayNumber], from_time: e.target.value } }))}
                            disabled={!dayData.available}
                            step="900"
                            style={{ 
                              width: '100%', 
                              minWidth: '105px',
                              maxWidth: '110px',
                              fontSize: '0.85rem', 
                              padding: '0.35rem 0.3rem', 
                              marginBottom: '0.25rem', 
                              background: dayData.available ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', 
                              border: '1px solid var(--border-color)', 
                              color: 'var(--text-primary)', 
                              opacity: dayData.available ? 1 : 0.5,
                              textAlign: 'center',
                              cursor: dayData.available ? 'pointer' : 'not-allowed'
                            }} 
                          />
                          <div style={{ margin: '0.25rem 0', fontSize: '0.7rem' }}>to</div>
                          <input 
                            type="time" 
                            value={dayData.to_time}
                            onChange={(e) => setWeeklyAvailability(prev => ({ ...prev, [weekdayNumber]: { ...prev[weekdayNumber], to_time: e.target.value } }))}
                            disabled={!dayData.available}
                            step="900"
                            style={{ 
                              width: '100%', 
                              minWidth: '105px',
                              maxWidth: '110px',
                              fontSize: '0.85rem', 
                              padding: '0.35rem 0.3rem', 
                              background: dayData.available ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', 
                              border: '1px solid var(--border-color)', 
                              color: 'var(--text-primary)', 
                              opacity: dayData.available ? 1 : 0.5,
                              textAlign: 'center',
                              cursor: dayData.available ? 'pointer' : 'not-allowed'
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
            {/* Unavailable periods */}
              <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Unavailable Periods</h4>
                
                {existingUnavailability.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                  <h5 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Current Periods:</h5>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '4px' }}>
                    {existingUnavailability.map((period) => (
                      <div key={period.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                          <span style={{ fontSize: '0.85rem' }}>
                          📅 {period.from_date} to {period.to_date}
                          </span>
                        <button onClick={() => handleDeleteUnavailability(period.id)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', padding: '0.2rem 0.4rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              <h5 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Add New Period:</h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>From Date</label>
                    <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={unavailabilityData.from}
                      onChange={(e) => setUnavailabilityData(prev => ({ ...prev, from: e.target.value }))}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      style={{
                          width: '100%', 
                          padding: '0.75rem 3rem 0.75rem 0.75rem',
                          borderRadius: '6px', 
                          border: '2px solid var(--border-color)', 
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = '#D4A574'}
                        onMouseLeave={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        onFocus={(e) => e.target.style.borderColor = '#D4A574'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                      />
                      <Calendar 
                        size={20} 
                        style={{ 
                          position: 'absolute', 
                          right: '0.75rem', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          color: '#D4A574',
                          pointerEvents: 'none'
                        }} 
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>To Date</label>
                    <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={unavailabilityData.to}
                      onChange={(e) => setUnavailabilityData(prev => ({ ...prev, to: e.target.value }))}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      style={{
                          width: '100%', 
                          padding: '0.75rem 3rem 0.75rem 0.75rem',
                          borderRadius: '6px', 
                          border: '2px solid var(--border-color)', 
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = '#D4A574'}
                        onMouseLeave={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        onFocus={(e) => e.target.style.borderColor = '#D4A574'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                      />
                      <Calendar 
                        size={20} 
                      style={{
                          position: 'absolute', 
                          right: '0.75rem', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          color: '#D4A574',
                          pointerEvents: 'none'
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
              <button className="btn btn-primary" disabled={isSaving} onClick={handleSave}>
                {isSaving ? '💾 Saving...' : 'Save Changes'}
                </button>
              <button className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default WorkerManagement;