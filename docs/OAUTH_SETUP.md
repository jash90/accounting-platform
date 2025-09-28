# OAuth2 Authentication Setup Guide

## Overview

The Accounting Platform now uses OAuth2 authentication instead of traditional email/password login. This provides:
- Enhanced security (no passwords stored)
- Single Sign-On convenience
- Reduced friction for users
- Social profile integration

## Supported Providers

Currently supports:
- **Google** OAuth 2.0
- **GitHub** OAuth

## Setting Up OAuth Providers

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application" as application type
   - Add authorized JavaScript origins:
     ```
     http://localhost:3001
     http://localhost:5173
     ```
   - Add authorized redirect URIs:
     ```
     http://localhost:3001/api/auth/google/callback
     ```
   - Copy your Client ID and Client Secret

4. **Configure Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### GitHub OAuth Setup

1. **Go to GitHub Settings**
   - Visit [https://github.com/settings/developers](https://github.com/settings/developers)
   - Click "OAuth Apps" → "New OAuth App"

2. **Configure OAuth App**
   - **Application name**: Accounting Platform (or your app name)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`
   - Click "Register application"

3. **Get Credentials**
   - Copy the Client ID
   - Generate a new Client Secret
   - Copy the Client Secret immediately (it won't be shown again)

4. **Configure Environment Variables**
   ```bash
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

## Environment Configuration

Add these variables to your `.env` file:

```bash
# Frontend URL (for OAuth redirects after authentication)
FRONTEND_URL=http://localhost:5173

# Backend URL (for OAuth callbacks)
BACKEND_URL=http://localhost:3001

# JWT Secret (for token signing)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Database Schema Changes

The OAuth implementation adds new fields to the database:

### Users Table
- `authProvider`: Provider used (google, github, local)
- `providerId`: Unique ID from OAuth provider
- `profilePicture`: User's profile picture URL
- `password`: Now optional (null for OAuth users)

### New Tables
- `oauth_sessions`: Stores OAuth access/refresh tokens

## Authentication Flow

1. **User clicks "Continue with Google/GitHub"**
   - Frontend redirects to `/api/auth/{provider}`

2. **Backend redirects to OAuth provider**
   - User authenticates with Google/GitHub
   - Provider redirects back with authorization code

3. **Backend exchanges code for tokens**
   - Receives user profile information
   - Creates or updates user in database
   - Generates JWT token

4. **Frontend receives JWT**
   - Redirected to `/auth/callback?token={jwt}`
   - Stores token in localStorage
   - Fetches user profile
   - Redirects to dashboard

## API Endpoints

### OAuth Endpoints
- `GET /api/auth/providers` - Get enabled OAuth providers
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback (internal)
- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - GitHub OAuth callback (internal)
- `GET /api/auth/me` - Get current user (requires JWT)
- `POST /api/auth/logout` - Logout and revoke OAuth sessions

### Response Format
```json
// GET /api/auth/providers
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
    }
  }
}

// GET /api/auth/me
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://...",
    "authProvider": "google",
    "isEmailVerified": true
  }
}
```

## Frontend Integration

### Check Provider Status
```javascript
const response = await fetch('http://localhost:3001/api/auth/providers');
const data = await response.json();
// data.providers.google.enabled
// data.providers.github.enabled
```

### Initiate OAuth Login
```javascript
// Redirect to OAuth provider
window.location.href = 'http://localhost:3001/api/auth/google';
// or
window.location.href = 'http://localhost:3001/api/auth/github';
```

### Handle OAuth Callback
```javascript
// In your callback component
const params = new URLSearchParams(location.search);
const token = params.get('token');

if (token) {
  localStorage.setItem('auth-token', token);
  // Fetch user info
  const response = await fetch('http://localhost:3001/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  // Store user and redirect
}
```

## Security Considerations

1. **JWT Tokens**
   - Expire after 7 days
   - Include user ID and provider information
   - Should be sent as Bearer token in Authorization header

2. **OAuth Sessions**
   - Access tokens stored encrypted in database
   - Refresh tokens used for long-term access
   - Sessions can be revoked on logout

3. **CORS Configuration**
   - Backend allows specific origins only
   - Credentials enabled for cookie support

4. **Production Considerations**
   - Use HTTPS for all URLs
   - Store secrets in secure vault
   - Implement rate limiting
   - Add CSRF protection
   - Use secure session cookies

## Troubleshooting

### Common Issues

1. **"OAuth provider not configured"**
   - Ensure environment variables are set
   - Restart backend server after adding variables

2. **Redirect URI mismatch**
   - Check callback URLs match exactly in provider settings
   - Include protocol (http/https) and port

3. **CORS errors**
   - Ensure frontend URL is in CORS allowed origins
   - Check credentials are enabled

4. **Token validation failures**
   - Verify JWT_SECRET is consistent
   - Check token expiration
   - Ensure Bearer format in Authorization header

## Migration from Password Auth

The system has been completely migrated to OAuth2. The old password-based authentication has been removed:

- `/api/auth/login` - Removed
- `/api/auth/signup` - Removed
- `/api/auth/reset-password` - Removed (no longer needed)

Users must now authenticate using Google or GitHub OAuth.

## Testing

1. **Without OAuth Providers Configured**
   - Frontend shows "not configured" messages
   - Explains setup requirements

2. **With Providers Configured**
   - Test Google login flow
   - Test GitHub login flow
   - Verify user creation/update
   - Check profile picture display
   - Test logout functionality

## Support

For issues with OAuth setup:
1. Check environment variables are correctly set
2. Verify callback URLs match provider configuration
3. Check browser console for errors
4. Review backend logs for OAuth errors
5. Ensure database migrations have been applied