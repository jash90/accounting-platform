<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

# Accounting Platform - Project Instructions

## Overview

**Purpose:** Full-stack accounting platform for independent practitioners to large accounting firms.

**Current Status:** Early development phase
- Core authentication system: ✅ Functional (Google OAuth, GitHub OAuth planned)
- User management: ✅ Basic implementation
- CRM Module: ✅ Production-ready (Polish accounting platform)
- Accounting features: 📋 Placeholders (Invoices, Expenses, Reports)

**Project Type:** NX Monorepo with React frontend and multiple Hono backends

---

## Project History & Recent Changes

**October 2025 - Major Cleanup & Refactoring:**
- ✅ **Removed Gmail Automation Service**
  - Deleted `apps/gmail-automation-service/` (entire NestJS microservice)
  - Deleted `apps/gmail-automation-service-e2e/` (E2E tests)
  - Removed frontend Gmail pages (5 components: Dashboard, Accounts, Rules, Templates, Logs)
  - Removed Gmail API integration files
  - Dropped 9 database tables via migration `0004_rollback_gmail_automation.sql`
  - Reason: Out of scope for MVP. Future email features will be redesigned as part of core accounting workflows.

- ✅ **Fixed Google OAuth Authentication**
  - Issue: Passport.js + Hono framework incompatibility
  - Solution: Implemented manual OAuth token exchange handlers
  - Result: Google login fully functional

- ✅ **Created Migration Management Tooling**
  - Added `scripts/migrate-and-verify.sh` for robust migration handling
  - Automated verification of applied migrations
  - Color-coded status reporting

- ✅ **Repository Cleanup**
  - Removed build artifacts (`dist/` - 1.5 MB)
  - Cleared NX cache (`.nx/cache/` - 788 KB)
  - Deleted investigation temporary files (~4.3 MB total freed)
  - Updated `.gitignore` to prevent future accumulation

**Historical Note:** If you see references to Gmail automation in older commits or docs, it was intentionally removed in October 2025 to focus on core accounting features.

**October 2025 - CRM Module Integration:**
- ✅ **Integrated CRM Backend into NX Monorepo**
  - Moved standalone `crm-backend/` into `apps/crm-backend/`
  - Created NX configuration (project.json, tsconfig, jest)
  - Unified database schema in `apps/backend/src/db/schema.ts`
  - Added CRM types to `libs/shared-types`
  - Port 3002 for CRM microservice

- ✅ **CRM Features (Production-Ready)**
  - Polish tax ID validation (NIP, REGON, PESEL, KRS)
  - GUS API integration (Polish business registry)
  - VIES integration (EU VAT validation)
  - Client CRUD with risk assessment
  - Timeline events, contacts, documents
  - Soft delete and optimistic locking

---

## Technology Stack

### Frontend
- **React 19.0** with TypeScript
- **Vite 7.0** - Fast build tool and dev server
- **Tailwind CSS 4.1** - Utility-first CSS framework
- **React Router 6** - Client-side routing with protected routes
- **TanStack Query 5** - Server state management and caching
- **Zustand 5.0** - Client state management with persistence
- **Lucide React** - Icon library

### Backend
- **Hono 4.9** - Fast, lightweight web framework (NOT Express!)
- **@hono/node-server** - Node.js adapter for Hono
- **Drizzle ORM 0.44** - Type-safe SQL toolkit
- **PostgreSQL** - Primary database
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing (12 rounds)
- **Nodemailer** - Email sending
- **Passport** - OAuth strategies (with custom implementation)

### Development Tools
- **NX 21.5** - Monorepo orchestration and build system
- **TypeScript 5.9** - Type safety across the stack
- **ESLint** - Code linting
- **Drizzle Kit** - Database migration management

---

## Architecture

### Monorepo Structure

