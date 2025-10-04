# Deployment Guide

## Architecture
- **Frontend:** Vercel (React)
- **Backend:** Google Cloud Run (FastAPI)
- **Database:** Supabase (already hosted)

---

## 🖥️ LOCAL DEVELOPMENT SETUP

### Prerequisites
- Node.js 16+ and npm
- Python 3.11+
- Git

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd support-management-system
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env example and fill in your credentials
cp .env.example .env
# Edit .env with your Supabase URL and KEY

# Run backend
python server.py
```

Backend will run on `http://localhost:8001`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy env example and configure
cp .env.example .env.local
# Edit .env.local:
# REACT_APP_BACKEND_URL=http://localhost:8001
# REACT_APP_USERNAME=your_username
# REACT_APP_PASSWORD=your_password

# Run frontend
npm start
```

Frontend will open on `http://localhost:3000`

**Login with your credentials!**

---

## 🚀 PRODUCTION DEPLOYMENT

### Prerequisites
- Google Cloud account
- GitHub repository
- Vercel account (already connected to GitHub)
- Supabase credentials

---

## Step 1: Deploy Backend to Google Cloud Run

### 1.1 Install Google Cloud SDK (if not already installed)
```bash
# macOS
brew install google-cloud-sdk

# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### 1.2 Build and Deploy
```bash
cd backend

# Build the container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/support-backend

# Deploy to Cloud Run
gcloud run deploy support-backend \
  --image gcr.io/YOUR_PROJECT_ID/support-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=your_supabase_url,SUPABASE_KEY=your_supabase_key"
```

### 1.3 Note Your Service URL
After deployment, you'll get a URL like:
```
https://support-backend-xxxxx-uc.a.run.app
```

**Save this URL!** You'll need it for Vercel.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Set Environment Variables in Vercel

Go to your Vercel project dashboard:
1. Click on **Settings** → **Environment Variables**
2. Add these variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `REACT_APP_BACKEND_URL` | `https://support-backend-xxxxx-uc.a.run.app` | Production |
| `REACT_APP_USERNAME` | `your_admin_username` | Production |
| `REACT_APP_PASSWORD` | `your_secure_password` | Production |

### 2.2 Push to GitHub
```bash
git add .
git commit -m "Add deployment config and login"
git push origin main
```

Vercel will automatically detect the push and deploy!

### 2.3 Update Backend CORS

After you get your Vercel URL (e.g., `https://your-app.vercel.app`):

Edit `backend/server.py` and update the CORS origins:
```python
origins = [
    "https://your-app.vercel.app",  # Your Vercel URL
    "http://localhost:3000",        # Keep for local dev
]
```

Then redeploy backend:
```bash
cd backend
gcloud run deploy support-backend --source .
```

---

## 🧪 Testing Deployment

1. Visit your Vercel URL
2. Login with your credentials
3. Test all features:
   - Worker management
   - Shift creation
   - Calendar view
   - Hours tracker

---

## 💰 Cost Estimate

- **Vercel:** Free (Hobby plan)
- **Google Cloud Run:** ~$0-5/month (likely free tier for 5 participants)
- **Supabase:** Free tier

**Total: ~$0-5/month**

---

## 📊 Monitoring & Logs

### Backend Logs (Cloud Run)
```bash
gcloud run services logs read support-backend --limit 50
```

### Frontend Logs
Available in Vercel dashboard → Deployments → Function Logs

### Database
Monitor in Supabase dashboard

---

## 🔒 Security Notes

1. **Never commit `.env` files** - already in `.gitignore`
2. **Use strong passwords** for login
3. **Keep Supabase keys secure**
4. **Update CORS origins** to only allow your domains

---

## 🐛 Troubleshooting

### "Backend connection failed"
- Check `REACT_APP_BACKEND_URL` in Vercel env vars
- Verify Cloud Run service is running: `gcloud run services list`

### "Login not working"
- Check `REACT_APP_USERNAME` and `REACT_APP_PASSWORD` in Vercel
- Clear browser cache and try again

### "CORS error"
- Ensure your Vercel URL is in backend `server.py` origins list
- Redeploy backend after adding it

---

## 📝 Quick Reference Commands

### Local Development
```bash
# Backend
cd backend && source venv/bin/activate && python server.py

# Frontend
cd frontend && npm start
```

### Production Deploy
```bash
# Backend
cd backend && gcloud run deploy support-backend --source .

# Frontend
git push origin main  # Vercel auto-deploys
```

---

## 🆘 Need Help?

- **Cloud Run Issues:** https://cloud.google.com/run/docs
- **Vercel Issues:** https://vercel.com/docs
- **Supabase Issues:** https://supabase.com/docs

---

**Environment Variables Summary:**

### Backend (Cloud Run)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `PORT` (auto-set to 8080 by Cloud Run)

### Frontend (Vercel)
- `REACT_APP_BACKEND_URL`
- `REACT_APP_USERNAME`
- `REACT_APP_PASSWORD`
