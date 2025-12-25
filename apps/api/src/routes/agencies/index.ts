/**
 * @file Agency Routes Index
 * @module routes/agencies
 * @author FOIA Stream Team
 * @description Wires agency route definitions to handler implementations.
 *              Uses path-specific middleware to avoid middleware bleed.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { createRouter } from '../../lib/create-app';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';
import * as handlers from './agencies.handlers';
import * as routes from './agencies.routes';

const router = createRouter();

// ============================================
// Public Routes (no middleware)
// ============================================

router.openapi(routes.searchAgenciesRoute, handlers.searchAgencies);
router.openapi(routes.getStatesRoute, handlers.getStates);
router.openapi(routes.getAgencyRoute, handlers.getAgency);
router.openapi(routes.getAgencyStatsRoute, handlers.getAgencyStats);

// ============================================
// Protected Routes (admin only)
// Apply path-specific middleware before registering handlers
// POST /agencies requires admin
// PATCH /agencies/:id requires admin
// ============================================

// For POST /agencies - need auth + admin
router.post('/agencies', authMiddleware, requireAdmin);

// For PATCH /agencies/:id - need auth + admin
router.patch('/agencies/:id', authMiddleware, requireAdmin);

// Register the protected route handlers
router.openapi(routes.createAgencyRoute, handlers.createAgency);
router.openapi(routes.updateAgencyRoute, handlers.updateAgency);

export default router;
