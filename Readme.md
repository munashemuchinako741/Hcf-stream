# HCF Live Stream System

## Overview
The HCF Live Stream System is a modern web platform designed to deliver secure, high-quality live streaming and on-demand multimedia content to registered users. Built with Next.js 14, React, TypeScript, and PostgreSQL.

## Tech Stack
- **Frontend**: Next.js 14 with App Router, React 19, TypeScript
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcrypt password hashing
- **State Management**: Zustand
- **Validation**: Zod
- **Caching**: Redis for session management and rate limiting
- **Monitoring**: Prometheus metrics, Winston logging, PM2 clustering
- **Security**: Helmet, CORS, rate limiting, input validation
- **Load Testing**: Artillery for performance testing
- **Containerization**: Docker with Docker Compose
- **Reverse Proxy**: Nginx with load balancing

## Project Structure
```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── sermons/      # Sermon management
│   │   └── streams/      # Live stream management
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # User dashboard
│   └── admin/            # Admin panel
├── lib/                  # Shared utilities
│   └── auth.ts          # Authentication helpers
├── server/              # Server-side code
│   └── db.ts           # Database connection
├── shared/             # Shared types and schemas
│   └── schema.ts       # Drizzle schema definitions
└── drizzle.config.ts   # Drizzle ORM configuration
```

## Features Implemented

### Authentication System
- User registration with email/username/password
- Secure login with JWT tokens
- Role-based access control (admin, user)
- Admin approval workflow for new users
- Protected routes

### User Dashboard
- Personal dashboard with overview
- Sermon archive browsing
- Live stream viewing
- Favorites management

### Admin Dashboard
- User management
- Content approval workflows
- Sermon management
- Live stream control
- Analytics overview

### Content Management
- Sermon archive with metadata
- Live stream scheduling
- Categories and series organization
- View tracking

## Database Schema

### Tables
1. **users** - User accounts and authentication
2. **sermons** - Sermon content and metadata
3. **live_streams** - Live streaming events
4. **favorites** - User bookmarked content

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis (for production caching and rate limiting)
- Docker and Docker Compose (for containerized deployment)

### 1. Environment Setup
Create a `.env` file in the root directory with the following variables:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/hcf_stream
JWT_SECRET=your-super-secure-jwt-secret-here
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

### 2. Database Setup
The application requires a PostgreSQL database. Set the `DATABASE_URL` environment variable.

### 3. Database Migration
Run the database migration to create tables:
```bash
# Frontend database
cd frontend && npm run db:push

# Backend database (if separate)
cd backend && npm run db:migrate
```

### 4. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### 5. Create First Admin User
After the app is running:
1. Register a user through the website (they will be pending approval)
2. Manually approve and promote to admin in the database:
```sql
UPDATE users SET role = 'admin', is_approved = true WHERE email = 'munashemuchinako741@gmail.com';
```
3. Now you can login with that account as admin

### 6. Start Development Server
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from root directory)
npm run dev
```

### Production Deployment

#### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Using PM2 (Backend only)
```bash
cd backend
npm run pm2:start    # Start with clustering
npm run pm2:stop     # Stop all processes
npm run pm2:restart  # Restart processes
npm run pm2:logs     # View logs
```

### Load Testing
Run performance tests with Artillery:
```bash
cd backend
npx artillery run scripts/load-test.yml --output report.json
```

### Monitoring
- **Health Checks**: Visit `http://localhost:5000/health`
- **Metrics**: Visit `http://localhost:5000/metrics` (Prometheus format)
- **Logs**: Check `backend/logs/` directory for Winston logs

## User Roles

### User (Default)
- View published sermons
- Watch live streams
- Bookmark favorite content
- Requires admin approval to access content

### Admin
- All user permissions
- Approve new users
- Create and manage sermons
- Schedule and manage live streams
- Access analytics dashboard

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/v2/auth/register` - Register with enhanced security (v2)
- `POST /api/v2/auth/login` - Login with enhanced security (v2)

### Sermons (Admin)
- `GET /api/sermons` - List all sermons
- `POST /api/sermons` - Create new sermon

### Live Streams (Admin)
- `GET /api/streams` - List all streams
- `POST /api/streams` - Create new stream

### System Endpoints
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics endpoint
- `GET /` - API root endpoint

### Facebook Live (Admin)
- `GET /api/facebook-live` - List Facebook live streams
- `POST /api/facebook-live` - Create Facebook live stream

### Archive (Admin)
- `GET /api/archive` - List archived content
- `POST /api/archive` - Archive content

## Security Features
- **Password hashing** with bcrypt (10 rounds)
- **HTTP-only cookies** for JWT tokens (secure, sameSite: lax)
- **Protected API routes** with JWT verification
- **Role-based authorization** (admin, user roles)
- **Admin approval workflow** - new users cannot access content until approved
- **Required JWT_SECRET** - fails fast if not set, no insecure defaults
- **SQL injection protection** via Drizzle ORM parameterized queries
- **Approval gating** - unapproved users blocked at login and API level
- **Rate limiting** - API and auth endpoint protection with Redis
- **Security headers** - Helmet.js for comprehensive security headers
- **Input validation** - Zod schemas for request validation
- **CORS protection** - Configured cross-origin policies
- **Compression** - Response compression for better performance
- **Clustering** - PM2 multi-process architecture for production

## Performance Benchmarks

### Load Testing Results (Artillery)
- **Warm-up Phase**: 10 requests/second for 60 seconds
- **Load Phase**: 50 requests/second for 120 seconds
- **Stress Phase**: 100 requests/second for 60 seconds
- **Test Scenarios**: Health checks, authentication, rate limiting

### Monitoring Metrics
- **Response Time**: < 2000ms average under load
- **Error Rate**: < 1% under normal conditions
- **Throughput**: 50+ requests/second sustained
- **Memory Usage**: < 80% Redis memory threshold
- **Database Connections**: < 80% max connections threshold

## Future Enhancements
- Social media sharing integration
- Email notification system
- Advanced search and filtering
- Content categorization
- Video player integration
- Analytics and reporting
- Mobile responsive improvements
- CDN integration for static assetsP
- Advanced monitoring with Grafana dashboards
- Automated CI/CD pipelines
- Database migration scripts
- Environment-specific configurations

## Development Notes
- The application uses Next.js App Router for routing
- All pages use server-side rendering where possible
- Client components are marked with 'use client' directive
- Database migrations are handled via Drizzle Kit

## Last Updated
November 3, 2025
