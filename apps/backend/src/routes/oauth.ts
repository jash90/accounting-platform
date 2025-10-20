import { Hono } from 'hono';
import { passport, oauthService } from '../services/oauth.service';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const oauthRoutes = new Hono();

// Manual OAuth callback handler (bypasses Passport middleware for Hono compatibility)
async function handleGoogleCallback(code: string) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const tokens = await tokenResponse.json();

  // Fetch user profile
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch user profile');
  }

  const profile = await profileResponse.json();

  // Use oauthService to find or create user
  const oauthProfile = {
    id: profile.id,
    email: profile.email,
    firstName: profile.given_name || '',
    lastName: profile.family_name || '',
    profilePicture: profile.picture,
    provider: 'google' as const,
  };

  return await oauthService.findOrCreateUser(oauthProfile, tokens.access_token, tokens.refresh_token);
}

// Manual GitHub callback handler
async function handleGitHubCallback(code: string) {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      code,
      client_id: process.env.GITHUB_CLIENT_ID || '',
      client_secret: process.env.GITHUB_CLIENT_SECRET || '',
      redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/github/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const tokens = await tokenResponse.json();

  // Fetch user profile
  const profileResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch user profile');
  }

  const profile = await profileResponse.json();

  const names = profile.name?.split(' ') || ['', ''];
  const oauthProfile = {
    id: profile.id.toString(),
    email: profile.email || `${profile.login}@github.local`,
    firstName: names[0] || profile.login || '',
    lastName: names.slice(1).join(' ') || '',
    profilePicture: profile.avatar_url,
    provider: 'github' as const,
  };

  return await oauthService.findOrCreateUser(oauthProfile, tokens.access_token, tokens.refresh_token);
}

// Google OAuth routes
oauthRoutes.get('/google', (c) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.BACKEND_URL || 'http://localhost:3001')}/api/auth/google/callback` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('profile email')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return c.redirect(authUrl);
});

oauthRoutes.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code');

    if (!code) {
      throw new Error('No authorization code provided');
    }

    const user = await handleGoogleCallback(code);
    const token = oauthService.generateJWT(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=google`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return c.redirect(`${frontendUrl}/auth/error?provider=google`);
  }
});

// GitHub OAuth routes
oauthRoutes.get('/github', (c) => {
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.BACKEND_URL || 'http://localhost:3001')}/api/auth/github/callback` +
    `&scope=${encodeURIComponent('user:email')}`;

  return c.redirect(authUrl);
});

oauthRoutes.get('/github/callback', async (c) => {
  try {
    const code = c.req.query('code');

    if (!code) {
      throw new Error('No authorization code provided');
    }

    const user = await handleGitHubCallback(code);
    const token = oauthService.generateJWT(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=github`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return c.redirect(`${frontendUrl}/auth/error?provider=github`);
  }
});

// Logout route (revokes OAuth sessions)
oauthRoutes.post('/logout', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    // Decode token to get user ID
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Revoke all OAuth sessions for this user
    await oauthService.revokeOAuthSession(decoded.userId);

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// Get current user info
oauthRoutes.get('/me', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    // Verify and decode token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Get user from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
        authProvider: users.authProvider,
        isEmailVerified: users.isEmailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// OAuth provider status
oauthRoutes.get('/providers', (c) => {
  return c.json({
    providers: {
      google: {
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        name: 'Google',
        icon: 'google',
      },
      github: {
        enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        name: 'GitHub',
        icon: 'github',
      },
    },
  });
});

export { oauthRoutes };