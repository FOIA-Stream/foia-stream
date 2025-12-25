/**
 * @file Application Types
 * @module lib/types
 * @author FOIA Stream Team
 * @description Core type definitions for the OpenAPI Hono application.
 *              Defines bindings, route handlers, and application types.
 */

import type { OpenAPIHono, RouteConfig, RouteHandler } from '@hono/zod-openapi';
import type { Schema } from 'hono';
import type { PinoLogger } from 'hono-pino';
import type { JWTPayload } from '../services/auth.service';

/**
 * Application context bindings
 * @interface
 */
export interface AppBindings {
  Variables: {
    /** Pino logger instance */
    logger: PinoLogger;
    /** Authenticated user payload (set by auth middleware) */
    user: JWTPayload;
  };
}

/**
 * OpenAPI Hono application type
 * @template S - Schema type
 */
export type AppOpenAPI<S extends Schema = NonNullable<unknown>> = OpenAPIHono<AppBindings, S>;

/**
 * Route handler type for OpenAPI routes
 * @template R - Route configuration type
 */
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
