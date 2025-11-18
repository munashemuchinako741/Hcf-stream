# HCF Live Stream System

## Overview
The HCF Live Stream System is a modern web platform designed to deliver secure, high-quality live streaming and on-demand multimedia content for Harare Christian Fellowship. Built with Next.js 16, React 19, TypeScript, and PostgreSQL.

## Tech Stack
- **Frontend**: Next.js 16 with App Router, React 19, TypeScript
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcrypt password hashing + NextAuth (social login)
- **State Management**: React Context API
- **Validation**: Zod schemas
- **Caching**: Redis for session management and rate limiting
- **Monitoring**: Winston logging, PM2 clustering
- **Security**: Helmet, CORS, rate limiting, input validation
- **Video Processing**: FFmpeg with fluent-ffmpeg
- **Storage**: AWS S3 for video uploads and thumbnails
- **Live Streaming**: HLS.js for video playback, Nginx RTMP server
- **Containerization**: Docker with Docker Compose
- **Reverse Proxy**: Nginx with load balancing

## Project Structure
`
├── backend/
│   ├── config/
│   │   ├── logger.js          # Winston logging configuration
│   │   ├── prometheus.js      # Metrics middleware
│   │   ├── redis.js           # Redis client configuration
│   │   └── s3-v3.js           # AWS S3 v3 client and multer upload
│   ├── middleware/
│   │   ├── compression.js     # Response compression
│   │   ├── rateLimiter.js     # Rate limiting middleware
│   │   ├── security.js        # Security headers (Helmet)
│   │   └── validation.js      # Input validation middleware
│   ├── routes/
│   │   ├── admin.js           # Admin dashboard and management routes
│   │   ├── archive.js         # Sermon archive management
│   │   ├── auth.js            # JWT-based authentication
│   │   ├── auth-v2.js         # Enhanced authentication (v2)
│   │   └── facebook-live.js   # Facebook Live integration
│   ├── schema/
│   │   └── schema.js          # Drizzle ORM database schema
│   ├── services/
│   │   └── videoProcessor.js  # FFmpeg video processing service
│   ├── scripts/
│   │   ├── health-monitor.js  # Health monitoring script
│   │   └── optimize-db.js      # Database optimization
│   ├── tests/                 # Backend tests
│   ├── server.js              # Main Express server
│   └── drizzle/               # Database migrations
├── frontend/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes (proxy to backend)
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── archive/           # Sermon archive pages
│   │   ├── auth/              # Authentication pages
│   │   ├── live/              # Live streaming page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   └── upload/            # Video upload page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── admin-stats.tsx    # Admin dashboard statistics
│   │   ├── archive-grid.tsx   # Sermon archive grid
│   │   ├── live-stream-player.tsx # HLS video player
│   │   ├── login-form.tsx     # Login form component
│   │   ├── navigation-header.tsx # Main navigation
│   │   ├── stream-controls.tsx # Live stream controls
│   │   └── video-upload.tsx   # Video upload component
│   ├── lib/
│   │   ├── auth-context.tsx   # Authentication context
│   │   ├── auth.ts            # Authentication utilities
│   │   └── utils.ts           # Utility functions
│   ├── hooks/                 # Custom React hooks
│   ├── public/                # Static assets
│   └── styles/                # Global styles
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile.backend         # Backend Docker configuration
├── Dockerfile.frontend        # Frontend Docker configuration
├── Dockerfile.nginx           # Nginx RTMP server configuration
├── nginx.conf                 # Nginx configuration
└── ssl/                       # SSL certificates
`

## Features Implemented

### Authentication System
- User registration with email/username/password validation
- Secure login with JWT tokens and bcrypt hashing
- Social login integration (Google, Facebook) via NextAuth
- Admin approval workflow for new user accounts
- Password reset functionality with email verification
- Protected routes with role-based access control
- Session management with Redis caching

### User Dashboard
- Personal dashboard with overview
- Sermon archive browsing with filtering
- Live stream viewing with HLS.js player
- Favorites management system
- Responsive design for mobile and desktop

### Admin Dashboard
- User management (approve/reject accounts, role assignment)
- Content approval workflows for uploaded sermons
- Live stream scheduling and management
- Video upload and processing management
- Analytics overview (views, engagement metrics)
- System health monitoring

