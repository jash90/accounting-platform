# Authentication API Documentation

## Overview

This document describes the comprehensive authentication API for the Accounting Platform. The API supports multiple authentication methods including email/password, Google OAuth, GitHub OAuth, and Microsoft OAuth.

## Base URL

```
http://localhost:3001/api/auth
```

## Authentication Methods

### 1. Email/Password Authentication
### 2. Google OAuth 2.0
### 3. GitHub OAuth 2.0
### 4. Microsoft OAuth 2.0

---

## Email/Password Endpoints

### Sign Up

Create a new user account with email and password.

**Endpoint:** `POST /signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (201 Created):**
```json
{
  "message": "Account created successfully. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isEmailVerified": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Error Responses:**
- `400 Bad Request` - User already exists or validation failed
- `500 Internal Server Error` - Server error

---

### Login

Authenticate with email and password.

**Endpoint:** `POST /login`

**Rate Limiting:** 5 attempts per 15 minutes per email/IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "rememberMe": true
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": null,
    "isEmailVerified": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "rememberMeToken": "x1y2z3..." // Only if rememberMe is true
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `423 Locked` - Account temporarily locked due to failed attempts
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Account Lockout:**
- After 5 failed attempts, account is locked for 30 minutes
- Lockout applies to both email and IP address

---

### Refresh Access Token

Get a new access token using a refresh token.

**Endpoint:** `POST /refresh`

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new-refresh-token..."
}
```

**Notes:**
- Old refresh token is automatically revoked
- New refresh token is issued (rotation strategy)

**Error Responses:**
- `401 Unauthorized` - Invalid or expired refresh token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### Request Password Reset

Request a password reset link via email.

**Endpoint:** `POST /reset-password`

**Rate Limiting:** 3 attempts per 60 minutes per email/IP

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account with that email exists, we sent a password reset link."
}
```

**Notes:**
- Always returns success to prevent email enumeration
- Reset token expires in 1 hour
- Email contains link to frontend reset page with token

**Error Responses:**
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### Confirm Password Reset

Reset password using the token from email.

**Endpoint:** `POST /confirm-reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (200 OK):**
```json
{
  "message": "Password reset successfully. Please login with your new password."
}
```

**Security Notes:**
- All existing sessions and refresh tokens are revoked
- Failed login attempts counter is reset
- Account lockout is removed

**Error Responses:**
- `400 Bad Request` - Invalid or expired token, or validation failed
- `500 Internal Server Error` - Server error

---

### Verify Email

Verify email address using token from email.

**Endpoint:** `POST /verify-email`

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token
- `500 Internal Server Error` - Server error

---

### Resend Verification Email

Request a new email verification link.

**Endpoint:** `POST /resend-verification`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "message": "Verification email sent"
}
```

**Error Responses:**
- `400 Bad Request` - Email already verified
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### Get Current User

Get the currently authenticated user's information.

**Endpoint:** `GET /me`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": null,
    "isEmailVerified": true,
    "authProvider": "local",
    "createdAt": "2025-10-21T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### Logout

Revoke refresh tokens and end session.

**Endpoint:** `POST /logout`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body (Optional):**
```json
{
  "refreshToken": "specific-token-to-revoke"
}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Notes:**
- If `refreshToken` is provided, only that token is revoked
- If no `refreshToken` is provided, all refresh tokens for the user are revoked

**Error Responses:**
- `401 Unauthorized` - Invalid or missing access token
- `500 Internal Server Error` - Server error

---

### Get User Sessions

Get all active sessions for the current user.

**Endpoint:** `GET /sessions`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "createdAt": "2025-10-21T00:00:00.000Z",
      "lastActivityAt": "2025-10-21T01:00:00.000Z",
      "expiresAt": "2025-10-22T00:00:00.000Z",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1"
    }
  ],
  "refreshTokens": [
    {
      "id": "uuid",
      "createdAt": "2025-10-21T00:00:00.000Z",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing access token
- `500 Internal Server Error` - Server error

---

## OAuth 2.0 Endpoints

### Get Available OAuth Providers

Get list of enabled OAuth providers.

**Endpoint:** `GET /providers`

**Response (200 OK):**
```json
{
  "providers": {
    "google": {
      "enabled": true,
      "name": "Google",
      "icon": "google"
    },
    "github": {
      "enabled": true,
      "name": "GitHub",
      "icon": "github"
    },
    "microsoft": {
      "enabled": true,
      "name": "Microsoft",
      "icon": "microsoft"
    }
  }
}
```

---

### Google OAuth

**Initiate OAuth Flow:**
```
GET /google
```

Redirects to Google's OAuth consent screen.

**Callback:**
```
GET /google/callback?code={authCode}
```

Redirects to frontend with token:
```
{FRONTEND_URL}/auth/callback?token={jwt}&provider=google
```

---

### GitHub OAuth

**Initiate OAuth Flow:**
```
GET /github
```

Redirects to GitHub's OAuth authorization page.

**Callback:**
```
GET /github/callback?code={authCode}
```

Redirects to frontend with token:
```
{FRONTEND_URL}/auth/callback?token={jwt}&provider=github
```

---

### Microsoft OAuth

**Initiate OAuth Flow:**
```
GET /microsoft
```

Redirects to Microsoft's OAuth consent screen.

**Callback:**
```
GET /microsoft/callback?code={authCode}
```

Redirects to frontend with token:
```
{FRONTEND_URL}/auth/callback?token={jwt}&provider=microsoft
```

---

### OAuth Logout

Revoke OAuth sessions.

**Endpoint:** `POST /logout`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Token Types and Lifetimes

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token (JWT) | 15 minutes | Memory/localStorage | API authentication |
| Refresh Token | 7 days | localStorage/httpOnly cookie | Renew access tokens |
| Remember Me Token | 30 days | localStorage | Long-term sessions |
| Password Reset Token | 1 hour | Database | Password reset |
| Email Verification Token | 24 hours | Database | Email verification |

---

## Security Features

### 1. Rate Limiting

**Login Endpoint:**
- 5 attempts per 15 minutes
- Lockout: 30 minutes
- Applies to both email and IP address

**Password Reset Endpoint:**
- 3 attempts per 60 minutes
- Lockout: 60 minutes

**Headers on Rate Limited Responses:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2025-10-21T01:00:00.000Z
Retry-After: 1800
```

