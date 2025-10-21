# 🚀 Vercel Deployment Guide

## Architecture
- **Frontend:** Vercel (React)
- **Backend:** Render (Python/FastAPI)
- **Database:** Supabase (already hosted)

## Current Setup
- **GitHub Repo**: https://github.com/jamesnr1/support-management-system.git
- **Vercel**: Already linked to GitHub repo
- **Production Branch**: `main`

## ✅ Quick Deploy Steps

### 1. Push Your Changes to GitHub
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

### 2. Vercel Auto-Deploys Frontend
Vercel automatically detects the push and deploys the React frontend. Backend deployment is handled separately on Render.

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
- [ ] All commits pushed to main branch

## 🔄 Continuous Deployment

**Every time you push to main:**
1. **Frontend:** Vercel automatically detects the change and deploys React app
2. **Backend:** Render automatically deploys (if configured for auto-deploy)
3. Previous versions available as rollback on both platforms

## 🐛 Troubleshooting

### Build Fails on Vercel
1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - Python dependencies not found
   - Build timeout

### Availability Not Saving
1. Check `SUPABASE_SERVICE_KEY` is set correctly in Render
2. Verify backend logs in Render dashboard
3. Check Supabase connection

### Backend Connection Failed
1. Check `REACT_APP_BACKEND_URL` in Vercel env vars points to Render backend
2. Verify backend is deployed successfully on Render
3. Check CORS settings in Render backend

## 📊 Monitoring & Logs

### Backend Logs
Available in Render dashboard → Your Service → Logs tab

### Frontend Logs
Available in Vercel dashboard → Deployments → Function Logs

### Database
Monitor in Supabase dashboard

## 🔒 Security Notes

1. **Never commit `.env` files** - already in `.gitignore`
2. **Use strong passwords** for login
3. **Keep Supabase keys secure**
4. **Environment variables are encrypted** in Vercel

---

## 🆘 Need Help?

- **Vercel Issues:** https://vercel.com/docs
- **Supabase Issues:** https://supabase.com/docs
- **FastAPI Issues:** https://fastapi.tiangolo.com/

---

**Environment Variables Summary:**

### Backend (Render)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_CLIENT_SECRETS_FILE`
- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`

### Frontend (Vercel)
- `REACT_APP_BACKEND_URL`
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