```
accounting-platform/
├── apps/
│   ├── backend/              # Main Hono API server (Auth, Users)
│   │   ├── .env             # ⚠️ Backend-specific config (OVERRIDES root!)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts          # Unified Drizzle schema (Auth + CRM)
│   │   │   │   └── index.ts           # Database connection
│   │   │   ├── routes/
│   │   │   │   ├── oauth.ts           # OAuth authentication routes
│   │   │   │   └── auth.ts            # Standard auth routes (WIP)
│   │   │   ├── services/
│   │   │   │   ├── oauth.service.ts   # OAuth business logic
│   │   │   │   ├── email.service.ts   # Email sending
│   │   │   │   ├── mfa.service.ts     # Multi-factor auth
│   │   │   │   ├── rbac.service.ts    # Role-based access
│   │   │   │   └── audit.service.ts   # Audit logging
│   │   │   └── main.ts                # Hono app entry point
│   │   └── project.json
│   │
│   ├── crm-backend/          # CRM Microservice (Polish Accounting)
│   │   ├── .env             # CRM-specific config (port 3002, GUS API, etc.)
│   │   ├── src/
│   │   │   ├── modules/crm/
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── gus.service.ts      # Polish GUS API integration
│   │   │   │   │   └── vies.service.ts     # EU VAT validation (VIES)
│   │   │   │   ├── services/
│   │   │   │   │   └── client.service.ts   # Core CRM business logic
│   │   │   │   ├── utils/
│   │   │   │   │   ├── nip.ts              # NIP validation (Polish tax ID)
│   │   │   │   │   ├── regon.ts            # REGON validation
│   │   │   │   │   ├── pesel.ts            # PESEL validation
│   │   │   │   │   └── postal-code.ts      # Polish postal codes
│   │   │   │   └── validators/
│   │   │   │       └── client.schema.ts    # Zod validation schemas
│   │   │   ├── routes/
│   │   │   │   └── crm.ts                  # CRM API routes
│   │   │   └── main.ts                     # Hono app entry point
│   │   └── project.json
│   │
│   └── frontend/             # React SPA
│       ├── src/
│       │   ├── app/
│       │   │   └── app.tsx              # Routing configuration
│       │   ├── pages/
│       │   │   ├── Login.tsx            # OAuth + local login
│       │   │   ├── Signup.tsx           # User registration
│       │   │   ├── AuthCallback.tsx     # OAuth callback handler
│       │   │   ├── Dashboard.tsx        # Main dashboard
│       │   │   ├── ForgotPassword.tsx   # Password reset request
│       │   │   └── ResetPassword.tsx    # Password reset confirm
│       │   ├── components/
│       │   │   └── layout/
│       │   │       └── Sidebar.tsx      # Navigation sidebar
│       │   ├── stores/
│       │   │   └── auth.ts              # Zustand auth state
│       │   └── main.tsx                 # React entry point
│       └── project.json
│
├── libs/
│   └── shared-types/         # Shared TypeScript interfaces
│       └── src/index.ts      # User, AuthResponse, CRM types
│
├── drizzle/                  # Unified database migrations
│   ├── 0000_*.sql           # Initial auth schema
│   ├── 0001_*.sql           # Updates
│   ├── XXXX_*_crm.sql       # CRM tables (to be generated)
│   └── meta/                # Drizzle metadata
│
├── docs/                     # Comprehensive documentation
│   ├── AIM_MODULE_COMPREHENSIVE_ANALYSIS.md  # Security analysis
│   ├── AIM_API_SPECIFICATION.yaml            # API specs
│   ├── AIM_DATABASE_SCHEMA.sql               # Schema docs
│   ├── CRM_MODULE_OVERVIEW.md                # CRM features overview
│   ├── CRM_API_DOCUMENTATION.md              # CRM API reference
│   ├── OAUTH_SETUP.md                        # OAuth configuration
│   ├── EMAIL_SETUP.md                        # Email configuration
│   └── CORS_TROUBLESHOOTING.md               # CORS debugging
│
├── .env                      # Root environment (general config)
└── CLAUDE.md                 # This file
```

#### **Section 4: Critical Patterns & Conventions**

**1. Dual Environment Files**
```yaml
⚠️ CRITICAL: Backend has its own .env file!

Root .env:         /accounting-platform/.env
Backend .env:      /accounting-platform/apps/backend/.env

The backend .env OVERRIDES root .env values!

When updating:
- Google OAuth credentials → Update BOTH files
- Database URL → Update BOTH files
- JWT_SECRET → Update BOTH files
```

**2. Hono Framework Patterns**
```typescript
// ✅ CORRECT - Use Hono context API
app.get('/route', (c) => {
  const param = c.req.query('param');
  return c.json({ data: value });
});

// ❌ WRONG - Don't use Express patterns
app.get('/route', (req, res) => {  // Hono doesn't use req/res!
  res.json({ data: value });
});
```

