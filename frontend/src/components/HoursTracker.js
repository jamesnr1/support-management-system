import React, { useState, useEffect } from 'react';
import { Download, Upload, Calculator, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const HoursTracker = ({ participants, workers, rosterData }) => {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [weeksRemaining, setWeeksRemaining] = useState(20);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [participantHours, setParticipantHours] = useState({});
  const [summaryTotals, setSummaryTotals] = useState({
    totalSelfCare: 0,
    totalCommunity: 0,
    weeksProjection: 0,
    riskLevel: 'LOW'
  });

  // Initialize hours data based on your hours_tracking.html
  const initializeHoursData = () => {
    const hoursData = {};
    
    participants.forEach(participant => {
      hoursData[participant.code] = {
        name: participant.full_name,
        participantNumber: participant.participant_number || 'Not Set',
        'Self-Care Weekday': Math.floor(Math.random() * 500) + 100, // Placeholder data
        'Self-Care Weekday Evening': Math.floor(Math.random() * 200) + 50,
        'Self-Care Weekday Night': Math.floor(Math.random() * 300) + 100,
        'Self-Care Saturday': Math.floor(Math.random() * 150) + 50,
        'Self-Care Sunday': Math.floor(Math.random() * 150) + 50,
        'Self-Care Public Holiday': Math.floor(Math.random() * 100) + 20,
        'Community Participation Weekday': Math.floor(Math.random() * 400) + 100,
        'Community Participation Weekday Evening': Math.floor(Math.random() * 150) + 30,
        'Community Participation Saturday': Math.floor(Math.random() * 200) + 50,
        'Community Participation Sunday': Math.floor(Math.random() * 200) + 50,
        'Community Participation Public Holiday': Math.floor(Math.random() * 80) + 20
      };
    });
    
    setParticipantHours(hoursData);
  };

  // Support ratios from your logic
  const supportRatios = {
    'weekA': { day: '2:1', evening: '2:1', night: '2:1' },
    'weekB': { day: '2:3', evening: '2:3', night: '2:3' }
  };

  // Weekly usage patterns (placeholder data)
  const weeklyUsage = {
    day: 98,
    evening: 14, 
    night: 56
  };

  useEffect(() => {
    initializeHoursData();
  }, [participants]);

  // Calculate hours consumed based on ratio (from your JS logic)
  const calculateHoursConsumed = (serviceHours, ratio) => {
    if (ratio === '2:1') return serviceHours * 2;
    if (ratio === '2:3') return serviceHours * 0.67;
    if (ratio === '1:1') return serviceHours * 1;
    return serviceHours;
  };

  // Calculate projections
  const calculateProjection = () => {
    let totalSelfCare = 0;
    let totalCommunity = 0;
    let criticalParticipants = [];

    Object.entries(participantHours).forEach(([code, hours]) => {
      if (typeof hours === 'object' && hours.name) {
        const selfCareTotal = 
          hours['Self-Care Weekday'] + 
          hours['Self-Care Weekday Evening'] + 
          hours['Self-Care Weekday Night'] + 
          hours['Self-Care Saturday'] + 
          hours['Self-Care Sunday'] + 
          hours['Self-Care Public Holiday'];

        const communityTotal = 
          hours['Community Participation Weekday'] + 
          hours['Community Participation Weekday Evening'] + 
          hours['Community Participation Saturday'] + 
          hours['Community Participation Sunday'] + 
          hours['Community Participation Public Holiday'];

        totalSelfCare += selfCareTotal;
        totalCommunity += communityTotal;

        // Calculate weekly consumption (worst case 2:1 ratio)
        const weeklyConsumption = 
          calculateHoursConsumed(weeklyUsage.day, '2:1') +
          calculateHoursConsumed(weeklyUsage.evening, '2:1') +
          calculateHoursConsumed(weeklyUsage.night, '2:1');

        const weeksUntilExhausted = Math.floor((selfCareTotal + communityTotal) / weeklyConsumption);
        
        if (weeksUntilExhausted < 8) {
          criticalParticipants.push({
            name: hours.name,
            weeks: weeksUntilExhausted,
            remaining: selfCareTotal + communityTotal
          });
        }
      }
    });

    const averageWeeksLeft = Math.floor((totalSelfCare + totalCommunity) / (300 * 5));
    
    let riskLevel = 'LOW';
    let riskColor = '#8B9A7B';
    if (averageWeeksLeft < 12) { riskLevel = 'MEDIUM'; riskColor = '#D4A574'; }
    if (averageWeeksLeft < 6) { riskLevel = 'HIGH'; riskColor = '#B87E7E'; }

    setSummaryTotals({
      totalSelfCare,
      totalCommunity,
      weeksProjection: averageWeeksLeft,
      riskLevel,
      riskColor
    });

    if (criticalParticipants.length > 0) {
      const warningMessage = criticalParticipants
        .map(p => `${p.name}: Only ${p.weeks} weeks remaining`)
        .join('\n');
      toast.error(`⚠️ CRITICAL SHORTAGE:\n${warningMessage}`, { duration: 8000 });
    }

    toast.success('Projection calculated successfully');
  };

  // Create hour block component
  const createHourBlock = (code, remaining, typical, ratio) => {
    const percentage = Math.min((remaining / typical) * 100, 100);
    let fillClass = 'good';
    if (percentage < 20) fillClass = 'critical';
    else if (percentage < 40) fillClass = 'warning';
    if (remaining === 0) fillClass = 'empty';

    const multiplier = ratio === '2:1' ? '2x cost' : ratio === '2:3' ? '0.67x cost' : '1x cost';

    return (
      <div className="hour-block" key={code}>
        <div className="hour-type">{code}</div>
        <div className="hour-bar">
          <div 
            className={`hour-fill ${fillClass}`} 
            style={{ 
              width: `${percentage}%`,
              background: fillClass === 'good' ? 'linear-gradient(90deg, #5A7A5A, #6B8B6B)' :
                         fillClass === 'warning' ? 'linear-gradient(90deg, #D4A574, #E5B685)' :
                         fillClass === 'critical' ? 'linear-gradient(90deg, #7A5A5A, #8B6B6B)' :
                         'linear-gradient(90deg, #444, #555)'
            }}
          />
        </div>
        <div className="hour-text">
          <span className="remaining-hours">{remaining}h</span>
          <span className="total-hours">/{typical}h</span>
        </div>
        <div className="ratio-multiplier">{ratio} ratio ({multiplier})</div>
      </div>
    );
  };

  // Create weekly usage display
  const createWeeklyUsageDisplay = (participantCode) => {
    const weekAConsumption = 
      calculateHoursConsumed(weeklyUsage.day, supportRatios.weekA.day) +
      calculateHoursConsumed(weeklyUsage.evening, supportRatios.weekA.evening) +
      calculateHoursConsumed(weeklyUsage.night, supportRatios.weekA.night);

    const weekBConsumption = 
      calculateHoursConsumed(weeklyUsage.day, supportRatios.weekB.day) +
      calculateHoursConsumed(weeklyUsage.evening, supportRatios.weekB.evening) +
      calculateHoursConsumed(weeklyUsage.night, supportRatios.weekB.night);

    const monthlyAvg = ((weekAConsumption + weekBConsumption) * 2).toFixed(1);
    const totalServiceHours = weeklyUsage.day + weeklyUsage.evening + weeklyUsage.night;
    const averageWeekly = (weekAConsumption + weekBConsumption) / 2;
    const efficiency = averageWeekly > 0 ? ((totalServiceHours / averageWeekly) * 100).toFixed(0) : '0';

    return (
      <div className="weekly-usage">
        <h4 style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>
          Weekly Hour Consumption
        </h4>
        <div className="usage-grid">
          <div className="week-block">
            <div className="week-number">Week A</div>
            <div className="week-hours">{weekAConsumption.toFixed(1)}h</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {totalServiceHours}h service
            </div>
          </div>
          <div className="week-block">
            <div className="week-number">Week B</div>
            <div className="week-hours">{weekBConsumption.toFixed(1)}h</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {totalServiceHours}h service
            </div>
          </div>
          <div className="week-block">
            <div className="week-number">Monthly Avg</div>
            <div className="week-hours">{monthlyAvg}h</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>per month</div>
          </div>
          <div className="week-block">
            <div className="week-number">Efficiency</div>
            <div className="week-hours">{efficiency}%</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>service/ratio</div>
          </div>
        </div>
      </div>
    );
  };

  // Handle CSV upload
  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        
        const newHoursData = { ...participantHours };
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length < 10) continue;
          
          const participantName = values[1];
          let key = '';
          
          if (participantName.includes('Libby') || participantName.includes('Elizabeth')) key = 'LIB001';
          else if (participantName.includes('James')) key = 'JAM001';
          else if (participantName.includes('Ace')) key = 'ACE001';
          else if (participantName.includes('Grace')) key = 'GRA001';
          else if (participantName.includes('Milan')) key = 'MIL001';
          
          if (key && newHoursData[key]) {
            newHoursData[key]['Self-Care Weekday'] = parseInt(values[3]) || 0;
            newHoursData[key]['Self-Care Weekday Evening'] = parseInt(values[8]) || 0;
            newHoursData[key]['Self-Care Weekday Night'] = parseInt(values[13]) || 0;
            newHoursData[key]['Self-Care Saturday'] = parseInt(values[18]) || 0;
            newHoursData[key]['Self-Care Sunday'] = parseInt(values[23]) || 0;
            newHoursData[key]['Self-Care Public Holiday'] = parseInt(values[28]) || 0;
            newHoursData[key]['Community Participation Weekday'] = parseInt(values[33]) || 0;
            newHoursData[key]['Community Participation Weekday Evening'] = parseInt(values[38]) || 0;
            newHoursData[key]['Community Participation Saturday'] = parseInt(values[43]) || 0;
            newHoursData[key]['Community Participation Sunday'] = parseInt(values[47]) || 0;
            newHoursData[key]['Community Participation Public Holiday'] = parseInt(values[51]) || 0;
          }
        }
        
        setParticipantHours(newHoursData);
        setShowCSVUpload(false);
        toast.success('✅ Plan data updated successfully!');
        
      } catch (error) {
        toast.error(`❌ Error parsing CSV: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Export data
  const exportData = () => {
    let csv = 'Participant,Number,Service Type,Remaining Hours,Weekly Usage,Weeks Remaining\n';
    
    Object.entries(participantHours).forEach(([code, data]) => {
      if (typeof data !== 'object' || !data.name) return;
      
      const services = [
        ['Self-Care Weekday', data['Self-Care Weekday']],
        ['Self-Care Evening', data['Self-Care Weekday Evening']],
        ['Self-Care Night', data['Self-Care Weekday Night']],
        ['Community Weekday', data['Community Participation Weekday']],
        ['Community Evening', data['Community Participation Weekday Evening']]
      ];
      
      services.forEach(([service, hours]) => {
        const weeklyUsageCalc = 50; // Simplified
        const weeksRemaining = Math.floor(hours / weeklyUsageCalc);
        csv += `"${data.name}","${data.participantNumber}","${service}",${hours},${weeklyUsageCalc},${weeksRemaining}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hours-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h1 style={{ color: 'var(--accent-primary)', fontSize: '24px', margin: 0 }}>
              📊 Hours Tracker - Support Management System
            </h1>
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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: '15px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '3px' }}>
                Current Week:
              </label>
              <select 
                value={currentWeek}
                onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
                style={{ width: '80px' }}
              >
                <option value="1">Week 1</option>
                <option value="2">Week 2</option>
                <option value="3">Week 3</option>
                <option value="4">Week 4</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: '15px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '3px' }}>
                Weeks Left in Plan:
              </label>
              <input 
                type="number" 
                value={weeksRemaining}
                onChange={(e) => setWeeksRemaining(parseInt(e.target.value))}
                style={{ width: '80px' }}
              />
            </div>
            
            <button className="btn btn-primary" onClick={calculateProjection}>
              <Calculator size={16} /> Calculate Projection
            </button>
            <button className="btn btn-warning" onClick={() => setShowCSVUpload(!showCSVUpload)}>
              <Upload size={16} /> Update Plan Data
            </button>
            <button className="btn btn-secondary" onClick={exportData}>
              <Download size={16} /> Export Report
            </button>
          </div>
        </div>

        {/* CSV Upload */}
        {showCSVUpload && (
          <div className="admin-section">
            <h3 style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>
              Upload Updated Plan Data
            </h3>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCSVUpload}
              style={{ width: '100%', margin: '10px 0' }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px' }}>
              Upload your "Rostering Information Grid view.csv" file when you receive new plans
            </p>
          </div>
        )}

        {/* Summary Totals */}
        <div className="admin-section">
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '15px' }}>Plan Summary</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '15px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '20px', 
                fontWeight: 'bold' 
              }}>
                {summaryTotals.totalSelfCare.toLocaleString()}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '5px' }}>
                Self-Care Hours Remaining
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '20px', 
                fontWeight: 'bold' 
              }}>
                {summaryTotals.totalCommunity.toLocaleString()}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '5px' }}>
                Community Hours Remaining
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '20px', 
                fontWeight: 'bold' 
              }}>
                {summaryTotals.weeksProjection}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '5px' }}>
                Weeks Until Exhausted
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                color: summaryTotals.riskColor || 'var(--accent-primary)', 
                fontSize: '20px', 
                fontWeight: 'bold' 
              }}>
                {summaryTotals.riskLevel}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '5px' }}>
                Risk Level
              </div>
            </div>
          </div>
        </div>

        {/* Participant Cards */}
        {Object.entries(participantHours).map(([code, data]) => {
          if (typeof data !== 'object' || !data.name) return null;

          const selfCareHours = [
            data['Self-Care Weekday'],
            data['Self-Care Weekday Evening'], 
            data['Self-Care Weekday Night'],
            data['Self-Care Saturday'],
            data['Self-Care Sunday'],
            data['Self-Care Public Holiday']
          ];

          const communityHours = [
            data['Community Participation Weekday'],
            data['Community Participation Weekday Evening'],
            data['Community Participation Saturday'], 
            data['Community Participation Sunday'],
            data['Community Participation Public Holiday']
          ];

          const totalHours = selfCareHours.reduce((a, b) => a + b, 0) + communityHours.reduce((a, b) => a + b, 0);

          return (
            <div key={code} className="participant-card">
              <div className="participant-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="participant-name">{data.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Number: {data.participantNumber}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                      {totalHours.toLocaleString()} Total Hours
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {Math.floor(totalHours / 100)} weeks approx
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '15px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                  gap: '15px', 
                  marginBottom: '20px' 
                }}>
                  {createHourBlock('SCWD', data['Self-Care Weekday'], 1000, '2:1')}
                  {createHourBlock('SCWE', data['Self-Care Weekday Evening'], 300, '2:1')}
                  {createHourBlock('SCWN', data['Self-Care Weekday Night'], 400, '2:1')}
                  {createHourBlock('SCSat', data['Self-Care Saturday'], 200, '2:1')}
                  {createHourBlock('SCSun', data['Self-Care Sunday'], 200, '2:1')}
                  {createHourBlock('SCPH', data['Self-Care Public Holiday'], 100, '2:1')}
                  {createHourBlock('CPWD', data['Community Participation Weekday'], 800, '2:3')}
                  {createHourBlock('CPWE', data['Community Participation Weekday Evening'], 200, '2:3')}
                  {createHourBlock('CPSat', data['Community Participation Saturday'], 300, '2:3')}
                  {createHourBlock('CPSun', data['Community Participation Sunday'], 300, '2:3')}
                  {createHourBlock('CPPH', data['Community Participation Public Holiday'], 100, '2:3')}
                </div>
                
                {createWeeklyUsageDisplay(code)}
              </div>
            </div>
          );
        })}

        {/* Support Ratios Info Panel */}
        <div className="admin-section">
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>
            How Support Ratios Affect Hour Consumption
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '15px' 
          }}>
            <div>
              <p><strong>2:1 Individual Support:</strong></p>
              <p>• 2 workers for 1 participant</p>
              <p>• 1 hour of service = 2 hours consumed</p>
              <p>• Higher cost but intensive support</p>
            </div>
            <div>
              <p><strong>2:3 Shared Support:</strong></p>
              <p>• 2 workers for 3 participants</p>
              <p>• 1 hour of service = 0.67 hours per participant</p>
              <p>• Cost-effective for compatible participants</p>
            </div>
            <div>
              <p><strong>1:1 Individual Support:</strong></p>
              <p>• 1 worker for 1 participant</p>
              <p>• 1 hour of service = 1 hour consumed</p>
              <p>• Standard individual support ratio</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS Styles */}
      <style jsx>{`
        .hour-block {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 6px;
        }
        
        .hour-type {
          color: var(--accent-primary);
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 11px;
        }
        
        .hour-bar {
          background: var(--bg-primary);
          height: 16px;
          border-radius: 8px;
          overflow: hidden;
          margin: 6px 0;
        }
        
        .hour-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .hour-text {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-top: 4px;
        }
        
        .remaining-hours {
          color: var(--text-primary);
          font-weight: bold;
        }
        
        .total-hours {
          color: var(--text-muted);
        }
        
        .ratio-multiplier {
          color: var(--text-secondary);
          font-size: 10px;
          margin-top: 2px;
        }
        
        .weekly-usage {
          background: var(--bg-primary);
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
        }
        
        .usage-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        
        .week-block {
          background: var(--bg-secondary);
          padding: 10px;
          border-radius: 4px;
          text-align: center;
        }
        
        .week-number {
          color: var(--accent-primary);
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .week-hours {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default HoursTracker;