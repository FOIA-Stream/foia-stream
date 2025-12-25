/**
 * @file Templates Routes Index
 * @module routes/templates
 * @author FOIA Stream Team
 * @description Wires template route definitions to handler implementations.
 *              Uses path-specific middleware to avoid middleware bleed.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { createRouter } from '../../lib/create-app';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';
import * as handlers from './templates.handlers';
import * as routes from './templates.routes';

const router = createRouter();

// ============================================
// Public Routes (no middleware)
// ============================================

router.openapi(routes.searchTemplatesRoute, handlers.searchTemplates);
router.openapi(routes.getOfficialTemplatesRoute, handlers.getOfficialTemplates);
router.openapi(routes.getTemplatesByCategoryRoute, handlers.getTemplatesByCategory);
router.openapi(routes.getTemplateRoute, handlers.getTemplate);

// ============================================
// Protected Routes (auth required)
// Apply path-specific middleware before registering handlers
// ============================================

// Create template (POST /templates) - needs auth
router.post('/templates', authMiddleware);
router.openapi(routes.createTemplateRoute, handlers.createTemplate);

// Seed templates (POST /templates/seed) - admin only
router.post('/templates/seed', authMiddleware, requireAdmin);
router.openapi(routes.seedTemplatesRoute, handlers.seedTemplates);

export default router;
