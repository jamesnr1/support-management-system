# Fix OAuth Redirect URI Mismatch

**Error:** `Error 400: redirect_uri_mismatch`

## 🔧 Quick Fix

The redirect URI in your Google Cloud OAuth settings doesn't match what the app is sending. Here's how to fix it:

### Step 1: Find the Exact Redirect URI

1. **Open browser developer tools** (F12)
2. **Go to Network tab**
3. **Click "Connect Google Calendar"** in your app
4. **Look for the OAuth request** in the network tab
5. **Copy the exact `redirect_uri` parameter** from the request

OR use this command to see what URI the backend is generating:

```bash
curl "http://localhost:8001/api/calendar/auth-url?redirect_uri=http://localhost:8001/api/calendar/oauth/callback"
```

### Step 2: Update Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select "family-care-system" project**
3. **Go to APIs & Services → Credentials**
4. **Click on your OAuth 2.0 Client ID** (the one named "support-management-system")
5. **In "Authorized redirect URIs", add EXACTLY:**
   ```
   http://localhost:8001/api/calendar/oauth/callback
   ```
6. **Remove any other localhost URIs that don't match exactly**
7. **Click Save**

### Step 3: Common URI Variations to Check

Make sure you have the EXACT URI. Common mistakes:
- ❌ `http://localhost:8001/api/calendar/oauth/callback/` (extra slash)
- ❌ `https://localhost:8001/api/calendar/oauth/callback` (https instead of http)
- ❌ `http://127.0.0.1:8001/api/calendar/oauth/callback` (127.0.0.1 instead of localhost)
- ✅ `http://localhost:8001/api/calendar/oauth/callback` (correct)

### Step 4: Test Again

1. **Wait 1-2 minutes** for Google's changes to propagate
2. **Refresh your app** at `http://localhost:3000`
3. **Click "Connect Google Calendar"** again
4. **Should now work without redirect_uri_mismatch error**

## 🔍 Alternative: Check Current OAuth Settings

If you want to see what redirect URIs are currently configured:

1. **Go to Google Cloud Console**
2. **APIs & Services → Credentials**
3. **Click on your OAuth 2.0 Client ID**
4. **Look at "Authorized redirect URIs" section**
5. **Should contain exactly:** `http://localhost:8001/api/calendar/oauth/callback`

## 🎯 Expected Result

After fixing the redirect URI:
- ✅ OAuth popup opens without "redirect_uri_mismatch" error
- ✅ Shows Google authorization screen for "family-care-system"
- ✅ Authorization completes successfully
- ✅ Popup closes automatically
- ✅ Calendar appointments load

The key is that the redirect URI in Google Cloud Console must match EXACTLY what your app is sending.
