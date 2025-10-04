#!/usr/bin/env node

// Test script to simulate the frontend copy operation
const API = 'http://localhost:8001/api';

async function testCopy() {
  console.log('=== Testing Copy Week A → Next A ===\n');

  // 1. Fetch Week A data
  console.log('Step 1: Fetching Week A data...');
  const sourceResponse = await fetch(`${API}/roster/weekA`);
  const sourceData = await sourceResponse.json();
  console.log(`✓ Fetched data for ${Object.keys(sourceData).length} participants\n`);

  // 2. Process data (same logic as frontend)
  console.log('Step 2: Processing data (timezone-safe + shift number regeneration)...');
  
  const weekStartMap = {
    weekA: '2025-09-22',
    nextA: '2025-10-06'
  };
  
  const participantInitials = {
    'JAM001': 'J',
    'LIB001': 'L',
    'ACE001': 'A',
    'GRA001': 'G',
    'MIL001': 'M'
  };

  const sourceStart = new Date(weekStartMap.weekA + 'T00:00:00Z');
  const destStart = new Date(weekStartMap.nextA + 'T00:00:00Z');
  const offsetDays = Math.round((destStart - sourceStart) / (24 * 60 * 60 * 1000));
  console.log(`✓ Calculated offset: ${offsetDays} days\n`);

  const remappedData = {};
  Object.entries(sourceData).forEach(([participantCode, datesObj]) => {
    const newDatesObj = {};
    Object.entries(datesObj || {}).forEach(([dateKey, shifts]) => {
      // Parse date in UTC to avoid timezone shifts
      const [year, month, day] = dateKey.split('-').map(Number);
      const sourceDate = new Date(Date.UTC(year, month - 1, day));
      const destDate = new Date(sourceDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      
      const newDateKey = destDate.toISOString().split('T')[0];
      
      // Sort shifts by start time
      const sortedShifts = [...(shifts || [])].sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      // Regenerate shift numbers
      const participantInitial = participantInitials[participantCode] || participantCode[0];
      const dateStr = newDateKey.replace(/-/g, '');
      
      newDatesObj[newDateKey] = sortedShifts.map((shift, index) => {
        const serialNum = String(index + 1).padStart(2, '0');
        const newShiftNumber = `${participantInitial}${dateStr}${serialNum}`;
        
        return {
          ...shift,
          date: newDateKey,
          id: newShiftNumber,
          shiftNumber: newShiftNumber,
          locked: shift.locked || false
        };
      });
    });
    remappedData[participantCode] = newDatesObj;
  });

  console.log('✓ Data processed\n');
  
  // Show sample of remapped data
  console.log('Step 3: Sample of remapped data (JAM001):');
  const jamDates = Object.keys(remappedData.JAM001 || {}).sort();
  console.log(`  Dates: ${jamDates.join(', ')}`);
  if (jamDates.length > 0) {
    const firstDayShifts = remappedData.JAM001[jamDates[0]];
    console.log(`  First day (${jamDates[0]}) has ${firstDayShifts.length} shifts:`);
    firstDayShifts.forEach(s => {
      console.log(`    - ${s.shiftNumber}: ${s.startTime}-${s.endTime} ${s.locked ? '🔒' : ''}`);
    });
  }
  console.log('');

  // 3. POST to Next A
  console.log('Step 4: POSTing to Next A (REPLACE mode)...');
  const postResponse = await fetch(`${API}/roster/nextA`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(remappedData)
  });
  
  if (!postResponse.ok) {
    const errorText = await postResponse.text();
    console.error(`✗ POST failed: ${postResponse.status} - ${errorText}`);
    return;
  }
  
  const postResult = await postResponse.json();
  console.log(`✓ POST successful: ${postResult.message}\n`);

  // 4. Verify the result
  console.log('Step 5: Verifying Next A data...');
  const verifyResponse = await fetch(`${API}/roster/nextA`);
  const nextAData = await verifyResponse.json();
  
  console.log('=== Next A State (AFTER copy) ===');
  for (const [participant, dates] of Object.entries(nextAData)) {
    if (typeof dates !== 'object') continue;
    const allDates = Object.keys(dates).sort();
    const shiftCount = Object.values(dates).reduce((sum, shifts) => sum + shifts.length, 0);
    console.log(`${participant}: ${allDates.length} days, ${shiftCount} shifts`);
    if (allDates.length > 0) {
      console.log(`  Date range: ${allDates[0]} to ${allDates[allDates.length - 1]}`);
      const firstShift = dates[allDates[0]][0];
      console.log(`  First shift: ${firstShift.shiftNumber} (${firstShift.startTime}-${firstShift.endTime})`);
    }
  }
  
  // Verification checks
  console.log('\n=== Verification Checks ===');
  
  // Check 1: No leftover "test" participant
  const hasTest = 'test' in nextAData;
  console.log(`✓ No "test" participant: ${!hasTest ? 'PASS' : 'FAIL - still exists!'}`);
  
  // Check 2: All dates in Oct 6-12 range
  const allNextADates = new Set();
  Object.values(nextAData).forEach(dates => {
    if (typeof dates === 'object') {
      Object.keys(dates).forEach(d => allNextADates.add(d));
    }
  });
  const sortedNextADates = Array.from(allNextADates).sort();
  console.log(`✓ Date range: ${sortedNextADates[0]} to ${sortedNextADates[sortedNextADates.length - 1]}`);
  const expectedStart = '2025-10-06';
  const expectedEnd = '2025-10-12';
  const dateRangeCorrect = sortedNextADates[0] >= expectedStart && sortedNextADates[sortedNextADates.length - 1] <= expectedEnd;
  console.log(`  ${dateRangeCorrect ? 'PASS' : 'FAIL'} - All dates in expected range (Oct 6-12)`);
  
  // Check 3: Shift numbers match dates
  let shiftNumbersCorrect = true;
  for (const [participant, dates] of Object.entries(nextAData)) {
    if (typeof dates !== 'object') continue;
    for (const [dateKey, shifts] of Object.entries(dates)) {
      const expectedDateStr = dateKey.replace(/-/g, '');
      for (const shift of shifts) {
        if (shift.shiftNumber && !shift.shiftNumber.includes(expectedDateStr)) {
          console.log(`  ✗ MISMATCH: ${shift.shiftNumber} doesn't match date ${dateKey}`);
          shiftNumbersCorrect = false;
        }
      }
    }
  }
  console.log(`✓ Shift numbers match dates: ${shiftNumbersCorrect ? 'PASS' : 'FAIL'}`);
  
  console.log('\n=== Test Complete ===');
}

testCopy().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

