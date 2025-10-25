# 🔧 Troubleshooting Guide

## Quick Diagnostics

### Health Check Commands
```bash
# Check backend health
curl http://localhost:8000/health

# Check readiness
curl http://localhost:8000/ready

# Check frontend
curl http://localhost:3000/health
```

### Docker Status
```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart
```

---

## 🚨 Common Issues & Solutions

### 1. Authentication Issues

#### Problem: "Invalid or missing admin token"
**Symptoms:**
- 401 Unauthorized errors
- Cannot access admin endpoints

**Solutions:**
1. **Check environment variables:**
   ```bash
   echo $ADMIN_SECRET_KEY
   ```

2. **Verify .env file:**
   ```bash
   # Ensure .env file exists and contains:
   ADMIN_SECRET_KEY=your-strong-secret-key
   ```

3. **Check token in requests:**
   ```bash
   # Include X-Admin-Token header
   curl -H "X-Admin-Token: your-secret-key" http://localhost:8000/api/workers
   ```

4. **Regenerate secret key:**
   ```bash
   # Generate new key
   openssl rand -hex 32
   ```

#### Problem: "CORS error"
**Symptoms:**
- Browser console shows CORS errors
- Frontend cannot connect to backend

**Solutions:**
1. **Check ALLOWED_ORIGINS:**
   ```bash
   # In .env file
   ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
   ```

2. **Verify frontend URL:**
   ```bash
   # Ensure frontend is running on allowed origin
   echo $REACT_APP_BACKEND_URL
   ```

3. **Restart backend after CORS changes:**
   ```bash
   docker-compose restart backend
   ```

### 2. Database Connection Issues

#### Problem: "Database connection failed"
**Symptoms:**
- Health check shows database: false
- API returns 500 errors

**Solutions:**
1. **Verify Supabase credentials:**
   ```bash
   # Check environment variables
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_KEY
   ```

2. **Test Supabase connection:**
   ```bash
   # Run database test
   python backend/scripts/test_database.py
   ```

3. **Check Supabase project status:**
   - Log into Supabase dashboard
   - Verify project is active
   - Check API keys are correct

4. **Run database migrations:**
   ```sql
   -- Execute in Supabase SQL Editor
   -- File: backend/scripts/complete_database_upgrade.sql
   ```

#### Problem: "Table does not exist"
**Symptoms:**
- 404 errors for database operations
- Missing tables in Supabase

**Solutions:**
1. **Run complete database setup:**
   ```sql
   -- Execute all scripts in order:
   -- 1. backend/scripts/complete_database_upgrade.sql
   -- 2. Check table creation in Supabase dashboard
   ```

2. **Verify table structure:**
   ```sql
   -- Check if tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### 3. Performance Issues

#### Problem: "Slow API responses"
**Symptoms:**
- API responses > 1 second
- Timeout errors

**Solutions:**
1. **Check database indexes:**
   ```sql
   -- Verify indexes exist
   SELECT indexname, tablename FROM pg_indexes 
   WHERE schemaname = 'public';
   ```

2. **Run performance test:**
   ```bash
   python backend/scripts/performance_test.py
   ```

3. **Check resource usage:**
   ```bash
   # Docker resource usage
   docker stats
   
   # System resources
   top
   htop
   ```

4. **Optimize queries:**
   - Check slow query log
   - Add missing indexes
   - Optimize database queries

#### Problem: "High memory usage"
**Symptoms:**
- System running out of memory
- OOM (Out of Memory) errors

**Solutions:**
1. **Check memory usage:**
   ```bash
   # Docker memory usage
   docker stats --no-stream
   
   # System memory
   free -h
   ```

2. **Optimize Docker resources:**
   ```yaml
   # In docker-compose.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

3. **Restart services:**
   ```bash
   docker-compose restart
   ```

### 4. Deployment Issues

#### Problem: "Docker build failed"
**Symptoms:**
- Build errors during deployment
- Missing dependencies

