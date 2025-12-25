/**
 * @file Routes Index
 * @module routes
 * @author FOIA Stream Team
 * @description Centralized export for all API route modules.
 *              Each route module handles a specific domain of the FOIA Stream API.
 */

// ============================================
// FOIA Stream - Routes Index
// ============================================

export { agencyRoutes } from './agencies.routes';
export { authRoutes } from './auth.routes';
export { requestRoutes } from './requests.routes';
export { templateRoutes } from './templates.routes';
