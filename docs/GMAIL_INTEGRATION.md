# Gmail Automation Service - Integration Guide

This document explains how the Gmail Automation Service integrates with the backend and frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Accounting Platform                          │
│                                                                 │
│  ┌───────────────┐      ┌────────────────┐      ┌────────────┐│
│  │  Frontend     │─────▶│  Backend       │      │  Gmail     ││
│  │  React        │      │  Hono          │      │  Automation││
│  │  Port: 4200   │      │  Port: 3001    │      │  NestJS    ││
│  │               │      │                │      │  Port: 3003││
│  └───────┬───────┘      └────────┬───────┘      └─────┬──────┘│
│          │                       │                     │       │
│          │  JWT Token            │  Validates User     │       │
│          │───────────────────────┼─────────────────────┘       │
│                                  │                             │
│                    ┌─────────────▼──────────────┐             │
│                    │  PostgreSQL Database        │             │
│                    │  (Shared)                   │             │
│                    └─────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Service Communication

### Frontend ↔ Backend (Port 3001)
- **Purpose**: User authentication, main app features
- **Auth**: JWT tokens issued by backend
- **Token Storage**: localStorage['token']

### Frontend ↔ Gmail Service (Port 3003)
- **Purpose**: Gmail automation features
- **Auth**: Same JWT tokens from backend
- **API Base**: `VITE_GMAIL_SERVICE_URL`

### Gmail Service ↔ Backend
- **Database**: Shared PostgreSQL connection
- **Auth**: Validates JWT tokens using same secret
- **User Info**: Extracts userId from JWT payload

## Integration Points

### 1. Shared Database (PostgreSQL)

**Connection String**: `DATABASE_URL` environment variable

**Tables Owned by Gmail Service**:
- `gmail_accounts` - Connected Gmail accounts
- `gmail_rules` - Email processing rules
- `draft_templates` - Email response templates
- `rule_execution_logs` - Execution audit trail

**Tables Shared with Backend**:
- `users` - User accounts (foreign key references)

**Configuration**:
```typescript
// Both services use Drizzle ORM with same connection
// Backend: apps/backend/src/db/index.ts
// Gmail Service: apps/gmail-automation-service/src/app/database/
```

### 2. JWT Authentication

**Flow**:
1. User logs in via Frontend → Backend (port 3001)
2. Backend issues JWT token
3. Frontend stores token in localStorage
4. Frontend sends token to Gmail Service (port 3003)
5. Gmail Service validates token using same JWT_SECRET
6. Gmail Service extracts userId from payload

**Implementation**:

**Backend (Token Issuing)**:
```typescript
// apps/backend/src/routes/auth.ts
const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
```

**Gmail Service (Token Validation)**:
```typescript
// apps/gmail-automation-service/src/app/auth/jwt.strategy.ts
// Validates token using same JWT_SECRET
// Extracts: { userId, email }
```

**Frontend (Token Usage)**:
```typescript
// Include in all requests to Gmail service
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

### 3. CORS Configuration

**Backend CORS** (`apps/backend/src/main.ts:17`):
```typescript
corsOrigins = ['http://localhost:4200', 'http://localhost:5173',
               'http://localhost:3000', 'http://localhost:3001',
               'http://localhost:3003'];
```

**Gmail Service CORS** (`apps/gmail-automation-service/src/main.ts:27`):
```typescript
corsOrigins = ['http://localhost:4200', 'http://localhost:5173',
               'http://localhost:3000'];
```

**Development Mode**: Both services allow all origins (`*`) when `NODE_ENV=development`

## Frontend Integration

### Environment Variables

```env
# apps/frontend/.env
VITE_API_URL=http://localhost:3001/api           # Backend API
VITE_GMAIL_SERVICE_URL=http://localhost:3003/api # Gmail Service API
```

### API Client

**File**: `apps/frontend/src/api/gmail-automation.ts`

**Usage**:
```typescript
import { gmailAutomationAPI } from '../api/gmail-automation';

// Get accounts
const accounts = await gmailAutomationAPI.getAccounts();

// Create rule
const rule = await gmailAutomationAPI.createRule({
  gmailAccountId: 'uuid',
  name: 'Auto-label support emails',
  conditions: [{ type: 'sender_contains', value: 'support@', logic: 'AND' }],
  actions: [{ type: 'add_label', value: 'Support' }],
  priority: 10,
  isActive: true,
});
```

### Pages

| Path | Component | Description |
|------|-----------|-------------|
| `/gmail` | GmailDashboard | Overview with stats |
| `/gmail/accounts` | GmailAccounts | Manage Gmail connections |
| `/gmail/rules` | GmailRules | List and manage rules |
| `/gmail/templates` | GmailTemplates | Draft templates |
| `/gmail/logs` | GmailLogs | Execution history |

### Navigation

**Sidebar** (`apps/frontend/src/components/layout/Sidebar.tsx:38-48`):
- Gmail Automation (parent with collapsible children)
  - Overview
  - Accounts
  - Rules
  - Templates
  - Activity Logs

## Shared Types

**Library**: `libs/shared-types/src/index.ts`

**Exported Types**:
- `GmailAccount` - Gmail account entity
- `GmailRule` - Email processing rule
- `DraftTemplate` - Email template
- `RuleExecutionLog` - Execution log entry
- `ConditionType` - Enum for rule conditions
- `ActionType` - Enum for rule actions
- `CreateRuleRequest`, `UpdateRuleRequest` - DTOs
- `LogFilters`, `LogStats` - Query and analytics types

**Usage**:
```typescript
import { GmailRule, ConditionType, ActionType } from '@accounting-platform/shared-types';
```

## Development Workflow

### Starting All Services

```bash
# Start all services (frontend + backend + gmail)
npm run dev

