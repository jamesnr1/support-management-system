# OAuth "Access Blocked" Fix

**Issue:** "Access blocked: family-care-system's request is invalid"

## 🔧 Quick Fix Steps

### 1. Update OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Select the "family-care-system" project** (not support-management-system)
3. Go to **APIs & Services** → **OAuth consent screen**
4. Update the following:

**App Information:**
- App name: `Family Care System` (or `Support Management System`)
- User support email: Your email
- App logo: (optional)

**App domain:**
- Application home page: `http://localhost:3000` (for development)
- Application privacy policy link: (optional for testing)
- Application terms of service link: (optional for testing)

**Authorized domains:**
- Add: `localhost` (for development)
- Add your production domain if applicable

**Developer contact information:**
- Your email address

4. Click **Save and Continue**
5. **Scopes:** Click **Save and Continue** (we're using standard scopes)
6. **Test users:** Add your Google account email for testing
7. Click **Save and Continue**

### 2. Verify OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID named "support-management-system" 
3. Click the edit icon (pencil)
4. **Authorized redirect URIs** should include:
   - `http://localhost:8001/api/calendar/oauth/callback`
   - `https://your-domain.com/api/calendar/oauth/callback` (for production)
5. Click **Save**

### 3. Download Fresh Credentials

1. Click the **download icon** next to your OAuth 2.0 Client ID
2. Save as `client_secrets.json`
3. Replace the existing file in `/backend/client_secrets.json`

### 4. Clear Saved Credentials

```bash
cd /Users/James/support-management-system/backend
rm -f calendar_credentials.json
```

This forces a fresh OAuth flow.

## 🚀 Test the Fix

1. **Restart the backend server:**
   ```bash
   cd /Users/James/support-management-system/backend
   source venv/bin/activate
   python server.py
   ```

2. **Go to your app:** `http://localhost:3000`

3. **Navigate to any week tab** and click "Connect Google Calendar"

4. **The OAuth screen should now show:**
   - Correct app name: "Family Care System"
   - No "Access blocked" error
   - Proper authorization flow

## 🔍 Common Issues & Solutions

### Issue: "This app isn't verified"
**Solution:** Click "Advanced" → "Go to Family Care System (unsafe)"
This is normal for development/testing.

### Issue: "redirect_uri_mismatch"
**Solution:** 
1. Copy the exact redirect URI from the error message
2. Add it to your OAuth client's authorized redirect URIs
3. Make sure it's exactly: `http://localhost:8001/api/calendar/oauth/callback`

### Issue: Still shows "Access blocked"
**Solution:**
1. Make sure you selected the correct project ("family-care-system")
2. Verify the OAuth consent screen is configured
3. Add your email as a test user
4. Download fresh `client_secrets.json`

## 📋 Checklist

- [ ] Google Cloud project: "family-care-system" selected
- [ ] OAuth consent screen configured with app name
- [ ] Your email added as test user
- [ ] OAuth 2.0 Client ID has correct redirect URI
- [ ] Fresh `client_secrets.json` downloaded and placed in `/backend/`
- [ ] Old `calendar_credentials.json` deleted
- [ ] Backend server restarted

## 🎯 Expected Result

After fixing:
- ✅ OAuth popup opens without "Access blocked" error
- ✅ Shows "Family Care System wants to access your Google Account"
- ✅ Authorization completes successfully
- ✅ Calendar appointments load automatically

The key issue was the project name mismatch - your Google Cloud project is "family-care-system" but the OAuth flow needs to be configured properly within that project.
