# 🚀 Deployment Guide - GitHub + Vercel

## Architecture
- **Frontend:** Vercel (React)
- **Backend:** Render (Python/FastAPI)
- **Database:** Supabase (already hosted)

## Current Setup
- **GitHub Repo**: https://github.com/jamesnr1/support-management-system.git
- **Vercel**: Already linked to GitHub repo
- **Current Branch**: `feature/current-planning-tabs`
- **Production Branch**: `main`

## ✅ Quick Deploy Steps

### 1. Push Your Changes to GitHub

```bash
# Push your feature branch to GitHub
git push origin feature/current-planning-tabs
```

### 2. Merge to Main (for Production Deployment)

**Option A: Via GitHub Web UI (Recommended)**
1. Go to https://github.com/jamesnr1/support-management-system
2. Click "Pull Requests" → "New Pull Request"
3. Base: `main` ← Compare: `feature/current-planning-tabs`
4. Click "Create Pull Request"
5. Review changes → Click "Merge Pull Request"
6. **Vercel will automatically deploy within 2-5 minutes!** 🎉

**Option B: Via Command Line**
```bash
# Switch to main
git checkout main

# Pull latest changes
git pull origin main

# Merge your feature branch
git merge feature/current-planning-tabs

# Push to GitHub
git push origin main
```

### 3. Deployment (Automatic)
- **Frontend:** Vercel detects the push to `main` and deploys React app
- **Backend:** Render automatically deploys from GitHub (if configured)
- You'll get notifications when deployments complete

## 🔐 Vercel Login

**How to Access Vercel:**
1. Go to https://vercel.com
2. Click "Login"
3. Choose login method:
   - "Continue with GitHub" (most common)
   - "Continue with GitLab"
   - "Continue with Email"
4. No password needed if using GitHub OAuth

**If already logged in:**
- You're good to go! Just push to GitHub and watch it deploy

## 📊 Monitoring Deployment

### Vercel Dashboard
1. Login to https://vercel.com
2. Find your project: "support-management-system"
3. See deployment status in real-time
4. View logs, preview URLs, and production URL

### What Vercel Shows:
- ✅ Build status (Building → Success/Failed)
- 🔗 Preview URL (for feature branches)
- 🌐 Production URL (for main branch)
- 📝 Build logs
- ⚡ Performance metrics

## 🌐 Your URLs

### Production URL (after deploy to main)
- Will be something like: `https://support-management-system.vercel.app`
- Or your custom domain if configured

### Preview URL (for feature branches)
- Automatically created for each branch push
- Format: `https://support-management-system-[random].vercel.app`

## ⚙️ Environment Variables

**Important:** Make sure these are set in their respective platforms:

### Backend Variables (Required - Set in Render)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
GOOGLE_CLIENT_SECRETS_FILE=client_secrets.json
TELEGRAM_BOT_TOKEN=your_telegram_token
```

### Frontend Variables (Required - Set in Vercel)
```
REACT_APP_BACKEND_URL=your_render_backend_url
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables
```
OPENAI_API_KEY=your_openai_key (for AI chat)
```

**To Set Variables:**
1. **Frontend (Vercel):** Dashboard → Your Project → "Settings" → "Environment Variables"
2. **Backend (Render):** Dashboard → Your Service → "Environment" tab
3. Add each variable to the appropriate platform
4. Redeploy if needed

## 🎯 Deployment Checklist

Before deploying to production:

- [ ] All features tested locally
- [ ] Environment variables set in Vercel (frontend) and Render (backend)
- [ ] Database (Supabase) is production-ready
- [ ] Google Calendar credentials configured
- [ ] Telegram bot configured (if using)
- [ ] Frontend build works: `cd frontend && npm run build`
- [ ] Backend runs: `cd backend && python server.py`
- [ ] No console errors
- [ ] All commits pushed to feature branch
- [ ] Create PR to main (or merge directly)

## 🔄 Continuous Deployment

**Every time you push to main:**
1. **Frontend:** Vercel automatically detects the change and deploys React app
2. **Backend:** Render automatically deploys (if configured for auto-deploy)
3. Previous versions available as rollback on both platforms

**For feature branches:**
- Vercel creates preview deployments
- Test before merging to main
- Each commit gets a unique preview URL

## 🐛 Troubleshooting

### Build Fails on Vercel
1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - Node version mismatch
   - Build script errors
   - Missing dependencies

### Backend Not Working
1. Check if backend is deployed on Render
2. Verify `REACT_APP_BACKEND_URL` points to correct Render backend URL
3. Check backend logs in Render dashboard

### Environment Variables Not Working
1. Make sure frontend variables are set in Vercel and backend variables in Render
2. Redeploy after adding variables
3. Use `REACT_APP_` prefix for frontend variables

## 📞 Need Help?

1. **Vercel Docs**: https://vercel.com/docs
2. **Vercel Support**: support@vercel.com
3. **Check build logs** in Vercel dashboard
4. **Preview deployment** before production

## 🎉 Ready to Deploy!

```bash
# Quick deploy command:
git push origin feature/current-planning-tabs

# Then merge to main via GitHub PR
# Or:
git checkout main
git merge feature/current-planning-tabs
git push origin main

# Watch Vercel deploy automatically! 🚀
```

---
*Last updated: October 9, 2024*
*System version: Production-ready with appointment system ✅*
