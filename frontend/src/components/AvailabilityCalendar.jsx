import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const localizer = momentLocalizer(moment);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

/**
 * AvailabilityCalendar Component
 * Visual calendar interface for managing worker availability
 * Replaces the old HTML select dropdowns
 */
const AvailabilityCalendar = ({ 
  worker, 
  onClose, 
  onSave,
  initialAvailability = {},
  unavailabilityPeriods = []
}) => {
  const [availabilityRules, setAvailabilityRules] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSlotEditor, setShowSlotEditor] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Initialize availability rules from props
  useEffect(() => {
    if (initialAvailability && Object.keys(initialAvailability).length > 0) {
      // Convert backend format to frontend format
      const rules = {};
      Object.entries(initialAvailability).forEach(([dayName, dayData]) => {
        const dayIndex = days.indexOf(dayName);
        if (dayIndex !== -1 && dayData.available) {
          rules[dayIndex] = {
            available: true,
            isFullDay: dayData.is_full_day || false,
            fromTime: dayData.from_time || '09:00',
            toTime: dayData.to_time || '17:00',
            wraps_midnight: dayData.wraps_midnight || false
          };
        }
      });
      setAvailabilityRules(rules);
    }
  }, [initialAvailability]);

  // Convert availability rules to calendar events
  const events = useMemo(() => {
    const eventList = [];
    const baseDate = moment().startOf('week'); // Start of current week

    Object.entries(availabilityRules).forEach(([dayIndex, rule]) => {
      if (rule.available) {
        const date = baseDate.clone().add(parseInt(dayIndex), 'days');
        
        if (rule.isFullDay) {
          eventList.push({
            id: `day-${dayIndex}`,
            title: '24h Available',
            start: date.clone().hour(0).minute(0).toDate(),
            end: date.clone().hour(23).minute(59).toDate(),
            resource: { dayIndex, ...rule, type: 'availability' },
            allDay: false
          });
        } else {
          const [fromHour, fromMin] = rule.fromTime.split(':').map(Number);
          const [toHour, toMin] = rule.toTime.split(':').map(Number);
          
          const start = date.clone().hour(fromHour).minute(fromMin).toDate();
          let end = date.clone().hour(toHour).minute(toMin).toDate();
          
          // Handle wrapping midnight
          if (rule.wraps_midnight || toHour < fromHour) {
            end = date.clone().add(1, 'day').hour(toHour).minute(toMin).toDate();
          }
          
          eventList.push({
            id: `day-${dayIndex}`,
            title: `${rule.fromTime}-${rule.toTime}`,
            start,
            end,
            resource: { dayIndex, ...rule, type: 'availability' }
          });
        }
      }
    });

    // Add unavailability periods
    unavailabilityPeriods.forEach((period, index) => {
      const start = moment(period.from_date).toDate();
      const end = moment(period.to_date).add(1, 'day').toDate(); // Include end date
      
      eventList.push({
        id: `unavailable-${period.id}`,
        title: `Unavailable${period.reason ? `: ${period.reason}` : ''}`,
        start,
        end,
        resource: { ...period, type: 'unavailability' },
        allDay: true
      });
    });

    return eventList;
  }, [availabilityRules, unavailabilityPeriods]);

  // Handle slot selection (creating new availability)
  const handleSelectSlot = ({ start, end }) => {
    const dayIndex = moment(start).day();
    const adjustedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert Sunday=0 to Sunday=6

    const fromTime = moment(start).format('HH:mm');
    const toTime = moment(end).format('HH:mm');

    setSelectedSlot({
      dayIndex: adjustedDayIndex,
      fromTime,
      toTime,
      isFullDay: false
    });
    setEditingSlot(null);
    setShowSlotEditor(true);
  };

  // Handle event selection (editing existing availability)
  const handleSelectEvent = (event) => {
    if (event.resource.type === 'unavailability') {
      toast.info('Unavailability periods are managed in the separate section below');
      return;
    }

    const { dayIndex, fromTime, toTime, isFullDay } = event.resource;
    setEditingSlot({
      dayIndex,
      fromTime,
      toTime,
      isFullDay
    });
    setSelectedSlot(null);
    setShowSlotEditor(true);
  };

  // Save availability slot
  const handleSaveSlot = () => {
    const slot = selectedSlot || editingSlot;
    if (!slot) return;

    setAvailabilityRules(prev => ({
      ...prev,
      [slot.dayIndex]: {
        available: true,
        isFullDay: slot.isFullDay,
        fromTime: slot.fromTime,
        toTime: slot.toTime,
        wraps_midnight: slot.toTime < slot.fromTime
      }
    }));

    setShowSlotEditor(false);
    setSelectedSlot(null);
    setEditingSlot(null);
  };

  // Delete availability slot
  const handleDeleteSlot = () => {
    const slot = editingSlot;
    if (!slot) return;

    setAvailabilityRules(prev => {
      const newRules = { ...prev };
      delete newRules[slot.dayIndex];
      return newRules;
    });

    setShowSlotEditor(false);
    setEditingSlot(null);
  };

  // Save all availability rules
  const handleSaveAvailability = async () => {
    setIsSaving(true);
    try {
      // Convert to backend format
      const rules = [];
      Object.entries(availabilityRules).forEach(([dayIndex, rule]) => {
        if (rule.available) {
          const frontendIndex = parseInt(dayIndex);
          const backendWeekday = frontendIndex === 6 ? 0 : frontendIndex + 1;
          
          rules.push({
            weekday: backendWeekday,
            from_time: rule.isFullDay ? null : rule.fromTime,
            to_time: rule.isFullDay ? null : rule.toTime,
            is_full_day: rule.isFullDay,
            wraps_midnight: rule.wraps_midnight
          });
        }
      });

      await axios.post(`${API}/workers/${worker.id}/availability`, { rules });
      toast.success(`Availability saved for ${worker.full_name}!`);
      
      if (onSave) {
        onSave(availabilityRules);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    } finally {
      setIsSaving(false);
    }
  };

  // Event style getter for color coding
  const eventStyleGetter = (event) => {
    const style = {
      borderRadius: '4px',
      opacity: 0.9,
      border: 'none',
      display: 'block'
    };

    if (event.resource.type === 'unavailability') {
      return {
        ...style,
        backgroundColor: '#dc3545',
        color: '#fff'
      };
    }

    if (event.resource.isFullDay) {
      return {
        ...style,
        backgroundColor: '#28a745',
        color: '#fff'
      };
    }

    return {
      ...style,
      backgroundColor: '#007bff',
      color: '#fff'
    };
  };

  const currentSlot = selectedSlot || editingSlot;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '95%', 
          maxWidth: '1200px', 
          height: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ 
          padding: '1rem', 
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            Availability Calendar: {worker.full_name}
          </h3>
          <button 
            className="btn-cancel-x" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.2rem',
              color: 'var(--text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: 'var(--hover-bg)',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          flexShrink: 0
        }}>
          <strong>Instructions:</strong> Click and drag on the calendar to add availability periods. 
          Click existing slots to edit or delete. Green = 24h available, Blue = specific hours, Red = unavailable.
        </div>

        {/* Calendar */}
        <div style={{ flex: 1, padding: '1rem', overflow: 'hidden' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            defaultView="week"
            views={['week']}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            step={60}
            showMultiDayTimes
            min={moment().hour(0).minute(0).toDate()}
            max={moment().hour(23).minute(59).toDate()}
          />
        </div>

        {/* Slot Editor Modal */}
        {showSlotEditor && currentSlot && (
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--card-bg)',
              border: '2px solid var(--border)',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              minWidth: '400px',
              zIndex: 1000
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>
              {editingSlot ? 'Edit' : 'Add'} Availability - {days[currentSlot.dayIndex]}
            </h4>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={currentSlot.isFullDay}
                  onChange={(e) => {
                    const updated = { ...currentSlot, isFullDay: e.target.checked };
                    if (editingSlot) {
                      setEditingSlot(updated);
                    } else {
                      setSelectedSlot(updated);
                    }
                  }}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>Full Day (24 hours)</span>
              </label>

              {!currentSlot.isFullDay && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      From:
                    </label>
                    <input
                      type="time"
                      value={currentSlot.fromTime}
                      onChange={(e) => {
                        const updated = { ...currentSlot, fromTime: e.target.value };
                        if (editingSlot) {
                          setEditingSlot(updated);
                        } else {
                          setSelectedSlot(updated);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      To:
                    </label>
                    <input
                      type="time"
                      value={currentSlot.toTime}
                      onChange={(e) => {
                        const updated = { ...currentSlot, toTime: e.target.value };
                        if (editingSlot) {
                          setEditingSlot(updated);
                        } else {
                          setSelectedSlot(updated);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              {editingSlot && (
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteSlot}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Delete
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSlotEditor(false);
                  setSelectedSlot(null);
                  setEditingSlot(null);
                }}
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveSlot}
                style={{ padding: '0.5rem 1rem' }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center', 
          padding: '1rem', 
          borderTop: '1px solid var(--border)',
          flexShrink: 0
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

export default AvailabilityCalendar;
