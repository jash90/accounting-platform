import { Hono } from 'hono';
import { passport, oauthService } from '../services/oauth.service';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';

const oauthRoutes = new Hono();

// Helper to handle Passport authentication with Hono
const passportAuthenticate = (strategy: string, options?: any) => {
  return (c: any) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(strategy, options, (err: any, user: any, info: any) => {
        if (err) {
          return reject(err);
        }
        if (!user) {
          return c.json({ error: info?.message || 'Authentication failed' }, 401);
        }
        resolve(user);
      })(c.req.raw, c.res);
    });
  };
};

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
    const user: any = await passportAuthenticate('google')(c);
    const token = oauthService.generateJWT(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=google`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
    const user: any = await passportAuthenticate('github')(c);
    const token = oauthService.generateJWT(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=github`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
    const jwt = await import('jsonwebtoken');
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
    const jwt = await import('jsonwebtoken');
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