**3. OAuth Implementation**
```yaml
⚠️ CRITICAL: Passport + Hono Incompatibility!

Problem: Passport.authenticate() expects Express req/res objects
Solution: Manual OAuth token exchange

Pattern to use:
1. Manual fetch to OAuth provider token endpoint
2. Manual fetch to OAuth provider user API
3. Manual user creation/update in database
4. Generate JWT with oauthService.generateJWT()

See: apps/backend/src/routes/oauth.ts (handleGoogleCallback, handleGitHubCallback)
```

**4. Drizzle ORM Patterns**
```typescript
// Import from centralized db module
import { db, users, oauthSessions } from '../db';
import { eq, and } from 'drizzle-orm';

// Query pattern
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// Insert pattern
const [newUser] = await db
  .insert(users)
  .values({ email, firstName, lastName })
  .returning();
```

#### **Section 5: Database Management**

**Schema Definition:** `apps/backend/src/db/schema.ts`

**Migration Workflow:**
```bash
# 1. Edit schema.ts
# 2. Generate migration
npx drizzle-kit generate

# 3. Apply migration
npx drizzle-kit push
# OR manually:
psql postgresql://user@localhost:5432/accounting_platform -f drizzle/XXXX.sql

# 4. View database
npx drizzle-kit studio  # Opens GUI at http://localhost:4983
```

**Current Schema:**
- `users` - User accounts (local + OAuth)
- `oauth_sessions` - OAuth access/refresh tokens
- `password_reset_tokens` - Password reset flow
- `email_verification_tokens` - Email verification

#### **Section 6: Authentication System**

**OAuth2 Providers:**
- Google: ✅ Configured and working
- GitHub: ⚙️ Configured but not tested

**OAuth Flow:**
```
1. Frontend: Click "Continue with Google"
   → window.location.href = 'http://localhost:3001/api/auth/google'

2. Backend: Generate OAuth URL and redirect to Google
   → apps/backend/src/routes/oauth.ts:54

3. Google: User authenticates
   → Redirects to: http://localhost:3001/api/auth/google/callback?code=...

4. Backend: Manual token exchange
   → handleGoogleCallback() fetches tokens and user profile
   → Creates/updates user in database
   → Generates JWT token
   → Redirects to: http://localhost:4200/auth/callback?token=JWT&provider=google

5. Frontend: AuthCallback component
   → Extracts token from URL
   → Calls /api/auth/me to fetch user data
   → Stores in Zustand + localStorage
   → Redirects to /dashboard
```

**Required Environment Variables:**
```bash
# In BOTH .env and apps/backend/.env:
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
DATABASE_URL=postgresql://user@localhost:5432/accounting_platform
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:4200
BACKEND_URL=http://localhost:3001
```

#### **Section 7: Development Workflow**

**Starting Development:**
```bash
# Install dependencies
npm install

# Start both servers
npm run dev
# Frontend: http://localhost:4200
# Backend: http://localhost:3001

# Or start separately:
npm run dev:frontend
npm run dev:backend
```

**Building:**
```bash
# Build all apps
npm run build:all

# Build specific app
npx nx build frontend
npx nx build backend

# Clear build cache (if issues)
npx nx reset
```

**Database Operations:**
```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Open database GUI
npm run db:studio
```

#### **Section 8: Common Development Tasks**

**Adding New Database Table:**
1. Edit `apps/backend/src/db/schema.ts`
2. Define table with `pgTable()`
3. Export types with `$inferSelect` and `$inferInsert`
4. Run `npx drizzle-kit generate`
5. Run `npx drizzle-kit push`
6. Update `apps/backend/src/db/index.ts` to export new table

**Adding New API Route:**
1. Create route file in `apps/backend/src/routes/`
2. Use Hono router: `const routes = new Hono()`
3. Register in `apps/backend/src/main.ts`: `app.route('/api/path', routes)`

**Adding New Frontend Page:**
1. Create component in `apps/frontend/src/pages/`
2. Add route in `apps/frontend/src/app/app.tsx`
3. Use `<ProtectedRoute>` or `<PublicRoute>` wrapper
4. Add navigation item to `Sidebar.tsx` (if needed)

**Adding OAuth Provider:**
1. Create OAuth app in provider console
2. Add credentials to both .env files
3. Add manual callback handler in `oauth.ts`
4. Add provider to enabled list