**Solutions:**
1. **Check Dockerfile syntax:**
   ```bash
   # Validate Dockerfile
   docker build --no-cache -t test .
   ```

2. **Clear Docker cache:**
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

3. **Check dependencies:**
   ```bash
   # Backend dependencies
   pip install -r backend/requirements.txt
   
   # Frontend dependencies
   cd frontend && yarn install
   ```

#### Problem: "Services not starting"
**Symptoms:**
- Containers exit immediately
- Health checks failing

**Solutions:**
1. **Check logs:**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **Verify environment variables:**
   ```bash
   # Check .env file exists and is valid
   cat .env
   ```

3. **Test individual services:**
   ```bash
   # Test backend
   docker-compose up backend
   
   # Test frontend
   docker-compose up frontend
   ```

### 5. Frontend Issues

#### Problem: "Frontend not loading"
**Symptoms:**
- Blank page
- JavaScript errors

**Solutions:**
1. **Check browser console:**
   - Open Developer Tools
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Verify environment variables:**
   ```bash
   # Check frontend .env
   echo $REACT_APP_BACKEND_URL
   echo $REACT_APP_ENVIRONMENT
   ```

3. **Clear browser cache:**
   - Hard refresh (Ctrl+F5)
   - Clear browser cache
   - Try incognito/private mode

4. **Check build process:**
   ```bash
   cd frontend
   yarn build
   ```

#### Problem: "API calls failing"
**Symptoms:**
- Network errors in browser
- 404/500 errors

**Solutions:**
1. **Check API endpoint:**
   ```bash
   # Test API directly
   curl http://localhost:8000/api/workers
   ```

2. **Verify CORS configuration:**
   ```bash
   # Check CORS headers
   curl -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS \
        http://localhost:8000/api/workers
   ```

3. **Check authentication:**
   ```bash
   # Test with admin token
   curl -H "X-Admin-Token: your-secret-key" \
        http://localhost:8000/api/workers
   ```

---

## 🔍 Advanced Diagnostics

### Database Diagnostics
```bash
# Check database connection
python backend/scripts/test_database.py

# Run database health check
python backend/scripts/health_check.py

# Check database performance
python backend/scripts/performance_test.py
```

### Security Audit
```bash
# Run security audit
python backend/scripts/security_audit.py

# Check for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image your-image-name
```

### Performance Monitoring
```bash
# Monitor system resources
docker stats

# Check application logs
docker-compose logs -f --tail=100

# Monitor network traffic
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000
```

---

## 📞 Getting Help

### Log Collection
When reporting issues, collect these logs:

```bash
# System logs
docker-compose logs > system.log

# Health check
curl http://localhost:8000/health > health.json

# Environment info
env > environment.txt

# Docker info
docker info > docker-info.txt
```

### Support Channels
1. **Check this troubleshooting guide first**
2. **Review error logs and health endpoints**
3. **Run diagnostic scripts**
4. **Check GitHub issues for similar problems**

### Emergency Recovery
```bash
# Complete system restart
docker-compose down
docker system prune -f
docker-compose up -d

# Restore from backup
python backend/scripts/restore_backup.py

# Reset to clean state
git checkout main
docker-compose down -v
docker-compose up -d
```

---

## 🎯 Prevention Tips

### Regular Maintenance
1. **Monitor health endpoints daily**
2. **Check logs weekly**
3. **Update dependencies monthly**
4. **Run security audits quarterly**

### Best Practices
1. **Always use environment variables for secrets**
2. **Keep backups up to date**
3. **Monitor resource usage**
4. **Test deployments in staging first**

### Monitoring Setup
1. **Set up health check monitoring**
2. **Configure error alerting**
3. **Monitor performance metrics**
4. **Set up log aggregation**

---

**Remember: Most issues can be resolved by checking logs, verifying environment variables, and restarting services. When in doubt, start with the health check endpoints!**
