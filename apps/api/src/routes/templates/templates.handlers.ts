/**
 * @file Template Handlers
 * @module routes/templates/handlers
 * @author FOIA Stream Team
 * @description Handler implementations for template OpenAPI routes.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { HttpStatusCodes } from '../../lib/constants';
import type { AppRouteHandler } from '../../lib/types';
import { templateService } from '../../services/template.service';
import type {
  createTemplateRoute,
  getOfficialTemplatesRoute,
  getTemplateRoute,
  getTemplatesByCategoryRoute,
  searchTemplatesRoute,
  seedTemplatesRoute,
} from './templates.routes';

// ============================================
// Handler Implementations
// ============================================

/**
 * Search templates handler
 */
export const searchTemplates: AppRouteHandler<typeof searchTemplatesRoute> = async (c) => {
  try {
    const { query, category, page, pageSize } = c.req.valid('query');

    const result = await templateService.searchTemplates(
      query,
      category,
      page ?? 1,
      pageSize ?? 20,
    );

    return c.json(
      {
        success: true as const,
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get official templates handler
 */
export const getOfficialTemplates: AppRouteHandler<typeof getOfficialTemplatesRoute> = async (
  c,
) => {
  try {
    const templates = await templateService.getOfficialTemplates();

    return c.json(
      {
        success: true as const,
        data: templates,
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get templates';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get templates by category handler
 */
export const getTemplatesByCategory: AppRouteHandler<typeof getTemplatesByCategoryRoute> = async (
  c,
) => {
  try {
    const { category } = c.req.valid('param');
    const templates = await templateService.getTemplatesByCategory(category);

    return c.json(
      {
        success: true as const,
        data: templates,
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get templates';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get template by ID handler
 */
export const getTemplate: AppRouteHandler<typeof getTemplateRoute> = async (c) => {
  try {
    const { id } = c.req.valid('param');
    const template = await templateService.getTemplateById(id);

    if (!template) {
      return c.json(
        { success: false as const, error: 'Template not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.json(
      {
        success: true as const,
        data: template,
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get template';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Create template handler
 */
export const createTemplate: AppRouteHandler<typeof createTemplateRoute> = async (c) => {
  try {
    const { userId, role } = c.get('user');
    const data = c.req.valid('json');

    // Only admins can create official templates
    if (data.isOfficial && role !== 'admin') {
      return c.json(
        { success: false as const, error: 'Only admins can create official templates' },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    const template = await templateService.createTemplate(userId, data);

    return c.json(
      {
        success: true as const,
        data: template,
        message: 'Template created successfully',
      },
      HttpStatusCodes.CREATED,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Seed default templates handler (admin only)
 */
export const seedTemplates: AppRouteHandler<typeof seedTemplatesRoute> = async (c) => {
  try {
    await templateService.seedDefaultTemplates();

    return c.json(
      {
        success: true as const,
        message: 'Default templates seeded successfully',
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed templates';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};