#### **Section 9: Known Issues & Gotchas**

**1. Dual .env File Structure**
```
⚠️ Problem: Backend loads apps/backend/.env which overrides root .env
✅ Solution: Always update BOTH .env files when changing config
📍 Affects: All environment variables
```

**2. Hono + Passport Incompatibility**
```
⚠️ Problem: passport.authenticate() throws "res.setHeader is not a function"
✅ Solution: Use manual OAuth handlers (handleGoogleCallback, handleGitHubCallback)
📍 File: apps/backend/src/routes/oauth.ts
```

**3. Frontend Port Mismatch**
```
⚠️ Problem: Code comments reference port 5173, actual port is 4200
✅ Solution: Always use http://localhost:4200 for frontend
📍 Affects: OAuth callbacks, API URLs, CORS origins
```

**4. JWT Import Pattern**
```
⚠️ Problem: await import('jsonwebtoken') returns module object, not direct exports
✅ Solution: Use static import: import jwt from 'jsonwebtoken'
📍 File: apps/backend/src/routes/oauth.ts
```

**5. NX Build Cache Issues**
```
⚠️ Problem: Changes not reflecting after rebuild
✅ Solution: Clear cache with npx nx reset
📍 Common when: Changing .env, updating dependencies
```

**6. Database Role Mismatch**
```
⚠️ Problem: "role 'user' does not exist" error
✅ Solution: Check DATABASE_URL uses correct PostgreSQL username
📍 Common in: apps/backend/.env (placeholder: postgresql://user:password@...)
```

**7. Migration Script Environment Variables**
```
⚠️ Problem: Script fails with "not a valid identifier" when loading .env with quoted values
✅ Solution: Use migrate-and-verify.sh which handles special characters properly
📍 File: scripts/migrate-and-verify.sh (custom .env parser)
📍 Affected: EMAIL_FROM="Name <email@domain.com>" type values
```

**8. Migration Tracking**
```
ℹ️ Migrations are tracked in __drizzle_migrations table
✅ Best Practice: Use npm run db:migrate-verify instead of manual psql
📍 Table: __drizzle_migrations (id, hash, created_at)
📍 Script automatically creates table if missing
```

---

## Services Documentation

### Backend Services (`apps/backend/src/services/`)

**oauth.service.ts**
- OAuth2 authentication with Google/GitHub
- Manual token exchange (bypasses Passport middleware)
- User creation/update on OAuth login
- JWT generation and validation
- Key method: `findOrCreateUser()` - Public method for OAuth handlers

**email.service.ts**
- Email sending with Nodemailer
- Templates: welcome, password reset, verification
- Gmail SMTP integration
- Configuration: Uses EMAIL_* environment variables

**mfa.service.ts**
- TOTP (Time-based One-Time Password) generation
- QR code generation for authenticator apps
- MFA validation
- Status: Implemented but not integrated in auth flow

**rbac.service.ts**
- Role-Based Access Control
- Permission checking
- Status: Implemented but not active

**audit.service.ts**
- Audit logging for security events
- User activity tracking
- Status: Implemented but not integrated

---

## Frontend Architecture

### State Management

**Zustand Store (`apps/frontend/src/stores/auth.ts`)**
```typescript
// Persistent auth state
useAuthStore: {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login(user, token)    // Set auth state
  logout()              // Clear auth state
}

// Persisted to localStorage as 'auth-storage'
```

### Routing Pattern

**Protected Routes:**
```typescript
<ProtectedRoute>
  <Dashboard />  // Only accessible when authenticated
</ProtectedRoute>
```

**Public Routes:**
```typescript
<PublicRoute>
  <Login />  // Redirects to dashboard if already authenticated
</PublicRoute>
```

**OAuth Callback:**
```typescript
// Special route without guards for OAuth flow
<Route path="/auth/callback" element={<AuthCallback />} />
```

### API Integration

**Base URL:** Hardcoded to `http://localhost:3001/api`
- Login page: `Login.tsx:35`, `Login.tsx:53`, `Login.tsx:64`
- Auth callback: `AuthCallback.tsx:31`

