import React, { useState, useEffect } from 'react';
import { Calendar, Download, Upload, Users } from 'lucide-react';

const HoursTracker = (props) => {
  const { participants, workers, rosterData } = props;
  
  const [participantHours, setParticipantHours] = useState({});

  useEffect(() => {
    console.log('HoursTracker - rosterData:', rosterData);
    console.log('HoursTracker - participants:', participants);
    calculateHours();
  }, [rosterData, participants]);

  const calculateHours = () => {
    console.log('Calculating hours...');
    const hours = {};
    
    participants.forEach(participant => {
      console.log('Processing participant:', participant.code);
      hours[participant.code] = {
        participant,
        selfCare: { used: 0, available: 168 }, // Weekly hours
        community: { used: 0, available: 56 }
      };
      
      // Calculate hours from current roster data for this participant
      if (rosterData && rosterData[participant.code]) {
        console.log('Found roster data for:', participant.code, rosterData[participant.code]);
        
        Object.values(rosterData[participant.code]).forEach(dayShifts => {
          if (Array.isArray(dayShifts)) {
            console.log('Processing day shifts:', dayShifts);
            dayShifts.forEach(shift => {
              const duration = parseFloat(shift.duration) || 0;
              console.log('Shift duration:', duration, 'Type:', shift.supportType);
              
              if (shift.supportType === 'Community Access') {
                hours[participant.code].community.used += duration;
              } else {
                hours[participant.code].selfCare.used += duration;
              }
            });
          }
        });
      } else {
        console.log('No roster data found for:', participant.code);
      }
      
      console.log('Final hours for', participant.code, hours[participant.code]);
    });
    
    console.log('All calculated hours:', hours);
    setParticipantHours(hours);
  };

  const getHourFillClass = (used, available) => {
    const percentage = (used / available) * 100;
    if (percentage < 60) return 'good';
    if (percentage < 85) return 'warning';
    return 'critical';
  };

  const getHourFillWidth = (used, available) => {
    return Math.min((used / available) * 100, 100);
  };

  return (
    <div className="hours-tracker">
      <style>{`
        .hours-tracker {
          padding: 1rem;
          background: var(--bg-primary);
        }
        
        .admin-section {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-color);
        }
        
        .admin-section h3 {
          color: var(--accent-primary);
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }
        
        .participant-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 1.5rem;
          overflow: hidden;
          box-shadow: 0 2px 8px var(--shadow);
        }
        
        .participant-header {
          background: var(--bg-tertiary);
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .participant-info {
          display: flex;
          justify-content: space-between;
          align-items: start;
        }
        
        .participant-name {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--accent-primary);
          margin-bottom: 0.3rem;
        }
        
        .participant-details {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        
        .hour-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 1rem;
        }
        
        .hour-block {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 10px;
        }
        
        .hour-type {
          color: var(--accent-primary);
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        
        .hour-bar {
          background: var(--bg-primary);
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
          margin: 8px 0;
        }
        
        .hour-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .hour-fill.good { background: linear-gradient(90deg, #5A7A5A, #6B8B6B); }
        .hour-fill.warning { background: linear-gradient(90deg, #D4A574, #E5B685); }
        .hour-fill.critical { background: linear-gradient(90deg, #C47F7F, #D48F8F); }
        
        .hour-text {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          margin-top: 4px;
          color: var(--text-secondary);
        }
      `}</style>
      
      {/* Header */}
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>📊 Hours Tracker</h3>
          {props.onClose && (
            <button 
              className="btn-cancel-x"
              onClick={props.onClose}
              title="Close Hours Tracker"
            >
              ✕
            </button>
          )}
        </div>
        
        <div id="participantHourCards">
          {Object.entries(participantHours).map(([code, data]) => (
            <div key={code} className="participant-card">
              <div className="participant-header">
                <div className="participant-info">
                  <div>
                    <div className="participant-name">{data.participant.full_name}</div>
                    <div className="participant-details">
                      {code === 'LIB001' && 'Glandore'}
                      {code === 'JAM001' && 'Plympton Park'}
                      {(code === 'ACE001' || code === 'GRA001' || code === 'MIL001') && 'Various Locations'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '1rem' }}>
                <div className="hour-grid">
                  <div className="hour-block">
                    <div className="hour-type">Self-Care Hours</div>
                    <div className="hour-bar">
                      <div 
                        className={`hour-fill ${getHourFillClass(data.selfCare.used, data.selfCare.available)}`}
                        style={{ width: `${getHourFillWidth(data.selfCare.used, data.selfCare.available)}%` }}
                      ></div>
                    </div>
                    <div className="hour-text">
                      <span>{data.selfCare.used}h used</span>
                      <span>{data.selfCare.available - data.selfCare.used}h remaining</span>
                    </div>
                  </div>
                  
                  <div className="hour-block">
                    <div className="hour-type">Community Access Hours</div>
                    <div className="hour-bar">
                      <div 
                        className={`hour-fill ${getHourFillClass(data.community.used, data.community.available)}`}
                        style={{ width: `${getHourFillWidth(data.community.used, data.community.available)}%` }}
                      ></div>
                    </div>
                    <div className="hour-text">
                      <span>{data.community.used}h used</span>
                      <span>{data.community.available - data.community.used}h remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HoursTracker;