# Or individually:
npm run dev:frontend      # Port 4200
npm run dev:backend       # Port 3001
npm run dev:gmail         # Port 3003
```

### Service URLs

| Service | URL | Swagger Docs |
|---------|-----|--------------|
| Frontend | http://localhost:4200 | N/A |
| Backend | http://localhost:3001/api | N/A |
| Gmail Service | http://localhost:3003/api | http://localhost:3003/api/docs |

### Testing Integration

**1. Test Backend JWT**:
```bash
# Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Response: { "token": "eyJhbGci..." }
```

**2. Test Gmail Service Auth**:
```bash
# Use token from backend
curl http://localhost:3003/api/auth-test \
  -H "Authorization: Bearer <token-from-backend>"

# Expected: { "status": "authenticated", "user": { "userId": "...", "email": "..." } }
```

**3. Test Frontend Integration**:
1. Login to frontend (http://localhost:4200)
2. Click "Gmail Automation" in sidebar
3. Check browser console for any errors
4. Verify pages load (even if empty)

### Database Migrations

```bash
# Generate migrations for Gmail tables
npm run db:generate

# Apply migrations
npm run db:migrate

# View database
npm run db:studio
```

## Security Considerations

### JWT Token Sharing

**Security**: ✅ Safe
- **Why**: Gmail service validates tokens but doesn't issue them
- **Scope**: Gmail service only accesses user-specific data
- **Isolation**: Users can only access their own Gmail accounts and rules

### Database Access

**Security**: ✅ Safe with Row-Level Security
- **Shared tables**: Only `users` table (read-only)
- **Owned tables**: Gmail service manages its own tables
- **Protection**: All queries filter by `userId` from JWT
- **Recommendation**: Implement PostgreSQL RLS for additional security

### OAuth Tokens

**Security**: ✅ Encrypted at rest
- **Encryption**: AES-256-GCM
- **Key**: `ENCRYPTION_KEY` (32 characters)
- **Storage**: `gmail_accounts.refresh_token_encrypted`
- **Access tokens**: Temporary, refreshed automatically

## Troubleshooting

### Frontend can't connect to Gmail service

**Check**:
1. Gmail service is running: `curl http://localhost:3003/health`
2. CORS configured: `curl -I http://localhost:3003/api/rules -H "Origin: http://localhost:4200"`
3. Environment variable set: `echo $VITE_GMAIL_SERVICE_URL`

### JWT validation fails

**Check**:
1. Same JWT_SECRET in both .env files (backend and gmail-service)
2. Token is being sent: Check browser Network tab
3. Token is valid: Decode at jwt.io

### Database connection errors

**Check**:
1. PostgreSQL running: `psql -U user -d accounting_db`
2. DATABASE_URL correct in gmail-service/.env
3. Migrations applied: `npm run db:migrate`

### CORS errors

**Check**:
1. Port 3003 in backend CORS origins
2. Port 4200 in Gmail service CORS origins
3. credentials: 'include' in fetch calls

## Next Steps

Now that integration is complete, you can:

1. **Implement Gmail OAuth Flow** - Build OAuth2 authentication
2. **Build Rule Engine** - Implement condition evaluation
3. **Add Background Jobs** - Email polling and processing
4. **Create API Endpoints** - Full CRUD for all features
5. **Build Rule Builder UI** - Visual rule creation interface

Refer to `apps/gmail-automation-service/README.md` for the complete implementation roadmap.

## Files Modified

### Backend Integration
- `apps/gmail-automation-service/src/app/database/` (3 files)
- `apps/gmail-automation-service/src/app/auth/` (5 files)
- `apps/gmail-automation-service/src/app/app.module.ts`
- `apps/gmail-automation-service/src/app/app.controller.ts`
- `apps/backend/src/db/gmail-schema.ts`
- `apps/backend/src/db/index.ts`

### Frontend Integration
- `apps/frontend/.env`, `.env.example`, `.env.local`
- `apps/frontend/src/api/gmail-automation.ts`
- `apps/frontend/src/pages/gmail/` (4 pages)
- `apps/frontend/src/components/layout/Sidebar.tsx`
- `apps/frontend/src/app/app.tsx`
- `libs/shared-types/src/index.ts`

### Configuration
- `package.json` (dev scripts)
- `drizzle.config.ts` (schema paths)
- `.env.example` (CORS and Gmail port)
- `apps/backend/src/main.ts` (CORS origins)

---

**Integration Status**: ✅ Complete
**Services Connected**: Frontend ↔ Backend ↔ Gmail Service
**Ready for**: Feature implementation (OAuth, rules, templates, processing)
