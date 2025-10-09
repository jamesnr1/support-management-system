# Google Calendar OAuth Setup Guide

**Updated:** October 1, 2025

## Overview

This guide will help you set up Google Calendar OAuth integration to display calendar appointments in your Support Management System.

---

## 🚀 Quick Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `Support Management System`
4. Click **"Create"**

### 2. Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for **"Google Calendar API"**
3. Click on it and press **"Enable"**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. If prompted, configure OAuth consent screen:
   - User Type: **External** (for testing) or **Internal** (if you have Google Workspace)
   - App name: `Support Management System`
   - User support email: Your email
   - Developer contact: Your email
   - Save and continue through all steps
4. Back to Credentials, click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Application type: **Web application**
6. Name: `Support Management Calendar`
7. **Authorized redirect URIs:** Add these URLs:
   - `http://localhost:8001/api/calendar/oauth/callback` (for development)
   - `https://your-domain.com/api/calendar/oauth/callback` (for production)
8. Click **"Create"**

### 4. Download Credentials

1. Click the **download icon** (⬇️) next to your OAuth 2.0 Client ID
2. Save the JSON file
3. Rename it to `client_secrets.json`
4. Move it to your `/backend/` directory

### 5. Update Environment Variables

Create or update `/backend/.env`:

```env
GOOGLE_CLIENT_SECRETS_FILE=client_secrets.json
BACKEND_URL=http://localhost:8001
```

For production, update `BACKEND_URL` to your actual domain.

---

## 🔧 Testing the Setup

### 1. Start Your Servers

**Backend:**
```bash
cd backend
source venv/bin/activate
python server.py
```

**Frontend:**
```bash
cd frontend
npm start
```

### 2. Test OAuth Flow

1. Navigate to any week tab (Week A, B, Next A, or Next B)
2. If no appointments are shown, you'll see a **"Connect Google Calendar"** button
3. Click the button - a popup window will open
4. Sign in to Google and authorize the application
5. The popup will close automatically on success
6. Appointments should now load (if you have any for that week)

---

## 🔍 Troubleshooting

### Issue: "Error 400: redirect_uri_mismatch"

**Cause:** The redirect URI in your OAuth credentials doesn't match what the app is using.

**Solution:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add the exact redirect URI shown in the error message
4. Make sure it matches: `http://localhost:8001/api/calendar/oauth/callback`

### Issue: "client_secrets.json not found"

**Cause:** The credentials file is missing or in the wrong location.

**Solution:**
1. Download the credentials from Google Cloud Console
2. Rename to `client_secrets.json`
3. Place in `/backend/` directory (same folder as `server.py`)

### Issue: "This app isn't verified"

**Cause:** Google shows a warning for unverified apps.

**Solution:**
1. Click **"Advanced"**
2. Click **"Go to Support Management System (unsafe)"**
3. This is normal for development/testing

### Issue: Popup blocked

**Cause:** Browser is blocking the OAuth popup.

**Solution:**
1. Allow popups for your localhost domain
2. Or manually navigate to the OAuth URL in a new tab

### Issue: "Authorization failed" after successful Google login

**Cause:** Backend can't process the authorization code.

**Solution:**
1. Check backend logs: `tail -f backend/server.log`
2. Ensure `client_secrets.json` is valid
3. Verify redirect URI matches exactly
4. Check that Google Calendar API is enabled

---

## 🔒 Security Notes

### Scopes Used

The app only requests **read-only** access to your calendar:
- `https://www.googleapis.com/auth/calendar.readonly`

### Data Storage

- **Credentials are stored locally** in `backend/calendar_credentials.json`
- **No calendar data is stored** in the database
- **Appointments are fetched fresh** each time
- **Credentials are refreshed automatically** when they expire

### Production Considerations

1. **Use HTTPS** in production
2. **Verify your OAuth app** with Google for production use
3. **Secure your credentials file** - never commit to version control
4. **Use environment variables** for sensitive configuration

---

## 📁 File Structure After Setup

```
backend/
├── server.py
├── calendar_service.py
├── client_secrets.json          ← Your OAuth credentials
├── calendar_credentials.json    ← Auto-generated after first auth
├── .env                        ← Environment variables
└── .gitignore                  ← Ignores credential files
```

---

## 🔄 How the OAuth Flow Works

1. **User clicks "Connect Google Calendar"**
2. **Frontend requests auth URL** from backend
3. **Backend generates OAuth URL** using `client_secrets.json`
4. **Popup opens** to Google's OAuth page
5. **User authorizes** the application
6. **Google redirects** to `/api/calendar/oauth/callback`
7. **Backend exchanges code** for access token
8. **Credentials saved** to `calendar_credentials.json`
9. **Popup closes** and notifies parent window
10. **Frontend fetches appointments** using saved credentials

---

## 🎯 Expected Behavior

### When Working Correctly

- ✅ Click "Connect Google Calendar" opens popup
- ✅ Google login page appears
- ✅ After authorization, popup closes automatically
- ✅ Toast notification: "Google Calendar connected successfully!"
- ✅ Appointments load immediately (if any exist)
- ✅ Subsequent page loads show appointments without re-auth

### When Not Working

- ❌ Popup doesn't open (check popup blocker)
- ❌ "redirect_uri_mismatch" error (fix OAuth credentials)
- ❌ "client_secrets.json not found" (download and place file)
- ❌ Popup opens but shows error page (check backend logs)

---

## 🧪 Testing with Sample Data

To test the integration:

1. **Add test events** to your Google Calendar for this week
2. **Connect the calendar** using the OAuth flow
3. **Navigate between week tabs** to see different date ranges
4. **Click refresh** to sync latest appointments

---

## 📞 Support

If you're still having issues:

1. **Check backend logs:**
   ```bash
   tail -f backend/server.log
   ```

2. **Check browser console** for JavaScript errors

3. **Verify OAuth setup** in Google Cloud Console

4. **Test with a simple calendar event** to confirm integration works

---

## 🔮 Advanced Configuration

### Multiple Calendar Support (Future)

Currently, the system reads from your primary Google Calendar. To support multiple calendars, you would need to:

1. Update the scope to include calendar list access
2. Modify the backend to fetch from multiple calendar IDs
3. Add UI to select which calendars to display

### Custom Redirect URI

If you need a custom redirect URI:

1. Update the OAuth credentials in Google Cloud Console
2. Update the `BACKEND_URL` environment variable
3. Ensure your server is accessible at that URL

---

**🎉 Once set up, the OAuth flow will work seamlessly and credentials will persist between sessions!**
