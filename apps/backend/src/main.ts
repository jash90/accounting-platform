import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { oauthRoutes } from './routes/oauth';
import { authRoutes } from './routes/auth.enhanced';
import { db } from './db';
import { passport } from './services/oauth.service';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:5173,http://localhost:3000').split(','),
    credentials: true,
  })
);

// Initialize Passport (required for OAuth)
passport.initialize();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication Routes
app.route('/api/auth', oauthRoutes); // OAuth (Google, GitHub, Microsoft)
app.route('/api/auth', authRoutes); // Email/Password authentication

const port = process.env.PORT || 3001;

console.log(`🚀 Starting backend server on port ${port}...`);

// For Node.js with @hono/node-server
import { serve } from '@hono/node-server';

serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`✅ Backend server is running at http://localhost:${port}`);

export default app;
