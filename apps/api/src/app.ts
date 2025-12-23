// ============================================
// FOIA Stream - Main Application Entry
// ============================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './config/env';
import { agencyRoutes, authRoutes, requestRoutes, templateRoutes } from './routes';

// Create Hono app
const app = new Hono();

// ============================================
// Global Middleware
// ============================================

// Security headers
app.use('*', secureHeaders());

// CORS
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  }),
);

// Request logging
app.use('*', logger());

// Pretty JSON responses in development
if (env.NODE_ENV === 'development') {
  app.use('*', prettyJSON());
}

// ============================================
// Health Check
// ============================================

app.get('/', (c) => {
  return c.json({
    name: 'FOIA Stream API',
    version: '1.0.0',
    description: 'Transparency and Audit Application for Public Records Requests',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API Routes
// ============================================

// Mount routes under /api/v1
const api = new Hono();

api.route('/auth', authRoutes);
api.route('/requests', requestRoutes);
api.route('/agencies', agencyRoutes);
api.route('/templates', templateRoutes);

app.route('/api/v1', api);

// ============================================
// Error Handling
// ============================================

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not Found',
      message: `The requested resource '${c.req.path}' was not found`,
    },
    404,
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  return c.json(
    {
      success: false,
      error: 'Internal Server Error',
      message: env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    },
    500,
  );
});

// ============================================
// Export App
// ============================================

export default app;
export { app };