### Content Management
- Sermon archive with metadata (title, speaker, series, category)
- Live stream scheduling with calendar integration
- Video upload with automatic processing (thumbnail generation, transcoding)
- Categories and series organization
- View tracking and analytics

### Live Streaming
- RTMP ingestion via Nginx server
- HLS streaming with adaptive bitrate
- Real-time viewer count updates
- Stream controls (start/stop) for admins
- Chat integration (placeholder)
- Stream status monitoring

### Video Processing
- Automatic thumbnail generation at 10% of video duration
- Multi-resolution transcoding (1080p, 720p, 480p)
- FFmpeg integration for video manipulation
- S3 storage for processed videos and thumbnails
- Background processing with error handling

## Database Schema

### Tables
1. **users**
   - id (serial, primary key)
   - email (varchar, unique)
   - username (varchar, unique)
   - password (text, hashed)
   - role (varchar, default 'user')
   - isApproved (boolean, default false)
   - createdAt/updatedAt (timestamps)

2. **sermons**
   - id (serial, primary key)
   - title, description, speaker, series, category
   - videoUrl, thumbnailUrl (S3 URLs)
   - duration, viewCount
   - isPublished (boolean)
   - publishedAt (timestamp)
   - transcodedVersions (JSON string)
   - createdAt/updatedAt (timestamps)

3. **live_streams**
   - id (serial, primary key)
   - title, description
   - streamUrl (RTMP URL)
   - thumbnailUrl
   - scheduledAt, startedAt, endedAt
   - isLive (boolean)
   - viewerCount
   - createdAt/updatedAt (timestamps)

4. **favorites**
   - id (serial, primary key)
   - userId (foreign key to users)
   - sermonId (foreign key to sermons)
   - createdAt (timestamp)

5. **password_reset_tokens**
   - id (serial, primary key)
   - userId (foreign key to users)
   - token (text, unique)
   - expiresAt (timestamp)
   - createdAt (timestamp)

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis server
- AWS S3 account (for video storage)
- Docker and Docker Compose (for containerized deployment)
- SMTP server (for email notifications)

### 1. Environment Setup
Create .env files in both backend and frontend directories:

**backend/.env:**
`nv
NODE_ENV=development
DATABASE_URL=postgresql://postgres:mumue20@postgres:5432/hcf_streaming
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-super-secure-jwt-secret-here
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
PORT=5000
`

**frontend/.env.local:**
`nv
NEXT_PUBLIC_API_URL=http://localhost:5000
API_INTERNAL_URL=http://backend:5000
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
NEXT_PUBLIC_LIVE_STREAM_URL=http://localhost/hls/live/church.m3u8
NEXT_PUBLIC_STREAM_KEY=church
`

### 2. Database Setup
The application uses PostgreSQL with Drizzle ORM. Database tables are created automatically via migrations.

### 3. Database Migration
Run migrations to create tables:
`ash
cd backend
npm run db:push
`

### 4. Install Dependencies
`ash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd frontend && npm install
`

### 5. Create First Admin User
1. Register a user through the website
2. Manually promote to admin in database:
`sql
UPDATE users SET role = 'admin', is_approved = true WHERE email = 'admin@example.com';
`

### 6. Start Development Servers
`ash
# Start backend
cd backend && npm run dev

# Start frontend (in new terminal)
cd frontend && npm run dev

# Or use the convenience script
cd frontend && npm run backend  # Starts backend in background
npm run dev                    # Starts frontend
`

## Production Deployment

### Using Docker Compose
`ash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
`

### Manual PM2 Deployment (Backend)
`ash
cd backend
npm run pm2:start    # Start with clustering
npm run pm2:stop     # Stop all processes
npm run pm2:restart  # Restart processes
npm run pm2:logs     # View logs
`

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Reset password with token
- POST /api/auth/verify - Verify JWT token
- POST /api/v2/auth/register - Register with enhanced security
- POST /api/v2/auth/login - Login with enhanced security

