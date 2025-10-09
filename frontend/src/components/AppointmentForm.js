import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AppointmentForm = ({ isOpen, onClose, participants = [] }) => {
  const [formData, setFormData] = useState({
    calendarId: '',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    description: ''
  });
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate time options in 15-minute increments
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push({
          value: time24,
          label: time24
        });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Fetch available calendars and set default times when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableCalendars();
      
      // Set default times: 9:00 AM start, 10:00 AM end (1 hour duration)
      if (!formData.startTime) {
        setFormData(prev => ({
          ...prev,
          startTime: '09:00',
          endTime: '10:00'
        }));
      }
    }
  }, [isOpen]);

  const fetchAvailableCalendars = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/calendar/list`);
      if (response.data.success) {
        setAvailableCalendars(response.data.calendars || []);
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
      // Don't show error toast as this is optional
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If start time is changed, automatically set end time to 1 hour later
    if (name === 'startTime' && value) {
      const [hours, minutes] = value.split(':').map(Number);
      const endHour = (hours + 1) % 24; // Add 1 hour, wrap at midnight
      const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      setFormData(prev => ({
        ...prev,
        startTime: value,
        endTime: endTime
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.calendarId || !formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get the calendar name as participant name
      const selectedCalendar = availableCalendars.find(c => c.id === formData.calendarId);
      const participantName = selectedCalendar?.name || 'Unknown';
      
      // Create appointment in Google Calendar
      const appointmentData = {
        calendarId: formData.calendarId,
        participantName: participantName,
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description || ''
      };

      const response = await axios.post(`${BACKEND_URL}/api/calendar/create-appointment`, appointmentData);
      
      if (response.data.success) {
        toast.success('Appointment created successfully!');
        onClose();
        setFormData({
          calendarId: '',
          title: '',
          date: '',
          startTime: '',
          endTime: '',
          description: ''
        });
      } else {
        toast.error('Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Error creating appointment: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      calendarId: '',
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      description: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '2rem',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            color: 'var(--accent)',
            fontSize: '1.5rem',
            fontWeight: '600',
            margin: 0
          }}>
            Add Appointment
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
              fontSize: '0.95rem'
            }}>
              Participant *
            </label>
            <select
              name="calendarId"
              value={formData.calendarId}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            >
              <option value="">Select Participant</option>
              {availableCalendars.map(calendar => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
              fontSize: '0.95rem'
            }}>
              Appointment Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Doctor Appointment, Therapy Session"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
              fontSize: '0.95rem'
            }}>
              Date *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontWeight: '500',
                fontSize: '0.95rem'
              }}>
                Start Time *
              </label>
              <select
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select Time</option>
                {timeOptions.map(time => (
                  <option key={`start-${time.value}`} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontWeight: '500',
                fontSize: '0.95rem'
              }}>
                End Time *
              </label>
              <select
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select Time</option>
                {timeOptions.map(time => (
                  <option key={`end-${time.value}`} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
              fontSize: '0.95rem'
            }}>
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional notes about the appointment..."
              rows="3"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: 'white',
                fontSize: '1rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;
