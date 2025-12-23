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