### 2. Account Lockout

- Triggered after 5 failed login attempts
- Duration: 30 minutes
- Counters reset on successful login
- Cleared when password is reset

### 3. Token Security

**Access Tokens:**
- Short-lived (15 minutes)
- Stateless JWT
- Cannot be revoked

**Refresh Tokens:**
- Stored in database
- Can be revoked
- Rotation on use (old token invalidated)
- Tracked with user agent and IP

### 4. Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Hashed with bcrypt (12 rounds)

### 5. Email Verification

- Required for full account access
- Token expires in 24 hours
- Can be resent
- Only one active token per user

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error title",
  "message": "Detailed error message",
  "attemptsRemaining": 3  // For rate-limited endpoints
}
```

**Common HTTP Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error or invalid input
- `401 Unauthorized` - Authentication failed or invalid token
- `404 Not Found` - Resource not found
- `423 Locked` - Account locked
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Client Implementation Guide

### 1. Login Flow

```typescript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, rememberMe: true })
});

const { accessToken, refreshToken, rememberMeToken, user } = await loginResponse.json();

// 2. Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
if (rememberMeToken) {
  localStorage.setItem('rememberMeToken', rememberMeToken);
}

// 3. Make authenticated requests
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### 2. Token Refresh Flow

```typescript
// Detect 401 and refresh token
async function fetchWithAuth(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });

  if (response.status === 401) {
    // Access token expired, refresh it
    const refreshToken = localStorage.getItem('refreshToken');
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (refreshResponse.ok) {
      const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}
```

### 3. OAuth Flow

```typescript
// 1. Redirect to OAuth provider
window.location.href = 'http://localhost:3001/api/auth/google';

// 2. Handle callback (in /auth/callback route)
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const provider = params.get('provider');

// 3. Fetch user info
const response = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { user } = await response.json();

// 4. Store token and redirect
localStorage.setItem('accessToken', token);
navigate('/dashboard');
```

---

## Environment Variables

Required environment variables for authentication:

```bash
# JWT
JWT_SECRET=your-secret-key

# URLs
FRONTEND_URL=http://localhost:4200
BACKEND_URL=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common

# Email (for verification and password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Accounting Platform <noreply@accounting.local>"
```

---

## Testing

### Manual Testing with cURL

**Sign Up:**
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "rememberMe": true
  }'
```

**Get Current User:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Migration from Old System

If you're migrating from the old OAuth-only system:

1. **Database Migration:**
   - Run migration `0005_comprehensive_auth_enhancement.sql`
   - This adds new tables and columns for enhanced security

2. **Code Updates:**
   - Update `main.ts` to import and register `authRoutes`
   - Update frontend to use `LoginEnhanced` component
   - Update token storage to handle refresh tokens

3. **Environment Variables:**
   - Add `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
   - Configure email service variables

4. **Frontend Routes:**
   - Add `/verify-email` route for email verification
   - Update `/login` to use new `LoginEnhanced` component

---

## Support

For issues or questions, please refer to:
- GitHub Issues: [Repository Link]
- Documentation: `/docs` directory
- API Health Check: `GET /health`

---

**Last Updated:** October 2025
**Version:** 2.0.0
