# Google Calendar OAuth Setup - Final Steps

## Current Status
✅ Backend configured correctly
✅ Client secrets file exists
✅ OAuth callback endpoint ready at: `http://localhost:8001/api/calendar/oauth/callback`
⚠️ Need to add redirect URI to Google Console

## What You Need to Do (2 minutes):

### Step 1: Add Redirect URI to Google Cloud Console

1. **Go to**: https://console.cloud.google.com/apis/credentials
   
2. **Select Project**: "noble-particle-467306-n6" (or "family-care-system")

3. **Find your OAuth Client**:
   - Client ID: `898795331079-hu7v0ab5rlbna61pnn2tnlpeit4nsp7q`
   - Name: "support-management-system"

4. **Click Edit** (pencil icon on the right)

5. **Scroll to "Authorized redirect URIs"**

6. **Click "+ ADD URI"**

7. **Add this exact URL**:
   ```
   http://localhost:8001/api/calendar/oauth/callback
   ```

8. **Click SAVE** at the bottom

### Step 2: Test the Connection

1. Go to your web app: http://localhost:3000
2. Navigate to any week tab (Week A, Week B, etc.)
3. You should see a Google Calendar section
4. Click "Connect Google Calendar"
5. Follow the OAuth flow
6. You should see "✅ Authorization Successful!"

## Troubleshooting

### If you see "Access blocked: family-care-system's request is invalid"
- Make sure you added the EXACT URL: `http://localhost:8001/api/calendar/oauth/callback`
- Check there are no extra spaces or typos
- Wait 1-2 minutes after saving (Google needs to propagate changes)

### If you see "redirect_uri_mismatch"
- The URL in Google Console doesn't match
- Double-check: `http://localhost:8001/api/calendar/oauth/callback`
- Make sure it's in the "Authorized redirect URIs" section (not "Authorized JavaScript origins")

## What Happens After Setup

Once connected, the calendar section will show:
- Your existing Google Calendar appointments
- 5 appointment cards displayed before the shift schedule
- Read-only view (won't create or modify calendar events)
- Helps you plan shifts around existing appointments

## Security Notes

✅ **Client secrets are secure** - Stored only on backend server
✅ **Tokens are persistent** - Saved in `calendar_credentials.json` on server
✅ **Read-only access** - Only viewing calendar events, not creating/modifying
✅ **Backend-handled OAuth** - Industry standard secure pattern