### Admin Management
- GET /api/admin/stats - Get dashboard statistics
- GET /api/admin/users - List all users
- PATCH /api/admin/users/:id/approve - Approve/reject user
- PATCH /api/admin/users/:id/role - Change user role
- POST /api/admin/streams/start - Start live stream
- POST /api/admin/streams/stop - Stop live stream
- GET /api/admin/streams/status - Get stream status
- GET /api/admin/schedule - Get scheduled events
- POST /api/admin/schedule - Schedule new event
- DELETE /api/admin/schedule/:id - Delete scheduled event

### Content Management
- GET /api/archive - Get published sermons
- GET /api/archive/:id - Get specific sermon
- POST /api/archive/upload - Upload new sermon (admin only)
- PATCH /api/archive/:id - Update sermon (admin only)
- DELETE /api/archive/:id - Delete sermon (admin only)

### Facebook Live Integration
- GET /api/facebook-live - List Facebook live streams
- POST /api/facebook-live - Create Facebook live stream

### System Endpoints
- GET /health - Health check endpoint
- GET /metrics - Prometheus metrics endpoint
- GET / - API root endpoint

## Security Features
- **Password hashing** with bcrypt (10 rounds)
- **HTTP-only cookies** for JWT tokens (secure, sameSite: lax)
- **Protected API routes** with JWT verification
- **Role-based authorization** (admin, user roles)
- **Admin approval workflow** - new users cannot access content until approved
- **Required JWT_SECRET** - fails fast if not set, no insecure defaults
- **SQL injection protection** via Drizzle ORM parameterized queries
- **Rate limiting** - API and auth endpoint protection with Redis
- **Security headers** - Helmet.js for comprehensive security headers
- **Input validation** - Zod schemas for request validation
- **CORS protection** - Configured cross-origin policies
- **Compression** - Response compression for better performance
- **Clustering** - PM2 multi-process architecture for production
- **Social login security** - NextAuth with secure token handling

## Video Processing Pipeline
1. **Upload**: Video uploaded to S3 via multer
2. **Validation**: File type and size validation
3. **Processing**: FFmpeg processes video in background
4. **Thumbnail**: Generated at 10% of video duration
5. **Transcoding**: Multiple resolutions (1080p, 720p, 480p)
6. **Storage**: All versions stored in S3
7. **Database**: Metadata saved with processing status
8. **Publishing**: Admin approval required before public access

## Live Streaming Architecture
- **RTMP Server**: Nginx with RTMP module for stream ingestion
- **HLS Conversion**: Real-time conversion to HLS format
- **CDN Distribution**: HLS segments served via HTTP
- **Player**: HLS.js for adaptive bitrate streaming
- **Monitoring**: Stream health and viewer count tracking
- **Controls**: Admin interface for stream management

## Monitoring and Logging
- **Health Checks**: /health endpoint with uptime and metrics
- **Prometheus Metrics**: /metrics endpoint for monitoring
- **Winston Logging**: Structured logging with multiple transports
- **PM2 Monitoring**: Process monitoring and clustering
- **Database Monitoring**: Connection pool and query performance
- **Redis Monitoring**: Cache hit rates and memory usage

## Testing
- **Frontend Tests**: Jest + React Testing Library
- **Backend Tests**: Jest + Supertest
- **Test Coverage**: Component and API route testing
- **CI/CD**: Automated testing in Docker environment

## Development Notes
- **Next.js App Router**: File-based routing with server components
- **TypeScript**: Full type safety across frontend and backend
- **shadcn/ui**: Consistent, accessible component library
- **Tailwind CSS**: Utility-first styling with custom design system
- **Drizzle ORM**: Type-safe database operations
- **Context API**: Client-side state management for auth
- **API Routes**: Next.js API routes proxy to Express backend
- **Environment Variables**: Secure configuration management
- **Docker Development**: Consistent development environment

## Future Enhancements
- Real-time chat integration during live streams
- Advanced video analytics and reporting
- Social media sharing and embedding
- Mobile app development (React Native)
- Advanced search and recommendation system
- Multi-language support
- Advanced admin analytics dashboard
- Automated content moderation
- Integration with external calendar systems
- Advanced video editing tools
- CDN integration for global distribution
- WebRTC for low-latency streaming
- Automated backup and disaster recovery

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request with detailed description

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
For support and questions, please contact the development team or create an issue in the repository.

---

**Last Updated**: November 2024
**Version**: 1.0.0
