/**
 * @file Template Routes
 * @module routes/templates
 * @author FOIA Stream Team
 * @description Handles FOIA request template management including search, retrieval,
 *              and creation of reusable request templates. Official templates can
 *              only be created by admins.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

// ============================================
// FOIA Stream - Template Routes
// ============================================

import { Hono } from 'hono';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { effectValidator } from '../middleware/validator.middleware';
import { templateService } from '../services/template.service';
import {
  CategoryParamSchema,
  CreateTemplateSchema,
  IdParamSchema,
  TemplateSearchSchema,
} from '../validators/schemas';

const templates = new Hono();

/**
 * GET /templates - Search templates
 *
 * @route GET /templates
 * @group Templates - Template search and retrieval
 * @param {TemplateSearchSchema} request.query - Search filters (query, category, page, pageSize)
 * @returns {Object} 200 - Paginated list of templates
 * @returns {Object} 400 - Search error
 */
templates.get('/', effectValidator('query', TemplateSearchSchema), async (c) => {
  try {
    const { query, category, page, pageSize } = c.req.valid('query');
    const result = await templateService.searchTemplates(query, category, page, pageSize);

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /templates/official - Get official templates
 *
 * @route GET /templates/official
 * @group Templates - Official templates
 * @returns {Object} 200 - List of official templates
 * @returns {Object} 400 - Retrieval error
 */
templates.get('/official', async (c) => {
  try {
    const templates = await templateService.getOfficialTemplates();

    return c.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get templates';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /templates/category/:category - Get templates by category
 *
 * @route GET /templates/category/:category
 * @group Templates - Template retrieval
 * @param {string} category.path.required - Template category
 * @returns {Object} 200 - List of templates in category
 * @returns {Object} 400 - Retrieval error
 */
templates.get('/category/:category', effectValidator('param', CategoryParamSchema), async (c) => {
  try {
    const { category } = c.req.valid('param');
    const templates = await templateService.getTemplatesByCategory(category);

    return c.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get templates';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /templates/:id - Get template by ID
 *
 * @route GET /templates/:id
 * @group Templates - Template retrieval
 * @param {string} id.path.required - Template UUID
 * @returns {Object} 200 - Template details
 * @returns {Object} 404 - Template not found
 */
templates.get('/:id', effectValidator('param', IdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const template = await templateService.getTemplateById(id);

    if (!template) {
      return c.json({ success: false, error: 'Template not found' }, 404);
    }

    return c.json({
      success: true,
      data: template,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get template';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /templates - Create new template
 *
 * @route POST /templates
 * @group Templates - Template management
 * @security JWT
 * @param {CreateTemplateSchema} request.body.required - Template data
 * @returns {Object} 201 - Created template
 * @returns {Object} 400 - Creation error
 * @returns {Object} 403 - Forbidden (official template without admin role)
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */
templates.post('/', authMiddleware, effectValidator('json', CreateTemplateSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');

    // Only admins can create official templates
    if (data.isOfficial && c.get('user').role !== 'admin') {
      return c.json({ success: false, error: 'Only admins can create official templates' }, 403);
    }

    const template = await templateService.createTemplate(userId, data);

    return c.json(
      {
        success: true,
        data: template,
        message: 'Template created successfully',
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /templates/seed - Seed default templates (admin only)
 *
 * @route POST /templates/seed
 * @group Templates - Template management
 * @security JWT - Admin role required
 * @returns {Object} 200 - Seed success message
 * @returns {Object} 400 - Seed error
 * @returns {Object} 403 - Forbidden (non-admin)
 * @description Seeds the database with default official FOIA request templates
 */
templates.post('/seed', authMiddleware, requireAdmin, async (c) => {
  try {
    await templateService.seedDefaultTemplates();

    return c.json({
      success: true,
      message: 'Default templates seeded successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed templates';
    return c.json({ success: false, error: message }, 400);
  }
});

export { templates as templateRoutes };
