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
                    <div className="worker-details" style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                      {worker.email && `📧 ${worker.email}`} {worker.phone && `| 📱 ${worker.phone}`}
                    </div>
                    <div className="worker-details" style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                      🚗 {worker.car || 'N/A'} | 🎯 {worker.skills || 'None'} | ⏰ {worker.max_hours || 'N/A'}h | 📱 T:{worker.telegram || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="worker-actions" style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
                  
                  {/* Only availability and message buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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

      {/* Availability Modal */}
      {showAvailabilityModal && selectedWorker && (
        <div className="modal-overlay" onClick={() => setShowAvailabilityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '90vw' }}>
            <div className="modal-header">
              <h3>Availability - {selectedWorker.full_name}</h3>
              <button 
                className="btn-cancel-x"
                onClick={() => setShowAvailabilityModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1rem' }}>
              {/* Weekly availability schedule */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Weekly Schedule</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1rem' }}>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{day}</div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <input type="checkbox" defaultChecked style={{ marginRight: '0.25rem' }} />
                        <span style={{ fontSize: '0.8rem' }}>Available</span>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <input 
                          type="time" 
                          defaultValue="09:00" 
                          style={{ 
                            width: '70px', 
                            fontSize: '0.8rem', 
                            padding: '0.2rem',
                            marginBottom: '0.25rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)'
                          }} 
                        />
                        <div style={{ margin: '0.25rem 0', fontSize: '0.7rem' }}>to</div>
                        <input 
                          type="time" 
                          defaultValue="17:00" 
                          style={{ 
                            width: '70px', 
                            fontSize: '0.8rem', 
                            padding: '0.2rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)'
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Unavailable periods section - INSIDE the availability modal */}
              <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Set Unavailable Period</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>From Date</label>
                    <input
                      type="date"
                      value={unavailabilityData.from}
                      onChange={(e) => setUnavailabilityData(prev => ({ ...prev, from: e.target.value }))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        width: '100%'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>To Date</label>
                    <input
                      type="date"
                      value={unavailabilityData.to}
                      onChange={(e) => setUnavailabilityData(prev => ({ ...prev, to: e.target.value }))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        width: '100%'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                    <input
                      type="text"
                      placeholder="Enter reason..."
                      value={unavailabilityData.reason}
                      onChange={(e) => setUnavailabilityData(prev => ({ ...prev, reason: e.target.value }))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        width: '100%'
                      }}
                    />
                  </div>
                  <div>
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        if (unavailabilityData.from && unavailabilityData.to && unavailabilityData.reason) {
                          toast.success(`${selectedWorker.full_name} unavailable from ${unavailabilityData.from} to ${unavailabilityData.to}: ${unavailabilityData.reason}`);
                          setUnavailabilityData({ from: '', to: '', reason: '' });
                        } else {
                          toast.error('Please fill all fields');
                        }
                      }}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Save Unavailable
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn btn-primary">
                  Save Availability
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowAvailabilityModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerManagement;