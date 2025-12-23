// ============================================
// FOIA Stream - Authentication Middleware
// ============================================

import type { Context, Next } from 'hono';
import { authService, type JWTPayload } from '../services/auth.service';
import type { UserRole } from '../types';

// Extend Hono context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * Authentication middleware - requires valid JWT
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | undefined> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Authorization header required' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await authService.verifyToken(token);
    c.set('user', payload);
    await next();
    return undefined;
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
}

/**
 * Optional authentication middleware - sets user if token provided
 */
export async function optionalAuthMiddleware(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const payload = await authService.verifyToken(token);
      c.set('user', payload);
    } catch {
      // Token invalid but continue without user
    }
  }

  await next();
}

/**
 * Role-based authorization middleware
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    await next();
    return undefined;
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRoles('admin');

/**
 * Agency official middleware
 */
export const requireAgencyOfficial = requireRoles('admin', 'agency_official');
