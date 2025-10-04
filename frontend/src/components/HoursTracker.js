import React, { useState, useEffect } from 'react';
import { Calendar, Download, Upload, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const HoursTracker = (props) => {
  const { participants, workers } = props;
  
  const [participantHours, setParticipantHours] = useState({});
  const [uploadedPlan, setUploadedPlan] = useState(null);

  // Hour categories with EXACT codes from hours_tracking.html
  const hourCategories = [
    { code: 'SCWD', label: 'Self-Care Weekday', typical: 1000 },
    { code: 'SCWE', label: 'Self-Care Weekday Evening', typical: 300 },
    { code: 'SCWN', label: 'Self-Care Weekday Night', typical: 500 },
    { code: 'SCSat', label: 'Self-Care Saturday', typical: 200 },
    { code: 'SCSun', label: 'Self-Care Sunday', typical: 200 },
    { code: 'SCPH', label: 'Self-Care Public Holiday', typical: 150 },
    { code: 'CPWD', label: 'Community Participation Weekday', typical: 800 },
    { code: 'CPWE', label: 'Community Participation Weekday Evening', typical: 250 },
    { code: 'CPSat', label: 'Community Participation Saturday', typical: 300 },
    { code: 'CPSun', label: 'Community Participation Sunday', typical: 300 },
    { code: 'CPPH', label: 'Community Participation Public Holiday', typical: 100 }
  ];

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
            const parts = line.split(',');
            const participantCode = parts[0]?.trim();
            if (participantCode) {
              planData[participantCode] = {};
              hourCategories.forEach((category, index) => {
                planData[participantCode][category.code] = parseFloat(parts[index + 1]?.trim()) || category.typical;
              });
            }
          }
        });
        
        setUploadedPlan(planData);
        toast.success('Plan data uploaded successfully');
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing CSV file');
      }
    };
    reader.readAsText(file);
  };

  const exportHoursSummary = () => {
    let csvContent = "Participant Code,Participant Name";
    hourCategories.forEach(cat => {
      csvContent += `,${cat.code} Remaining,${cat.code} Available`;
    });
    csvContent += "\n";
    
    Object.entries(participantHours).forEach(([code, data]) => {
      csvContent += `${code},${data.participant.full_name}`;
      hourCategories.forEach(cat => {
        const remaining = data.hours[cat.code].remaining;
        const available = data.hours[cat.code].available;
        csvContent += `,${remaining},${available}`;
      });
      csvContent += "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hours_detailed_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Hours summary exported');
  };

  const calculateHours = async () => {
    console.log('Calculating hours with proper categories...');
    const hours = {};
    
    const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
    
    // Fetch roster data for all weeks
    const rosterData = {};
    try {
      const [roster, planner] = await Promise.all([
        axios.get(`${API}/roster/roster`),
        axios.get(`${API}/roster/planner`)
      ]);
      
      // Map roster and planner to weekA/weekB based on their week_type
      // Roster might be weekA or weekB, same with planner
      const rosterWeekType = roster.data.week_type || 'weekB';
      const plannerWeekType = planner.data.week_type || 'weekA';
      
      rosterData[rosterWeekType] = roster.data.data || {};
      rosterData[plannerWeekType] = planner.data.data || {};
    } catch (error) {
      console.error('Error fetching roster data:', error);
    }
    
    participants.forEach(participant => {
      console.log('Processing participant:', participant.code);
      
      // Initialize with uploaded plan data or defaults
      const planData = uploadedPlan?.[participant.code];
      hours[participant.code] = {
        participant,
        hours: {}
      };
      
      // Calculate used hours from roster data
      const usedHours = calculateUsedHours(participant.code, rosterData);
      
      hourCategories.forEach(category => {
        const available = planData?.[category.code] || category.typical;
        const used = usedHours[category.code] || 0;
        const remaining = Math.max(0, available - used); // Ensure no negative hours
        
        hours[participant.code].hours[category.code] = {
          code: category.code,
          label: category.label,
          available: available,
          remaining: remaining,
          used: used
        };
      });
    });
    
    console.log('All calculated hours:', hours);
    setParticipantHours(hours);
  };

  const calculateUsedHours = (participantCode, rosterData) => {
    const usedHours = {};
    
    // Initialize all categories to 0
    hourCategories.forEach(category => {
      usedHours[category.code] = 0;
    });
    
    // Process all weeks
    Object.values(rosterData).forEach(weekData => {
      const participantData = weekData[participantCode];
      if (!participantData) return;
      
      Object.values(participantData).forEach(dayShifts => {
        if (!Array.isArray(dayShifts)) return;
        
        dayShifts.forEach(shift => {
          const shiftDate = new Date(shift.date);
          const dayOfWeek = shiftDate.getDay();
          const startTime = parseInt(shift.startTime?.split(':')[0] || '9');
          const duration = parseFloat(shift.duration || 0);
          
          // Determine funding code based on time and day
          let fundingCode = '';
          
          if (dayOfWeek === 6) { // Saturday
            fundingCode = shift.supportType === 'Community Participation' ? 'CPSat' : 'SCSat';
          } else if (dayOfWeek === 0) { // Sunday
            fundingCode = shift.supportType === 'Community Participation' ? 'CPSun' : 'SCSun';
          } else if (startTime >= 22 || startTime < 6) { // Night (10PM-6AM)
            fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWN';
          } else if (startTime >= 18) { // Evening (6PM-10PM)
            fundingCode = shift.supportType === 'Community Participation' ? 'CPWE' : 'SCWE';
          } else { // Weekday Day (6AM-6PM)
            fundingCode = shift.supportType === 'Community Participation' ? 'CPWD' : 'SCWD';
          }
          
          // Add hours to the appropriate category
          if (usedHours[fundingCode] !== undefined) {
            usedHours[fundingCode] += duration;
          }
        });
      });
    });
    
    return usedHours;
  };

  const getHourFillClass = (remaining, available) => {
    const percentage = (remaining / available) * 100;
    if (remaining === 0) return 'empty';
    if (percentage < 20) return 'critical';
    if (percentage < 40) return 'warning';
    return 'good';
  };

  const getHourFillWidth = (remaining, available) => {
    return Math.min((remaining / available) * 100, 100);
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
        .hour-fill.empty { background: linear-gradient(90deg, #444, #555); }
        
        .hour-text {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          margin-top: 4px;
          color: var(--text-secondary);
        }
        
        .remaining-hours {
          font-weight: bold;
          font-size: 11px;
        }
        
        .total-hours {
          font-size: 11px;
          color: var(--text-muted);
        }
        
        .ratio-multiplier {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 4px;
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
                  {hourCategories.map(category => {
                    const hourData = data.hours[category.code];
                    if (!hourData) return null;
                    
                    return (
                      <div key={category.code} className="hour-block">
                        <div className="hour-type">{category.code}</div>
                        <div className="hour-bar">
                          <div 
                            className={`hour-fill ${getHourFillClass(hourData.remaining, hourData.available)}`}
                            style={{ width: `${getHourFillWidth(hourData.remaining, hourData.available)}%` }}
                          ></div>
                        </div>
                        <div className="hour-text">
                          <span className="remaining-hours">{hourData.remaining}h</span>
                          <span className="total-hours">/{hourData.available}h</span>
                        </div>
                        <div className="ratio-multiplier">2:1 ratio</div>
                      </div>
                    );
                  })}
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