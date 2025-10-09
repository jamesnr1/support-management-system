# 🖥️ Local Development Setup (Quick Start)

If you're cloning this repo to debug locally, here's the fastest path:

## ⚡ Quick Start (5 minutes)

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
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
nano .env  # Edit with your Supabase credentials
```

**Required in `.env`:**
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PORT=8001
```

**Start backend:**
```bash
python server.py
```

✅ Backend running on `http://localhost:8001`

---

### 3. Frontend Setup
```bash
cd ../frontend  # From project root

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
nano .env.local  # Edit configuration
```

**Required in `.env.local`:**
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_USERNAME=admin
REACT_APP_PASSWORD=your_password
```

**Start frontend:**
```bash
npm start
```

✅ Frontend opens at `http://localhost:3000`

---

## 🎯 Common Tasks

### Restart Backend
```bash
cd backend
pkill -f "python.*server.py"
source venv/bin/activate
python server.py
```

### Clear Frontend Cache
```bash
cd frontend
rm -rf node_modules/.cache
npm start
```

### View Logs
```bash
# Backend logs
tail -f backend/backend.log

# Frontend - shows in terminal
```

---

## 🐛 Debugging Checklist

If something's broken:

1. ✅ Is backend running? → `curl http://localhost:8001/health`
2. ✅ Is frontend running? → Open `http://localhost:3000`
3. ✅ Are env files configured? → Check `.env` and `.env.local`
4. ✅ Check browser console for errors
5. ✅ Check backend logs: `tail -f backend/backend.log`

---

## 📦 What's Where

```
support-management-system/
├── backend/
│   ├── server.py          # FastAPI app
│   ├── database.py        # Supabase interface
│   ├── models.py          # Data models
│   ├── .env               # Your credentials (NOT in git)
│   └── requirements.txt   # Python packages
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RosteringSystem.js    # Main app
│   │   │   ├── Login.js              # Auth
│   │   │   ├── WorkerManagement.js   # Workers
│   │   │   └── ...
│   │   └── App.js
│   ├── .env.local         # Your config (NOT in git)
│   └── package.json
│
└── DEPLOYMENT.md          # Production deploy guide
```

---

## 🔑 Environment Variables

### Backend `.env`
| Variable | Required | Example |
|----------|----------|---------|
| `SUPABASE_URL` | ✅ Yes | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ Yes | `eyJhbG...` |
| `PORT` | Optional | `8001` |

### Frontend `.env.local`
| Variable | Required | Example |
|----------|----------|---------|
| `REACT_APP_BACKEND_URL` | ✅ Yes | `http://localhost:8001` |
| `REACT_APP_USERNAME` | ✅ Yes | `admin` |
| `REACT_APP_PASSWORD` | ✅ Yes | `your_password` |

---

## 💡 Pro Tips

1. **Keep both terminals open:** One for backend, one for frontend
2. **Hot reload:** Both backend (with uvicorn) and frontend auto-reload on file changes
3. **API testing:** Use `curl` or Postman to test backend directly
4. **React DevTools:** Install browser extension for debugging
5. **Console logging:** Check browser console for frontend issues

---

## 🚀 Ready to Deploy?

See **DEPLOYMENT.md** for production deployment to:
- Frontend → Vercel
- Backend → Google Cloud Run
- Database → Already on Supabase!

---

## 📞 Quick Commands Reference

```bash
# Start everything
cd backend && source venv/bin/activate && python server.py &
cd frontend && npm start

# Stop everything
pkill -f "python.*server.py"
# Ctrl+C in frontend terminal

# Fresh install
rm -rf backend/venv frontend/node_modules
# Then repeat setup steps above
```

---

Happy debugging! 🐛🔧
