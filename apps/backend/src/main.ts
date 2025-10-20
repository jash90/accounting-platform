import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { oauthRoutes } from './routes/oauth';
import { db } from './db';
import { passport } from './services/oauth.service';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:4200', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Initialize Passport (required for OAuth)
passport.initialize();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.route('/api/auth', oauthRoutes);

// CRM Routes
import crmRoutes from './routes/crm';
app.route('/api/crm', crmRoutes);

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