**Pattern:**
```typescript
const response = await fetch('http://localhost:3001/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Database Schema

### Tables

**users**
```sql
- id: uuid (PK)
- email: text (unique)
- password: text (nullable for OAuth users)
- first_name: text
- last_name: text
- profile_picture: text (nullable)
- auth_provider: text ('local' | 'google' | 'github')
- provider_id: text (OAuth provider's user ID)
- is_email_verified: boolean
- created_at: timestamp
- updated_at: timestamp
```

**oauth_sessions**
```sql
- id: uuid (PK)
- user_id: uuid (FK → users.id, cascade delete)
- access_token: text
- refresh_token: text (nullable)
- provider: text ('google' | 'github')
- expires_at: timestamp (nullable)
- created_at: timestamp
- updated_at: timestamp
```

**password_reset_tokens**
```sql
- id: uuid (PK)
- user_id: uuid (FK → users.id, cascade delete)
- token: text (unique)
- expires_at: timestamp
- created_at: timestamp
```

**email_verification_tokens**
```sql
- id: uuid (PK)
- user_id: uuid (FK → users.id, cascade delete)
- token: text (unique)
- expires_at: timestamp
- created_at: timestamp
```

---

## API Endpoints

### Authentication (`/api/auth`)

**OAuth Providers:**
- `GET /api/auth/providers` - List enabled OAuth providers
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Handle Google OAuth callback
- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - Handle GitHub OAuth callback

**User Management:**
- `GET /api/auth/me` - Get current user (requires JWT in Authorization header)
- `POST /api/auth/logout` - Revoke OAuth sessions (requires JWT)

**Standard Auth (routes exist but may not be fully implemented):**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/confirm-reset-password` - Confirm password reset

**Health:**
- `GET /health` - Server health check

---

## Critical Development Guidelines

### 1. Environment Configuration

**⚠️ ALWAYS update BOTH .env files when changing configuration!**

```bash
# Root configuration
/accounting-platform/.env

# Backend-specific (OVERRIDES root!)
/accounting-platform/apps/backend/.env
```

**Common variables to sync:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `BACKEND_URL`

### 2. Hono Framework Patterns

**✅ Use Hono context API:**
```typescript
app.get('/route', (c) => {
  // Query parameters
  const param = c.req.query('param');

  // Headers
  const auth = c.req.header('Authorization');

  // JSON response
  return c.json({ data: value });

  // Redirect
  return c.redirect('https://example.com');

  // Error response
  return c.json({ error: 'message' }, 401);
});
```

**❌ Don't use Express patterns:**
```typescript
// These don't work in Hono!
req.query.param
res.json()
res.redirect()
res.status(401).json()
```

### 3. OAuth Implementation

**⚠️ Do NOT use Passport.authenticate() middleware - it's incompatible with Hono!**

**✅ Use manual OAuth handlers instead:**

```typescript
// Pattern for OAuth callback:
async function handleProviderCallback(code: string) {
  // 1. Exchange code for tokens
  const tokenResponse = await fetch('provider-token-endpoint', {
    method: 'POST',
    body: new URLSearchParams({ code, client_id, client_secret, redirect_uri })
  });
  const tokens = await tokenResponse.json();

  // 2. Fetch user profile
  const profileResponse = await fetch('provider-profile-endpoint', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const profile = await profileResponse.json();

  // 3. Create/update user
  const user = await oauthService.findOrCreateUser(oauthProfile, tokens.access_token, tokens.refresh_token);

  return user;
}

// Then in route handler:
oauthRoutes.get('/provider/callback', async (c) => {
  const code = c.req.query('code');
  const user = await handleProviderCallback(code);
  const token = oauthService.generateJWT(user);
  return c.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&provider=google`);
});
```

### 4. Database Queries with Drizzle

**Import pattern:**
```typescript
import { db, users, oauthSessions } from '../db';
import { eq, and, or } from 'drizzle-orm';
```

**Query examples:**
```typescript
// Select with where
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

// Insert with returning
const [newUser] = await db
  .insert(users)
  .values({ email, firstName, lastName })
  .returning();

// Update
await db
  .update(users)
  .set({ isEmailVerified: true })
  .where(eq(users.id, userId));

// Delete
await db
  .delete(oauthSessions)
  .where(eq(oauthSessions.userId, userId));

// Complex where with multiple conditions
await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.authProvider, 'google'),
      eq(users.isEmailVerified, true)
    )
  );
```

### 5. Frontend State Management

**Zustand Auth Store:**
```typescript
import { useAuthStore } from '../stores/auth';

// In component:
const { user, token, isAuthenticated, login, logout } = useAuthStore();

