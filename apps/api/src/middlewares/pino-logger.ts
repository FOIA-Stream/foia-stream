/**
 * @file Pino Logger Middleware
 * @module middlewares/pino-logger
 * @author FOIA Stream Team
 * @description Structured logging middleware using Pino for the FOIA Stream API.
 *              Provides JSON logging in production and pretty printing in development.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */

import { pinoLogger as logger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';

import { env } from '../config/env';

/**
 * Create Pino logger middleware
 *
 * @returns Hono middleware for structured logging
 *
 * @description
 * - In production: JSON output for log aggregation
 * - In development: Pretty printed output for readability
 *
 * @example
 * ```typescript
 * app.use(pinoLogger());
 *
 * // In route handler
 * c.var.logger.info('Processing request');
 * ```
 */
export function pinoLogger() {
  return logger({
    pino: pino(
      {
        level: 'info',
      },
      env.NODE_ENV === 'production' ? undefined : pretty(),
    ),
  });
}
