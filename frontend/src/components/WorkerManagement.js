import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { X, Edit, Trash2, Plus, Calendar, MessageCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkerManagement = ({ workers = [], locations = [], onWorkerUpdate }) => {
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
      if (onWorkerUpdate) onWorkerUpdate();
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
      if (onWorkerUpdate) onWorkerUpdate();
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
      if (onWorkerUpdate) onWorkerUpdate();
    },
    onError: (error) => {
      toast.error(`Failed to deactivate worker: ${error.response?.data?.detail || error.message}`);
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

  const handleSendTelegramMessage = (worker) => {
    const message = prompt(`Send message to ${worker.full_name}:`);
    if (message && message.trim()) {
      // Actually send the message via API
      fetch(`${API}/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: worker.id,
          message: message,
          urgent: false
        })
      })
      .then(response => {
        if (response.ok) {
          toast.success(`Message sent to ${worker.full_name}`);
        } else {
          throw new Error('Failed to send message');
        }
      })
      .catch(() => {
        toast.error('Failed to send message');
      });
    }
  };

  const handleUnavailabilitySubmit = (workerId) => {
    if (unavailabilityData.from && unavailabilityData.to && unavailabilityData.reason) {
      const worker = workers.find(w => w.id === workerId);
      toast.success(`${worker?.full_name} marked unavailable from ${unavailabilityData.from} to ${unavailabilityData.to}: ${unavailabilityData.reason}`);
      setUnavailabilityData({ from: '', to: '', reason: '' });
      setShowUnavailability(prev => ({ ...prev, [workerId]: false }));
    } else {
      toast.error('Please fill all fields');
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
        
        {!workers || workers.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            {!workers ? 'Loading workers...' : 'No workers found. Click "Add Worker" to create the first worker.'}
          </div>
        ) : (
          <div className="workers-grid">
            {workers.map(worker => (
              <div key={worker.id} className="worker-card">
                <div className="worker-header">
                  <div>
                    <div className="worker-name">{worker.full_name}</div>
                    <div className="worker-details">
                      Max Hours: {worker.max_hours || 'Not set'} | Status: {worker.status || 'Active'}
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
                    <div className="worker-details" style={{ color: 'var(--accent-primary)' }}>
                      📱 Telegram: {worker.telegram || 'Not set'}
                    </div>
                  </div>
                </div>
                
                <div className="worker-actions">
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditWorker(worker)}
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeleteWorker(worker)}
                    >
                      <Trash2 size={14} /> Deactivate
                    </button>
                  </div>
                  
                  {/* Clean availability section */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleManageAvailability(worker)}
                    >
                      <Calendar size={14} /> Availability
                    </button>
                    {worker.telegram && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSendTelegramMessage(worker)}
                      >
                        <MessageCircle size={14} /> Message
                      </button>
                    )}
                  </div>
                  
                  {/* Set unavailable section at bottom */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowUnavailability(prev => ({ ...prev, [worker.id]: !prev[worker.id] }))}
                    >
                      {showUnavailability[worker.id] ? 'Cancel' : 'Set Unavailable'}
                    </button>
                  </div>
                  
                  {/* Unavailable form - inline when opened */}
                  {showUnavailability[worker.id] && (
                    <div className="unavailability-form" style={{ 
                      background: 'var(--bg-input)', 
                      padding: '0.8rem', 
                      borderRadius: '4px',
                      marginTop: '0.5rem'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem', alignItems: 'end' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>From</label>
                          <input
                            type="date"
                            value={unavailabilityData.from}
                            onChange={(e) => setUnavailabilityData(prev => ({ ...prev, from: e.target.value }))}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: '0.8rem',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>To</label>
                          <input
                            type="date"
                            value={unavailabilityData.to}
                            onChange={(e) => setUnavailabilityData(prev => ({ ...prev, to: e.target.value }))}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: '0.8rem',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Reason</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              placeholder="Enter reason..."
                              value={unavailabilityData.reason}
                              onChange={(e) => setUnavailabilityData(prev => ({ ...prev, reason: e.target.value }))}
                              style={{
                                padding: '0.4rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                width: '120px'
                              }}
                            />
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleUnavailabilitySubmit(worker.id)}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Worker Modal */}
      {showWorkerModal && (
        <div className="modal-overlay" onClick={() => setShowWorkerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h3>
              <button 
                className="btn-cancel-x"
                onClick={() => setShowWorkerModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleWorkerSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Worker Code</label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={editingWorker?.code || ''}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    defaultValue={editingWorker?.full_name || ''}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingWorker?.email || ''}
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingWorker?.phone || ''}
                  />
                </div>
                
                <div className="form-group">
                  <label>Max Hours</label>
                  <input
                    type="number"
                    name="max_hours"
                    defaultValue={editingWorker?.max_hours || ''}
                  />
                </div>
                
                <div className="form-group">
                  <label>Car</label>
                  <input
                    type="text"
                    name="car"
                    defaultValue={editingWorker?.car || ''}
                  />
                </div>
                
                <div className="form-group">
                  <label>Skills</label>
                  <input
                    type="text"
                    name="skills"
                    defaultValue={editingWorker?.skills || ''}
                  />
                </div>
                
                <div className="form-group">
                  <label>Gender</label>
                  <select name="sex" defaultValue={editingWorker?.sex || ''}>
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Telegram Number</label>
                  <input
                    type="number"
                    name="telegram"
                    defaultValue={editingWorker?.telegram || ''}
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingWorker ? 'Update Worker' : 'Create Worker'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowWorkerModal(false)}
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