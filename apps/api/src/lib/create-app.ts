/**
 * @file Application Factory
 * @module lib/create-app
 * @author FOIA Stream Team
 * @description Factory functions for creating Hono OpenAPI applications
 *              and routers with standardized middleware and error handling.
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import type { Schema } from 'hono';
import { requestId } from 'hono/request-id';
import { notFound, onError, serveEmojiFavicon } from 'stoker/middlewares';
import { defaultHook } from 'stoker/openapi';
import { pinoLogger } from '../middlewares/pino-logger';
import type { AppBindings, AppOpenAPI } from './types';

/**
 * Create a new OpenAPI router instance
 *
 * @returns {OpenAPIHono<AppBindings>} New router instance with default hook
 *
 * @example
 * ```typescript
 * const router = createRouter();
 * router.openapi(route, handler);
 * ```
 */
export function createRouter(): OpenAPIHono<AppBindings> {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

/**
 * Create the main application with all middleware configured
 *
 * @returns {OpenAPIHono<AppBindings>} Configured Hono application
 *
 * @example
 * ```typescript
 * const app = createApp();
 * configureOpenAPI(app);
 * ```
 */
export default function createApp(): OpenAPIHono<AppBindings> {
  const app = createRouter();

  app.use(requestId()).use(serveEmojiFavicon('📋')).use(pinoLogger());

  app.notFound(notFound);
  app.onError(onError);

  return app;
}

/**
 * Create a test application with a router mounted
 *
 * @template S - Schema type
 * @param {AppOpenAPI<S>} router - Router to mount for testing
 * @returns {OpenAPIHono<AppBindings>} Test application with router
 *
 * @example
 * ```typescript
 * const client = testClient(createTestApp(authRouter));
 * ```
 */
export function createTestApp<S extends Schema>(router: AppOpenAPI<S>): OpenAPIHono<AppBindings> {
  return createApp().route('/', router);
}