// Login
login(userData, jwtToken);

// Logout
logout();  // Clears state and localStorage

// Persistence: Automatically saves to localStorage as 'auth-storage'
```

### 6. Frontend Routing

**Adding New Route:**
```typescript
// 1. Import component
import { NewPage } from '../pages/NewPage';

// 2. Add route
<Route
  path="/new-page"
  element={
    <ProtectedRoute>
      <NewPage />
    </ProtectedRoute>
  }
/>

// 3. Add to Sidebar navigation (if needed)
// Edit: apps/frontend/src/components/layout/Sidebar.tsx
const navigationItems = [
  { name: 'New Page', path: '/new-page', icon: IconComponent }
];
```

---

## Development Commands

### NX Commands

```bash
# Serve (dev mode with hot reload)
npx nx serve frontend      # Port 4200
npx nx serve backend       # Port 3001

# Build
npx nx build frontend
npx nx build backend
npx nx build --all

# Test
npx nx test frontend
npx nx test backend

# Lint
npx nx lint frontend
npx nx lint backend

# Clear cache
npx nx reset

# View project graph
npx nx graph
```

### Database Commands

```bash
# Migration Runner with Verification (RECOMMENDED)
npm run db:migrate-verify   # Run pending migrations + verify all applied
# Features:
# - Loads both .env files automatically
# - Validates database connection first
# - Skips already-applied migrations
# - Shows applied vs pending status
# - Color-coded output
# - Verifies all migrations in database
# - Exit code 0 = success, 1 = failure

# Traditional Drizzle Kit Commands
npm run db:generate         # Generate migration from schema changes
npm run db:migrate          # Apply migrations (Drizzle Kit method)
npm run db:studio           # Open Drizzle Studio GUI (port 4983)

# Manual migration execution (if needed)
psql postgresql://user@localhost:5432/accounting_platform -f drizzle/XXXX.sql

# Check migration status manually
psql postgresql://user@localhost:5432/accounting_platform -c "SELECT * FROM __drizzle_migrations ORDER BY created_at;"
```

### Debugging

```bash
# Check backend logs
tail -f /tmp/backend.log

# Check if services are running
lsof -i :3001  # Backend
lsof -i :4200  # Frontend

# Test API endpoint
curl http://localhost:3001/health
curl http://localhost:3001/api/auth/providers

# Database query
psql postgresql://user@localhost:5432/accounting_platform -c "SELECT * FROM users;"
```

### Utility Scripts

**Migration Manager (`scripts/migrate-and-verify.sh`)**
```bash
# Run and verify migrations
npm run db:migrate-verify
# OR directly:
./scripts/migrate-and-verify.sh

# What it does:
# 1. Loads environment from both .env files
# 2. Validates database connection
# 3. Discovers all migration files in drizzle/
# 4. Checks __drizzle_migrations table
# 5. Runs only pending migrations
# 6. Verifies all migrations applied
# 7. Shows detailed status report

# Output example:
# ✅ 0000_abnormal_white_queen.sql (applied)
# ⏳ 0005_new_feature.sql (pending)
#
# 🚀 Running Pending Migrations...
# ✓ 0005_new_feature.sql - Applied successfully
#
# ✅ All migrations completed successfully!
```

**CORS Diagnostic (`scripts/diagnose-cors.sh`)**
```bash
# Diagnose CORS issues
./scripts/diagnose-cors.sh

