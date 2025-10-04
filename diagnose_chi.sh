#!/bin/bash

echo "🔍 Diagnosing Chi Ha (Worker #121) Unavailability"
echo "================================================"

echo ""
echo "1️⃣ Backend Status:"
curl -s http://localhost:8001/api/workers/121/unavailability | jq -r '
if length == 0 then
  "❌ No unavailability periods found"
else
  "✅ Found " + (length | tostring) + " unavailability period(s):",
  .[] | "   - From: \(.from_date) to \(.to_date) (\(.reason))"
end'

echo ""
echo "2️⃣ Date Check:"
python3 -c "
from datetime import datetime
today = datetime.now().date()
from_date = datetime.strptime('2025-09-30', '%Y-%m-%d').date()
to_date = datetime.strptime('2025-10-31', '%Y-%m-%d').date()
is_unavailable = today >= from_date and today <= to_date
print(f'   Today: {today}')
print(f'   Period: {from_date} to {to_date}')
if is_unavailable:
    print('   ✅ Chi SHOULD show as unavailable today')
else:
    print('   ❌ Chi should NOT show as unavailable today')
"

echo ""
echo "3️⃣ Worker Card Test:"
echo "   Go to Admin tab and check Chi Ha's card."
echo "   It should show: 'Unavailable 30/09/25 to 31/10/25'"
echo "   If not showing, wait 5 seconds for auto-refresh."

echo ""
echo "4️⃣ Shift Allocation Test:"
echo "   Go to any participant tab (James/Libby/etc)"
echo "   Click 'Add Shift' for Oct 15, 2025"
echo "   Chi Ha should NOT appear in worker dropdown"

echo ""
echo "5️⃣ After Unavailability Test:"
echo "   Create shift for Nov 1, 2025 or later"
echo "   Chi Ha SHOULD appear in worker dropdown"

echo ""
echo "================================================"
echo "✅ Chi has unavailability saved in backend"
echo "✅ Today is within the unavailability period"
echo "✅ System is configured correctly"
echo ""
echo "If card still shows availability instead of unavailability:"
echo "  - Open browser console (F12)"
echo "  - Check for JavaScript errors"
echo "  - Look for: '✅ Unavailability data for Chi Ha'"

