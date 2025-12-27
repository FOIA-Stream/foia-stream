/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file Security Middleware
 * @module middleware/security
 * @description Security-related middleware including HTTPS enforcement,
 *              security headers, and request sanitization.
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality), SC-23 (Session Authenticity)
 */

import type { Context, MiddlewareHandler, Next } from 'hono';

import { env } from '@/config/env';

/**
 * HTTPS enforcement middleware
 * Redirects HTTP requests to HTTPS in production environments
 *
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality and Integrity)
 * @returns {MiddlewareHandler} Hono middleware handler
 *
 * @example
 * ```typescript
 * app.use('*', httpsEnforcement());
 * ```
 */
export function httpsEnforcement(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // Skip in development/test environments
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      return next();
    }

    // Check for HTTPS via various headers (handles proxies/load balancers)
    const proto = c.req.header('x-forwarded-proto');
    const isSecure =
      proto === 'https' ||
      c.req.header('x-forwarded-ssl') === 'on' ||
      c.req.url.startsWith('https://');

    if (!isSecure) {
      // Redirect to HTTPS
      const url = new URL(c.req.url);
      url.protocol = 'https:';

      return c.redirect(url.toString(), 301);
    }

    return next();
  };
}

/**
 * Request ID middleware
 * Adds a unique request ID for tracing and debugging
 *
 * @returns {MiddlewareHandler} Hono middleware handler
 */
export function requestId(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const id = c.req.header('x-request-id') || crypto.randomUUID();
    c.set('requestId', id);
    c.header('X-Request-ID', id);
    await next();
  };
}

/**
 * Combined security middleware
 * Applies all security middleware in the correct order
 *
 * @returns {MiddlewareHandler[]} Array of middleware handlers
 *
 * @example
 * ```typescript
 * app.use('*', ...allSecurityMiddleware());
 * ```
 */
export function allSecurityMiddleware(): MiddlewareHandler[] {
  return [requestId(), httpsEnforcement()];
}
