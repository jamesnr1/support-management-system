# Support Management System

A comprehensive Support Support Management System with enterprise-grade security, performance, and maintainability.

## 🚀 Features

### Core Functionality
- **Roster Management:** Create and manage support worker rosters
- **Staff Management:** Manage support workers and their availability
- **Participant Management:** Track Support participants and their requirements
- **Shift Scheduling:** Schedule and track support worker shifts
- **Hours Tracking:** Monitor and report on support hours
- **Calendar Integration:** Google Calendar integration for appointments
- **AI Assistant:** AI-powered assistance for roster management

### Security & Performance
- **Authentication:** JWT-based admin authentication
- **Rate Limiting:** Protection against DoS attacks
- **CORS Security:** Production domain restrictions
- **Error Tracking:** Sentry integration for monitoring
- **Health Monitoring:** Real-time system health checks
- **Data Protection:** Soft deletes and automated backups
- **Performance:** Optimized database queries and caching

## 🏗️ Architecture

### Backend (FastAPI + Python)
```
backend/
├── api/                    # API routes and dependencies
├── core/                   # Core functionality (config, security, logging)
├── services/               # Business logic services
├── scripts/                # Database scripts and utilities
├── tests/                  # Comprehensive test suite
└── main.py                 # Modular application entry point
```

### Frontend (React + TypeScript)
```
frontend/src/
├── components/             # React components
│   ├── layout/            # Layout components
│   ├── roster/            # Roster management
│   ├── staff/             # Staff management
│   └── common/            # Shared components
├── contexts/              # React Context for state management
├── api/                   # API client
└── __tests__/             # Frontend tests
```

### Database (Supabase PostgreSQL)
- **Soft Deletes:** No permanent data loss
- **Performance Indexes:** Optimized query performance
- **Foreign Key Constraints:** Data integrity
- **Automated Backups:** Daily backup system

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (via Supabase)
- Git

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd support-management-system
```

2. **Set up Python environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure environment variables**
```bash
cp env_example.txt .env
# Edit .env with your configuration
```

4. **Run database migrations**
```sql
-- Execute in Supabase SQL Editor
-- File: backend/scripts/complete_database_upgrade.sql
```

5. **Start the backend**
```bash
python main.py
```

### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
yarn install
```

2. **Configure environment variables**
```bash
# Create .env file
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

3. **Start the frontend**
```bash
yarn start
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Security
ADMIN_SECRET_KEY=your-strong-random-key
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# External APIs
OPENAI_API_KEY=your-openai-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Monitoring
SENTRY_DSN=your-sentry-dsn
ENVIRONMENT=development
APP_VERSION=2.0.0
```

#### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest --cov=. --cov-report=html
```

### Frontend Tests
```bash
cd frontend
yarn test
```

### Run All Tests
```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && yarn test
```

## 🚀 Deployment

### Production Deployment

1. **Database Setup**
   - Run the complete database upgrade script
   - Configure automated backups
   - Set up monitoring

2. **Backend Deployment**
   - Set production environment variables
   - Deploy to your hosting platform (Render, Railway, etc.)
   - Configure health monitoring

3. **Frontend Deployment**
   - Build for production: `yarn build`
   - Deploy to Vercel, Netlify, or your hosting platform
   - Configure environment variables

### CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow that:
- Runs tests on every pull request
- Performs security scans
- Deploys to staging on develop branch
- Deploys to production on main branch

## 📊 Monitoring

### Health Checks
- **Backend:** `GET /health` - System health status
- **Readiness:** `GET /ready` - Load balancer readiness

### Error Tracking
- **Sentry Integration:** Automatic error tracking and alerting
- **Structured Logging:** JSON-formatted logs with request tracking

### Performance Monitoring
- **Database Queries:** Optimized with proper indexes
- **API Response Times:** <100ms (p95)
- **Frontend Performance:** Optimized bundle size and loading

## 🔒 Security

### Authentication
- JWT-based admin authentication
- Secure token storage
- Automatic token refresh

### API Security
- Rate limiting (30/min GET, 10/min POST)
- CORS domain restrictions
- Input validation and sanitization

### Data Protection
- Soft deletes prevent data loss
- Automated daily backups
- Encrypted sensitive data

## 📚 API Documentation

### Authentication
```bash
# Login
POST /api/auth/login
{
  "password": "your-admin-password"
}

# All admin endpoints require X-Admin-Token header
```

### Workers
```bash
# Get all workers
GET /api/workers

# Create worker (admin only)
POST /api/workers
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890"
}
```

### Roster
```bash
# Get roster
GET /api/roster/current

# Update roster (admin only)
POST /api/roster/current
{
  "data": {
    "shifts": [...]
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the [Deployment Guide](DEPLOYMENT_GUIDE.md)
- Review the [Upgrade Summary](UPGRADE_COMPLETE_SUMMARY.md)
- Check health endpoints: `/health` and `/ready`
- Review Sentry error logs

### Common Issues
- **Authentication errors:** Check ADMIN_SECRET_KEY configuration
- **Database connection:** Verify Supabase credentials
- **CORS errors:** Check ALLOWED_ORIGINS configuration
- **Performance issues:** Review database indexes

## 🎯 Roadmap

### Short-term (Next 3 months)
- [ ] User roles and permissions
- [ ] Advanced reporting features
- [ ] Mobile responsiveness improvements
- [ ] Additional test coverage

### Medium-term (3-6 months)
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Integration with external systems
- [ ] Performance optimizations

### Long-term (6+ months)
- [ ] Microservices architecture
- [ ] Multi-tenant support
- [ ] Advanced AI features
- [ ] International support

---

**Built with ❤️ for Support Support Coordination**

For more information, see the [Complete Upgrade Summary](UPGRADE_COMPLETE_SUMMARY.md) and [Deployment Guide](DEPLOYMENT_GUIDE.md).