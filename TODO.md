# Refactor Plan: Remove Drizzle and PG from Frontend, Centralize DB in Backend

## Frontend Changes
- [x] Remove `drizzle-orm`, `pg`, `@auth/drizzle-adapter`, `drizzle-kit` from frontend/package.json
- [x] Delete frontend/drizzle.config.ts
- [x] Update frontend/lib/auth.ts to remove direct DB calls and use fetch to backend endpoints instead
- [x] Ensure frontend API routes properly forward requests to backend

## Backend Changes
- [x] Update backend/drizzle.config.js to use './schema/schema.js' instead of './schema.js'
- [x] Ensure all backend routes import db from './server/db.js' and schema from './schema/schema.js'
- [x] Update backend routes that don't use DB yet (archive.js, facebook-live.js) if needed

## Migration
- [x] Run `npx drizzle-kit generate` from backend directory
- [x] Run `npx drizzle-kit migrate` from backend directory
