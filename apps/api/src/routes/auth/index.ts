/**
 * @file Auth Route Module
 * @module routes/auth
 * @author FOIA Stream Team
 * @description Wires auth route definitions to their handlers with middleware.
 *              Uses path-specific middleware to avoid middleware bleed.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */

import { createRouter } from '@/lib/create-app';
import { authMiddleware } from '@/middleware/auth.middleware';

import * as handlers from './auth.handlers';
import * as routes from './auth.routes';

const router = createRouter();

// Public Routes (no middleware)
router.openapi(routes.registerRoute, handlers.register);
router.openapi(routes.loginRoute, handlers.login);

// Protected Routes - apply middleware to specific paths
router.use('/auth/logout', authMiddleware);
router.use('/auth/me', authMiddleware);
router.use('/auth/change-password', authMiddleware);

// Register the protected route handlers
router.openapi(routes.logoutRoute, handlers.logout);
router.openapi(routes.getMeRoute, handlers.getMe);
router.openapi(routes.updateMeRoute, handlers.updateMe);
router.openapi(routes.changePasswordRoute, handlers.changePassword);

export default router;
