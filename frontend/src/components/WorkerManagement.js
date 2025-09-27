import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { X, Edit, Trash2, Plus, Calendar, MessageCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkerManagement = ({ workers, locations, onWorkerUpdate }) => {
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showUnavailabilityModal, setShowUnavailabilityModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);
  const queryClient = useQueryClient();

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
      onWorkerUpdate();
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
      onWorkerUpdate();
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
      toast.success('Worker deactivated successfully');
      onWorkerUpdate();
    },
    onError: (error) => {
      toast.error(`Failed to deactivate worker: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Fetch worker availability
  const { data: workerAvailability = [] } = useQuery({
    queryKey: ['availability', selectedWorker?.id],
    queryFn: async () => {
      if (!selectedWorker) return [];
      const response = await axios.get(`${API}/workers/${selectedWorker.id}/availability`);
      return response.data;
    },
    enabled: !!selectedWorker
  });

  // Fetch worker unavailability
  const { data: workerUnavailability = [] } = useQuery({
    queryKey: ['unavailability', selectedWorker?.id],
    queryFn: async () => {
      if (!selectedWorker) return [];
      const response = await axios.get(`${API}/workers/${selectedWorker.id}/unavailability`);
      return response.data;
    },
    onError: (error) => {
      console.error('Error fetching unavailability:', error);
    },
    enabled: !!selectedWorker
  });

  // Set availability mutation
  const setAvailabilityMutation = useMutation({
    mutationFn: async ({ workerId, availabilityData }) => {
      const response = await axios.post(`${API}/workers/${workerId}/availability`, availabilityData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Availability updated successfully');
      queryClient.invalidateQueries(['availability', selectedWorker?.id]);
    },
    onError: (error) => {
      toast.error(`Failed to update availability: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Add unavailability mutation
  const addUnavailabilityMutation = useMutation({
    mutationFn: async ({ workerId, unavailabilityData }) => {
      const response = await axios.post(`${API}/workers/${workerId}/unavailability`, unavailabilityData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Unavailability period added successfully');
      queryClient.invalidateQueries(['unavailability', selectedWorker?.id]);
      setShowUnavailabilityModal(false);
    },
    onError: (error) => {
      toast.error(`Failed to add unavailability: ${error.response?.data?.detail || error.message}`);
    }
  });

  const handleWorkerSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const workerData = {
      code: formData.get('code'),
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      max_hours: parseInt(formData.get('max_hours')) || null,
      car: formData.get('car'),
      skills: formData.get('skills'),
      sex: formData.get('sex'),
      telegram: parseInt(formData.get('telegram')) || null
    };

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
    if (window.confirm(`Are you sure you want to deactivate ${worker.full_name}?`)) {
      deleteWorkerMutation.mutate(worker.id);
    }
  };

  const handleManageAvailability = (worker) => {
    setSelectedWorker(worker);
    setShowAvailabilityModal(true);
  };

  const handleManageUnavailability = (worker) => {
    setSelectedWorker(worker);
    setShowUnavailabilityModal(true);
  };

  const handleAvailabilitySubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Process each day of the week
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    weekdays.forEach((day, index) => {
      const isFullDay = formData.get(`${day}_full_day`) === 'on';
      const fromTime = formData.get(`${day}_from_time`);
      const toTime = formData.get(`${day}_to_time`);
      
      if (isFullDay || (fromTime && toTime)) {
        const availabilityData = {
          weekday: index, // 0 = Sunday, 1 = Monday, etc.
          is_full_day: isFullDay,
          from_time: isFullDay ? null : fromTime,
          to_time: isFullDay ? null : toTime,
          wraps_midnight: toTime && fromTime && toTime < fromTime
        };
        
        setAvailabilityMutation.mutate({ 
          workerId: selectedWorker.id, 
          availabilityData 
        });
      }
    });
  };

  const handleUnavailabilitySubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const unavailabilityData = {
      from_date: formData.get('from_date'),
      to_date: formData.get('to_date'),
      reason: formData.get('reason')
    };
    
    addUnavailabilityMutation.mutate({ 
      workerId: selectedWorker.id, 
      unavailabilityData 
    });
  };

  const handleSendTelegramMessage = (worker) => {
    const message = prompt(`Send message to ${worker.full_name}:`);
    if (message) {
      // Call API to send telegram message
      fetch(`${API}/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: worker.id,
          message: message,
          urgent: false
        })
      })
      .then(() => toast.success(`Message sent to ${worker.full_name}`))
      .catch(() => toast.error('Failed to send message'));
    }
  };

  return (
    <div>
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Support Workers</h3>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowWorkerModal(true)}
          >
            <Plus size={16} /> Add Worker
          </button>
        </div>
        
        <div className="workers-grid">
          {workers.map(worker => (
            <div key={worker.id} className="worker-card">
              <div className="worker-header">
                <div>
                  <div className="worker-name">{worker.full_name}</div>
                  <div className="worker-details">
                    Max Hours: {worker.max_hours || 'Not set'} | Status: {worker.status}
                  </div>
                  <div className="worker-details">
                    {worker.email && `📧 ${worker.email}`}
                  </div>
                  <div className="worker-details">
                    {worker.phone && `📱 ${worker.phone}`}
                  </div>
                  <div className="worker-details">
                    🚗 {worker.car || 'Not specified'} | 🎯 {worker.skills || 'None listed'}
                  </div>
                  {worker.telegram && (
                    <div className="worker-details" style={{ color: 'var(--accent-primary)' }}>
                      📱 Telegram: {worker.telegram}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="worker-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleEditWorker(worker)}
                >
                  <Edit size={14} /> Edit
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleManageAvailability(worker)}
                >
                  <Calendar size={14} /> Availability
                </button>
                <button 
                  className="btn btn-warning btn-sm"
                  onClick={() => handleManageUnavailability(worker)}
                >
                  <Calendar size={14} /> Unavailable
                </button>
                {worker.telegram && (
                  <button className="btn btn-secondary btn-sm">
                    <MessageCircle size={14} /> Message
                  </button>
                )}
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteWorker(worker)}
                >
                  <Trash2 size={14} /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Worker Form Modal */}
      {showWorkerModal && (
        <div className="modal-overlay" onClick={() => setShowWorkerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowWorkerModal(false);
                  setEditingWorker(null);
                }}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleWorkerSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Worker Code *</label>
                    <input 
                      type="text" 
                      name="code" 
                      defaultValue={editingWorker?.code || ''}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input 
                      type="text" 
                      name="full_name" 
                      defaultValue={editingWorker?.full_name || ''}
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      defaultValue={editingWorker?.email || ''}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input 
                      type="text" 
                      name="phone" 
                      defaultValue={editingWorker?.phone || ''}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Max Hours per Week</label>
                    <input 
                      type="number" 
                      name="max_hours" 
                      min="0" 
                      max="168"
                      defaultValue={editingWorker?.max_hours || ''}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Has Car</label>
                    <select name="car" defaultValue={editingWorker?.car || ''}>
                      <option value="">Not specified</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select name="sex" defaultValue={editingWorker?.sex || ''}>
                      <option value="">Not specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telegram ID</label>
                    <input 
                      type="text" 
                      name="telegram" 
                      defaultValue={editingWorker?.telegram || ''}
                      placeholder="e.g., 1234567890"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Skills</label>
                  <textarea 
                    name="skills" 
                    rows="3"
                    defaultValue={editingWorker?.skills || ''}
                    placeholder="e.g., ADLs, Manual Handling, Driving, First Aid"
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  {editingWorker ? 'Update Worker' : 'Create Worker'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowWorkerModal(false);
                    setEditingWorker(null);
                  }}
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
        <div className="modal-overlay" onClick={() => setShowAvailabilityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Availability - {selectedWorker.full_name}</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAvailabilityModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAvailabilitySubmit}>
              <div className="modal-body">
                <div className="availability-grid">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                    const dayLower = day.toLowerCase();
                    const existing = workerAvailability.find(a => a.weekday === index);
                    
                    return (
                      <div key={day} className="day-availability">
                        <div className="day-name">{day}</div>
                        
                        <div style={{ marginBottom: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input 
                              type="checkbox" 
                              name={`${dayLower}_full_day`}
                              defaultChecked={existing?.is_full_day || false}
                            />
                            Full Day
                          </label>
                        </div>
                        
                        <div className="time-inputs">
                          <input 
                            type="time" 
                            name={`${dayLower}_from_time`}
                            defaultValue={existing?.from_time || ''}
                            placeholder="From"
                          />
                          <input 
                            type="time" 
                            name={`${dayLower}_to_time`}
                            defaultValue={existing?.to_time || ''}
                            placeholder="To"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Update Availability
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAvailabilityModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unavailability Modal */}
      {showUnavailabilityModal && selectedWorker && (
        <div className="modal-overlay" onClick={() => setShowUnavailabilityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Unavailability - {selectedWorker.full_name}</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowUnavailabilityModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleUnavailabilitySubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">From Date *</label>
                    <input 
                      type="date" 
                      name="from_date" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Date *</label>
                    <input 
                      type="date" 
                      name="to_date" 
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <select name="reason" required>
                    <option value="">Select reason...</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Personal">Personal Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                {/* Show existing unavailability periods */}
                {workerUnavailability.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                      Current Unavailability Periods
                    </h4>
                    {workerUnavailability.map(period => (
                      <div key={period.id} style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <strong>{period.reason}</strong>: {period.from_date} to {period.to_date}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Add Unavailability
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowUnavailabilityModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerManagement;