# HCF Live Stream System

## Overview
The HCF Live Stream System is a modern web platform designed to deliver secure, high-quality live streaming and on-demand multimedia content to registered users. Built with Next.js 14, React, TypeScript, and PostgreSQL.

## Tech Stack
- **Frontend**: Next.js 14 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcrypt password hashing
- **State Management**: Zustand
- **Validation**: Zod

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

### 1. Database Setup
The application requires a PostgreSQL database. Set the `DATABASE_URL` environment variable.

### 2. Environment Variables
Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (automatically provided by Replit)
- `JWT_SECRET` - Secret key for JWT token generation (REQUIRED - no default for security)

### 3. Database Migration
Run the database migration to create tables:
```bash
npm run db:push
```

### 4. Create First Admin User
After the app is running:
1. Register a user through the website (they will be pending approval)
2. Manually approve and promote to admin in the database:
```sql
UPDATE users SET role = 'admin', is_approved = true WHERE email = 'your-email@example.com';
```
3. Now you can login with that account as admin

### 5. Start Development Server
```bash
npm run dev
```

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

### Sermons (Admin)
- `GET /api/sermons` - List all sermons
- `POST /api/sermons` - Create new sermon

### Live Streams (Admin)
- `GET /api/streams` - List all streams
- `POST /api/streams` - Create new stream

## Security Features
- **Password hashing** with bcrypt (10 rounds)
- **HTTP-only cookies** for JWT tokens (secure, sameSite: lax)
- **Protected API routes** with JWT verification
- **Role-based authorization** (admin, user roles)
- **Admin approval workflow** - new users cannot access content until approved
- **Required JWT_SECRET** - fails fast if not set, no insecure defaults
- **SQL injection protection** via Drizzle ORM parameterized queries
- **Approval gating** - unapproved users blocked at login and API level

## Future Enhancements
- Social media sharing integration
- Email notification system
- Advanced search and filtering
- Content categorization
- Video player integration
- Analytics and reporting
- Mobile responsive improvements

## Development Notes
- The application uses Next.js App Router for routing
- All pages use server-side rendering where possible
- Client components are marked with 'use client' directive
- Database migrations are handled via Drizzle Kit

## Last Updated
November 3, 2025
