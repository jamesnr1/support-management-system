import React, { useState, useEffect } from 'react';
import { Calendar, Download, Upload, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const HoursTracker = (props) => {
  const { participants, workers } = props;
  
  const [participantHours, setParticipantHours] = useState({});
  const [uploadedPlan, setUploadedPlan] = useState(null);

  useEffect(() => {
    calculateHours();
  }, [participants, uploadedPlan]);

  const handlePlanUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const planData = {};
        
        lines.slice(1).forEach(line => {
          if (line.trim()) {
            const [participantCode, selfCareHours, communityHours] = line.split(',');
            planData[participantCode?.trim()] = {
              selfCare: parseFloat(selfCareHours?.trim()) || 168,
              community: parseFloat(communityHours?.trim()) || 56
            };
          }
        });
        
        setUploadedPlan(planData);
        toast.success('Plan data uploaded successfully');
        calculateHours();
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing CSV file');
      }
    };
    reader.readAsText(file);
  };

  const exportHoursSummary = () => {
    let csvContent = "Participant Code,Participant Name,Self-Care Used,Self-Care Available,Community Used,Community Available,Self-Care Remaining,Community Remaining\n";
    
    Object.entries(participantHours).forEach(([code, data]) => {
      const selfCareRemaining = data.selfCare.available - data.selfCare.used;
      const communityRemaining = data.community.available - data.community.used;
      
      csvContent += `${code},${data.participant.full_name},${data.selfCare.used},${data.selfCare.available},${data.community.used},${data.community.available},${selfCareRemaining},${communityRemaining}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hours_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Hours summary exported');
  };

  const calculateHours = async () => {
    console.log('Calculating hours...');
    const hours = {};
    
    const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
    
    participants.forEach(participant => {
      console.log('Processing participant:', participant.code);
      
      // Use uploaded plan data if available, otherwise defaults
      const planData = uploadedPlan?.[participant.code];
      const selfCareAvailable = planData?.selfCare || 168;
      const communityAvailable = planData?.community || 56;
      
      hours[participant.code] = {
        participant,
        selfCare: { used: 0, available: selfCareAvailable },
        community: { used: 0, available: communityAvailable }
      };
      
      try {
        // Fetch data for all weeks
        for (const weekType of ['weekA', 'weekB', 'nextA', 'nextB']) {
          const response = await axios.get(`${API}/roster/${weekType}`);
          const weekData = response.data;
          
          if (weekData[participant.code]) {
            Object.values(weekData[participant.code]).forEach(dayShifts => {
              if (Array.isArray(dayShifts)) {
                dayShifts.forEach(shift => {
                  const duration = parseFloat(shift.duration) || 0;
                  console.log(`${participant.code} - ${weekType}: ${duration}h ${shift.supportType}`);
                  
                  if (shift.supportType === 'Community Access') {
                    hours[participant.code].community.used += duration;
                  } else {
                    hours[participant.code].selfCare.used += duration;
                  }
                });
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching hours for', participant.code, error);
      }
      
      console.log('Final hours for', participant.code, hours[participant.code]);
    }
    
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
        
        {/* Controls for CSV upload and export */}
        <div className="controls-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Upload Plan Data (CSV):
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handlePlanUpload}
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Format: ParticipantCode,SelfCareHours,CommunityHours
            </div>
          </div>
          
          <div style={{ alignSelf: 'end' }}>
            <button 
              onClick={exportHoursSummary}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            >
              <Download size={16} />
              Export Summary
            </button>
          </div>
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