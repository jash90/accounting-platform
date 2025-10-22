import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import crmRoutes from './routes/crm';

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

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'CRM Backend',
    timestamp: new Date().toISOString(),
  });
});

// CRM Routes
app.route('/api/crm', crmRoutes);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'Polish Accounting CRM Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/crm',
      docs: '/api/crm/health',
    },
  });
});

const port = process.env.PORT || 3002;

console.log(`🚀 Starting CRM Backend server on port ${port}...`);

// For Node.js with @hono/node-server
import { serve } from '@hono/node-server';

serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`✅ CRM Backend is running at http://localhost:${port}`);
console.log(`📚 API Documentation: http://localhost:${port}/api/crm/health`);

export default app;
