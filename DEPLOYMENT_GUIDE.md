# Support Management System - Deployment Guide

## 🚀 Complete System Upgrade Deployment

This guide covers deploying the fully upgraded Support Management System with all security, performance, and code quality improvements.

---

## 📋 Pre-Deployment Checklist

### ✅ Security Improvements
- [x] Authentication added to all admin endpoints
- [x] CORS configured for production domains only
- [x] Rate limiting implemented
- [x] Structured logging with error tracking
- [x] Health check endpoints added

### ✅ Data Protection
- [x] Soft deletes implemented
- [x] Database indexes added
- [x] Foreign key constraints fixed
- [x] Backup scripts created

### ✅ Code Quality
- [x] Server.py split into modular structure
- [x] Frontend components refactored
- [x] Comprehensive tests added
- [x] CI/CD pipeline configured

---

## 🗄️ Database Migration

### Step 1: Run Database Upgrade Script

Execute the complete database upgrade in Supabase SQL Editor:

```sql
-- Run the complete upgrade script
-- File: backend/scripts/complete_database_upgrade.sql
```

This script will:
- Add soft delete columns to all tables
- Create performance indexes
- Fix foreign key constraints
- Create views for active records
- Update table statistics

### Step 2: Verify Migration

Check that the migration was successful:

```sql
-- Verify soft delete columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('support_workers', 'participants', 'shifts') 
AND column_name = 'deleted_at';

-- Verify indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('support_workers', 'participants', 'shifts', 'worker_availability');
```

---

## 🔧 Backend Deployment

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Environment Configuration

Create production environment variables:

```bash
# Security
ADMIN_SECRET_KEY=your-strong-random-32-char-key
ALLOWED_ORIGINS=https://your-production-domain.vercel.app

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# External APIs
OPENAI_API_KEY=your-openai-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Monitoring
SENTRY_DSN=your-sentry-dsn
ENVIRONMENT=production
APP_VERSION=2.0.0
```

### Step 3: Deploy Backend

#### Option A: Render.com
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy from main branch

#### Option B: Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy from main branch

#### Option C: Manual Deployment
```bash
# Install dependencies
pip install -r requirements.txt

# Run the new modular server
python main.py
```

---

## 🎨 Frontend Deployment

### Step 1: Install Dependencies

```bash
cd frontend
yarn install
```

### Step 2: Environment Configuration

Create production environment variables:

```bash
REACT_APP_BACKEND_URL=https://your-backend-url.com
REACT_APP_ENVIRONMENT=production
```

### Step 3: Build and Deploy

```bash
# Build for production
yarn build

# Deploy to Vercel
vercel --prod
```

---

## 🧪 Testing Deployment

### Step 1: Health Check

```bash
curl https://your-backend-url.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T10:00:00Z",
  "database": {
    "connected": true,
    "can_query": true
  },
  "version": "2.0.0",
  "environment": "production"
}
```

### Step 2: Authentication Test

```bash
# Should fail without token
curl -X POST https://your-backend-url.com/api/workers

# Should succeed with admin token
curl -X POST https://your-backend-url.com/api/workers \
  -H "X-Admin-Token: your-admin-secret"
```

### Step 3: Rate Limiting Test

```bash
# Test rate limiting (should get 429 after 30 requests)
for i in {1..35}; do
  curl https://your-backend-url.com/api/roster/current
done
```

---

## 📊 Monitoring Setup

### Step 1: Sentry Configuration

1. Create account at [sentry.io](https://sentry.io)
2. Create new project for FastAPI
3. Add DSN to environment variables
4. Verify error tracking is working

### Step 2: Database Backups

1. Enable automated backups in Supabase dashboard
2. Test manual backup script:
```bash
python backend/scripts/backup_database.py
```

### Step 3: Health Monitoring

Set up monitoring for:
- `/health` endpoint
- Database connectivity
- API response times
- Error rates

---

## 🔄 CI/CD Pipeline

The GitHub Actions workflow will automatically:

1. **On Pull Request:**
   - Run backend tests
   - Run frontend tests
   - Run linting checks
   - Run security scans

2. **On Push to Develop:**
   - All tests + deploy to staging

3. **On Push to Main:**
   - All tests + security scans + deploy to production

### Manual Deployment

If you need to deploy manually:

```bash
# Backend
cd backend
python main.py

# Frontend
cd frontend
yarn build
yarn start
```

---

## 🚨 Rollback Plan

If issues occur, you can rollback:

### Database Rollback
```sql
-- Remove soft delete columns (if needed)
ALTER TABLE support_workers DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE participants DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE shifts DROP COLUMN IF EXISTS deleted_at;
-- ... repeat for other tables
```

### Application Rollback
```bash
# Revert to previous server.py
git checkout HEAD~1 -- backend/server.py

# Restart services
```

---

## 📈 Performance Monitoring

After deployment, monitor:

1. **Response Times:**
   - API endpoints < 100ms (p95)
   - Database queries < 50ms (p95)

2. **Error Rates:**
   - < 0.1% error rate
   - No 5xx errors

3. **Resource Usage:**
   - Memory usage < 80%
   - CPU usage < 70%

---

## 🎯 Success Criteria

Deployment is successful when:

- [ ] Health check returns "healthy"
- [ ] All admin endpoints require authentication
- [ ] Rate limiting is active
- [ ] Database indexes are working
- [ ] Soft deletes are functional
- [ ] Error tracking is active
- [ ] CI/CD pipeline is green
- [ ] Frontend loads without errors
- [ ] All tests pass

---

## 📞 Support

If you encounter issues:

1. Check the health endpoint
2. Review Sentry error logs
3. Check database connectivity
4. Verify environment variables
5. Review CI/CD pipeline logs

---

## 🎉 Post-Deployment

After successful deployment:

1. **Update Documentation:**
   - Update API documentation
   - Update user guides
   - Update deployment procedures

2. **Team Training:**
   - Train team on new features
   - Update development procedures
   - Review security practices

3. **Monitoring:**
   - Set up alerts
   - Review performance metrics
   - Plan regular maintenance

---

**Congratulations! Your Support Management System is now production-ready with enterprise-grade security, performance, and maintainability!** 🚀