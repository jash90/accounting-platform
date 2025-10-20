# CORS Troubleshooting Guide

Complete guide for diagnosing and fixing CORS issues in the Accounting Platform.

## Quick Diagnostic

Run the automated diagnostic tool:
```bash
./scripts/diagnose-cors.sh
```

## Common CORS Errors

### 1. "Access to fetch blocked by CORS policy"

**Symptoms**:
- Red requests in Network tab
- Console error: `Access to fetch at 'http://localhost:3003/...' from origin 'http://localhost:4200' has been blocked by CORS policy`

**Causes**:
- Service not running
- Origin not in allowed list
- Missing CORS headers

**Fix**:
```bash
# 1. Check all services running
npm run dev

# 2. Verify origin in CORS_ORIGINS
cat apps/backend/.env | grep CORS_ORIGINS
cat apps/gmail-automation-service/.env | grep CORS_ORIGINS

# 3. Test CORS headers
curl -I -H "Origin: http://localhost:4200" http://localhost:3001/cors-test
curl -I -H "Origin: http://localhost:4200" http://localhost:3003/api/health
```

### 2. "Credentials mode requires server to include specific origin"

**Symptoms**:
- CORS error mentioning "credentials"
- Requests fail even though service responds

**Cause**: Using `credentials: 'include'` with wildcard origin `*`

**Fix**: Ensure services use specific origins (already configured):
```typescript
// ✅ CORRECT (current config)
app.enableCors({
  origin: ['http://localhost:4200'],  // specific origin
  credentials: true
});

// ❌ WRONG
app.enableCors({
  origin: '*',  // wildcard not allowed with credentials
  credentials: true
});
```

### 3. "No 'Access-Control-Allow-Origin' header present"

**Symptoms**:
- Service responds but browser blocks
- Missing header in Response Headers

**Cause**: CORS not configured on server

**Fix**: Already configured in:
- `apps/backend/src/main.ts:22-32`
- `apps/gmail-automation-service/src/main.ts:35-42`

### 4. OPTIONS Preflight Request Fails

**Symptoms**:
- OPTIONS request shows status 404 or 405
- Actual request never sent

**Cause**: Server doesn't handle OPTIONS method

**Fix**: Both services configured to handle OPTIONS:
```typescript
allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
```

## Chrome DevTools Debugging

### Step 1: Open Network Tab
1. Open Chrome DevTools (F12)
2. Click "Network" tab
3. Enable "Preserve log"
4. Refresh page

### Step 2: Identify CORS Failures
Look for requests with:
- **Status**: `(failed)` or `cors`
- **Type**: `xhr` or `fetch`
- **Red color**: Indicates failure

### Step 3: Inspect Request/Response

Click failed request → Headers tab:

**Request Headers** (check these):
```
Origin: http://localhost:4200
```

**Response Headers** (should include):
```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, ...
```

### Step 4: Check Console Errors

Console tab will show specific CORS error:
```
Access to fetch at 'http://localhost:3003/api/gmail/accounts'
from origin 'http://localhost:4200' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Environment Configuration

### Required Files

All services need `.env` files:

```bash
# Create from examples
cp apps/backend/.env.example apps/backend/.env
cp apps/gmail-automation-service/.env.example apps/gmail-automation-service/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

### Critical Settings

**Backend** (`apps/backend/.env`):
```env
CORS_ORIGINS=http://localhost:4200,http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3003
JWT_SECRET=your-secret-key-here
```

**Gmail Service** (`apps/gmail-automation-service/.env`):
```env
CORS_ORIGINS=http://localhost:4200,http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3003
JWT_SECRET=<SAME-AS-BACKEND>
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
ENCRYPTION_KEY=your32characterencryptionkey12
```

**Frontend** (`apps/frontend/.env.local`):
```env
VITE_API_URL=http://localhost:3001/api
VITE_GMAIL_SERVICE_URL=http://localhost:3003/api
```

## Testing CORS Configuration

### Test 1: Service Health
```bash
# Should return 200
curl -I http://localhost:3001/health
curl -I http://localhost:3003/api/health
```

### Test 2: CORS Headers
```bash
# Should include Access-Control-Allow-Origin
curl -I -H "Origin: http://localhost:4200" http://localhost:3001/cors-test
curl -I -H "Origin: http://localhost:4200" http://localhost:3003/api/health
```

### Test 3: Authentication Flow
```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4200" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Use token (replace <TOKEN>)
curl -H "Authorization: Bearer <TOKEN>" \
  -H "Origin: http://localhost:4200" \
  http://localhost:3003/api/gmail/accounts
```

### Test 4: Browser Test
1. Open http://localhost:4200
2. Login
3. Navigate to Gmail Automation → Accounts
4. Check Network tab for successful requests

## Common Mistakes

### ❌ Incorrect Origin Format
```env
# Wrong - missing protocol
CORS_ORIGINS=localhost:4200

# Wrong - trailing slash
CORS_ORIGINS=http://localhost:4200/

# Correct
CORS_ORIGINS=http://localhost:4200
```

### ❌ Port Mismatch
```typescript
// Frontend config
VITE_GMAIL_SERVICE_URL=http://localhost:3003/api

// Gmail service
const port = 3004;  // ❌ Wrong port!
```

### ❌ Different JWT Secrets
```env
# Backend
JWT_SECRET=secret1

# Gmail Service
JWT_SECRET=secret2  # ❌ Must match backend!
```

### ❌ Service Not Running
```bash
# Check if all services running
lsof -i :4200  # Frontend
lsof -i :3001  # Backend
lsof -i :3003  # Gmail Service
```

## Advanced Debugging

### Enable Verbose CORS Logging

**Backend** (Hono):
```typescript
app.use('*', logger());  // Already enabled
```

**Gmail Service** (NestJS):
```typescript
// In main.ts bootstrap()
const app = await NestFactory.create(AppModule, {
  logger: ['log', 'error', 'warn', 'debug', 'verbose'],
});
```

### Network Trace

Capture full request/response:
```bash
# Using curl with verbose output
curl -v -H "Origin: http://localhost:4200" \
  http://localhost:3003/api/gmail/accounts

# Look for:
# > Origin: http://localhost:4200
# < Access-Control-Allow-Origin: http://localhost:4200
```

### Browser Network Export

1. Chrome DevTools → Network tab
2. Right-click → "Save all as HAR with content"
3. Analyze HAR file for CORS headers

## Still Having Issues?

### Check Service Logs

**Terminal output** should show:
```
🚀 Backend server is running at http://localhost:3001
🚀 Gmail Automation Service is running on: http://localhost:3003/api
```

### Verify Configuration

Run full diagnostic:
```bash
./scripts/diagnose-cors.sh
```

### Check for Port Conflicts

```bash
# Kill conflicting processes
lsof -ti:3001 | xargs kill -9
lsof -ti:3003 | xargs kill -9

# Restart services
npm run dev
```

### Review CORS Configuration

**Backend**: `apps/backend/src/main.ts:14-32`
**Gmail Service**: `apps/gmail-automation-service/src/main.ts:26-42`
**Frontend API**: `apps/frontend/src/api/gmail-automation.ts:31-45`

## References

- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Chrome CORS Errors](https://developer.chrome.com/docs/extensions/mv3/xhr/#handling-cors)
- [NestJS CORS](https://docs.nestjs.com/security/cors)
- [Hono CORS Middleware](https://hono.dev/middleware/builtin/cors)