# Checks:
# - Backend CORS configuration
# - Frontend API endpoint URLs
# - Network connectivity
# - Common CORS misconfigurations
```

---

## AI Assistant Guidelines

When working on this project:

### ✅ Always Do

1. **Check BOTH .env files** when dealing with configuration
2. **Use Hono context API** (`c.req`, `c.json()`, `c.redirect()`)
3. **Use manual OAuth handlers** (not Passport middleware)
4. **Import JWT statically** (`import jwt from 'jsonwebtoken'`)
5. **Use Drizzle ORM patterns** for all database operations
6. **Follow the monorepo structure** (don't break NX workspace)
7. **Maintain type safety** with shared-types library
8. **Check docs/ folder** for feature documentation
9. **Update migrations** when changing database schema
10. **Test OAuth flow** after authentication changes

### ❌ Never Do

1. **Don't use Passport.authenticate() middleware** (Hono incompatible)
2. **Don't use Express patterns** (`req`, `res` objects)
3. **Don't hardcode API URLs** in multiple places (centralize configuration)
4. **Don't commit .env files** with real credentials
5. **Don't modify only one .env file** (sync both!)
6. **Don't bypass Drizzle** for raw SQL (use query builder)
7. **Don't create migrations manually** (use drizzle-kit generate)
8. **Don't skip build verification** after major changes

### 🔍 Investigation Checklist

When debugging issues:

1. **Check both .env files** for configuration mismatches
2. **Clear NX cache** if builds are stale (`npx nx reset`)
3. **Verify services are running** (`lsof -i :3001`, `lsof -i :4200`)
4. **Check backend logs** for errors
5. **Verify database connection** (`psql` command)
6. **Inspect network requests** in browser DevTools
7. **Check CORS configuration** if API calls fail
8. **Verify JWT_SECRET matches** in both .env files

### 📚 Documentation References

**Quick Reference (Most Used):**
- **OAuth Setup:** `docs/OAUTH_SETUP.md`
- **Email Configuration:** `docs/EMAIL_SETUP.md`
- **CORS Issues:** `docs/CORS_TROUBLESHOOTING.md`
- **Security Analysis:** `docs/AIM_MODULE_COMPREHENSIVE_ANALYSIS.md`
- **API Specification:** `docs/AIM_API_SPECIFICATION.yaml`
- **Database Schema:** `docs/AIM_DATABASE_SCHEMA.sql`

**Complete Documentation Catalog (26 files):**

**Core System Documentation:**
- `AIM_MODULE_COMPREHENSIVE_ANALYSIS.md` - Comprehensive security analysis, identifies critical gaps
- `AIM_API_SPECIFICATION.yaml` - Complete API endpoint specifications
- `AIM_DATABASE_SCHEMA.sql` - Full database schema with constraints
- `AIM_IMPLEMENTATION_ROADMAP.md` - Security feature implementation roadmap
- `AIM_TESTING_STRATEGY.md` - Test coverage and quality assurance plan

**Setup & Configuration Guides:**
- `OAUTH_SETUP.md` - OAuth provider setup (Google, GitHub)
- `EMAIL_SETUP.md` - Email service configuration (SMTP, providers)
- `CORS_TROUBLESHOOTING.md` - CORS debugging and resolution
- `NAVIGATION.md` - UI navigation patterns and structure

**Removed Features (Historical):**
- `GMAIL_INTEGRATION.md` - Gmail automation integration (removed Oct 2025)

**Future Module Specifications:**
- `accounting-engine-spec.md` - Core accounting functionality specification
- `banking-integration-layer-spec.md` - Bank integration and transaction sync
- `client-portal-spec.md` - Client-facing portal design
- `crm-module-spec.md` - CRM functionality for accounting firms
- `document-intelligence-spec.md` - AI-powered document processing
- `hr-payroll-module-spec.md` - HR and payroll management
- `monitoring-analytics-spec.md` - System monitoring and analytics
- `tax-compliance-module-spec.md` - Tax compliance and filing
- `workflow-automation-engine-spec.md` - Workflow automation system

**Planning & Roadmap:**
- `development-roadmap.md` - Product development timeline and milestones

**Brand & Design:**
- `flowbooks-brand-identity-md.md` - Brand guidelines and design system
- `ui ux designer.md` - UX/UI design specifications

**Business Documentation (Polish):**
- `Kompleksowa Analiza Innowacyjności Aplikacji CRM dla Biur Rachunkowych.md`
- `Kompleksowe modele biznesowe aplikacji CRM dla biur rachunkowych w Polsce Claude.md`
- `crm-biuro-rachunkowe-kompleksowa-dokumentacja(Zakres).md`
- `Analiza innowacyjnośc i aplikacji CRM.md`
- `Comprehensive Technical Architecture & Modularization Plan for Accounting CRM Platform.md`

**Note:** The docs/ folder contains both technical specifications for implementation and business planning documents for the accounting CRM vision.

---

## Current Feature Status

### ✅ Implemented & Working
- Google OAuth authentication
- User registration (OAuth-based)
- JWT token generation
- Protected routes in frontend
- Basic dashboard
- User profile display
- Persistent sessions (Zustand + localStorage)

### ⚙️ Implemented But Not Fully Integrated
- GitHub OAuth (configured but not tested)
- Email service (SMTP configured, needs app password)
- MFA service (code exists but not in auth flow)
- RBAC service (code exists but not enforced)
- Audit service (code exists but not logging)
- Password-based auth (routes exist but may be incomplete)

### 📋 Planned (Placeholders in UI)
- Invoices management
- Expenses tracking
- Client management
- Financial reports
- Settings page

---

## Quick Reference

### Port Map
```
3001 - Backend API (Hono) - Auth & Users
3002 - CRM Backend API (Hono) - Polish CRM
4200 - Frontend (Vite dev server)
5432 - PostgreSQL database (unified)
6379 - Redis (optional, for CRM caching)
```

### Key Files
```
apps/backend/.env                    # Backend config (PRIMARY for backend)
apps/backend/src/main.ts             # Backend entry point
apps/backend/src/db/schema.ts        # Unified database schema (Auth + CRM)
apps/backend/src/db/index.ts         # Database connection & exports
apps/backend/src/routes/oauth.ts     # OAuth authentication
apps/backend/src/services/           # Auth business logic
apps/crm-backend/.env                # CRM config (port 3002, GUS API, VIES)
apps/crm-backend/src/main.ts         # CRM backend entry point
apps/crm-backend/src/routes/crm.ts   # CRM API routes
apps/crm-backend/src/modules/crm/    # CRM business logic
apps/frontend/src/app/app.tsx        # Frontend routing
apps/frontend/src/stores/auth.ts     # Auth state management
apps/frontend/src/pages/Login.tsx    # Login UI with OAuth
libs/shared-types/src/index.ts       # Shared TypeScript types (Auth + CRM)
docs/CRM_MODULE_OVERVIEW.md          # CRM features documentation
docs/CRM_API_DOCUMENTATION.md        # CRM API reference
drizzle/                             # Database migrations
scripts/migrate-and-verify.sh        # Migration runner & verifier
scripts/diagnose-cors.sh             # CORS debugging tool
.env                                 # Root config (fallback)
CLAUDE.md                            # This file - project guide for AI
```

### Common Issues Resolution Matrix

| Issue | Symptom | Solution |
|-------|---------|----------|
| OAuth 400 error | "invalid_client" from Google | Update GOOGLE_CLIENT_ID in apps/backend/.env |
| Database connection error | "role 'user' does not exist" | Fix DATABASE_URL in apps/backend/.env |
| JWT verification error | "jwt.verify is not a function" | Use static import: import jwt from 'jsonwebtoken' |
| Passport error | "res.setHeader is not a function" | Use manual OAuth handlers instead |
| Route not found | React Router "No routes matched" | Add route to apps/frontend/src/app/app.tsx |
| Build not updating | Changes not reflecting | Run: npx nx reset |
| CORS error | API calls blocked | Check CORS_ORIGINS in .env |
| Migration fails | "not a valid identifier" error | Use npm run db:migrate-verify (handles special chars) |
| Migrations not applying | Changes don't reflect in DB | Check __drizzle_migrations table, clear NX cache |

---

## Security Notes

### Current Security Implementation

✅ **Working:**
- OAuth2 with Google (secure, industry standard)
- JWT tokens (7-day expiration)
- Password hashing with bcryptjs (12 rounds)
- HTTPS redirect URIs for OAuth
- CORS protection
- Cascade deletes on user removal

⚠️ **Gaps (see AIM_MODULE_COMPREHENSIVE_ANALYSIS.md for details):**
- No MFA enforcement
- No RBAC implementation
- No rate limiting (vulnerable to brute force)
- No session management (can't revoke tokens)
- No audit logging
- No device tracking
- bcryptjs vs Argon2id (recommended upgrade)

### OAuth Credentials Security

⚠️ **IMPORTANT:** Never commit real OAuth credentials to git

```bash
# Ensure .gitignore includes:
.env
.env.*
!.env.example
apps/backend/.env
```

---

## Next Steps for AI Assistants

When asked to add features or fix bugs:

1. **Read this file first** to understand project context
2. **Check docs/ folder** for relevant documentation
3. **Verify both .env files** are synchronized
4. **Use Hono patterns** (not Express)
5. **Follow Drizzle ORM** for database operations
6. **Test OAuth flow** if touching authentication
7. **Update migrations** if changing schema
8. **Verify builds** before marking complete

---

**Last Updated:** October 2025
**Maintained by:** AI assistants working on this project
