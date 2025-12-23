// ============================================
// FOIA Stream - Agency Routes
// ============================================

import { Hono } from 'hono';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { effectValidator } from '../middleware/validator.middleware';
import { agencyService } from '../services/agency.service';
import {
  AgencySearchSchema,
  CreateAgencySchema,
  IdParamSchema,
  UpdateAgencySchema,
} from '../validators/schemas';

const agencies = new Hono();

/**
 * GET /agencies - Search agencies
 */
agencies.get('/', effectValidator('query', AgencySearchSchema), async (c) => {
  try {
    const filters = c.req.valid('query');
    const { page, pageSize, ...searchFilters } = filters;

    const result = await agencyService.searchAgencies(searchFilters, page, pageSize);

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
 * GET /agencies/states - Get US states list
 */
agencies.get('/states', (c) => {
  return c.json({
    success: true,
    data: agencyService.getUSStates(),
  });
});

/**
 * GET /agencies/:id - Get agency by ID
 */
agencies.get('/:id', effectValidator('param', IdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const agency = await agencyService.getAgencyById(id);

    if (!agency) {
      return c.json({ success: false, error: 'Agency not found' }, 404);
    }

    return c.json({
      success: true,
      data: agency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agency';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /agencies/:id/stats - Get agency statistics
 */
agencies.get('/:id/stats', effectValidator('param', IdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const stats = await agencyService.getAgencyStats(id);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get statistics';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /agencies - Create new agency (admin only)
 */
agencies.post(
  '/',
  authMiddleware,
  requireAdmin,
  effectValidator('json', CreateAgencySchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const agency = await agencyService.createAgency(data);

      return c.json(
        {
          success: true,
          data: agency,
          message: 'Agency created successfully',
        },
        201,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create agency';
      return c.json({ success: false, error: message }, 400);
    }
  },
);

/**
 * PATCH /agencies/:id - Update agency (admin only)
 */
agencies.patch(
  '/:id',
  authMiddleware,
  requireAdmin,
  effectValidator('param', IdParamSchema),
  effectValidator('json', UpdateAgencySchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const agency = await agencyService.updateAgency(id, data);

      return c.json({
        success: true,
        data: agency,
        message: 'Agency updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update agency';
      return c.json({ success: false, error: message }, 400);
    }
  },
);

export { agencies as agencyRoutes };
