// ============================================
// FOIA Stream - FOIA Request Routes
// ============================================

import { Hono } from 'hono';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { jsonValidator, paramValidator, queryValidator } from '../middleware/validator.middleware';
import { foiaRequestService } from '../services/foia-request.service';
import {
  CreateRequestSchema,
  IdParamSchema,
  PaginationSchema,
  RequestSearchSchema,
  UpdateRequestSchema,
} from '../validators/schemas';

const requests = new Hono();

/**
 * GET /requests - Search public requests
 */
requests.get('/', queryValidator(RequestSearchSchema), async (c) => {
  try {
    const filters = c.req.valid('query');
    const { page, pageSize, ...searchFilters } = filters;

    const result = await foiaRequestService.searchRequests(searchFilters, page, pageSize);

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
 * GET /requests/my - Get current user's requests
 */
requests.get('/my', authMiddleware, queryValidator(PaginationSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { page, pageSize } = c.req.valid('query');

    const result = await foiaRequestService.getUserRequests(userId, page, pageSize);

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get requests';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /requests/deadlines - Get requests with upcoming deadlines
 */
requests.get('/deadlines', authMiddleware, async (c) => {
  try {
    const days = Number(c.req.query('days')) || 7;
    const requests = await foiaRequestService.getUpcomingDeadlines(days);

    return c.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get deadlines';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /requests/overdue - Get overdue requests
 */
requests.get('/overdue', authMiddleware, async (c) => {
  try {
    const requests = await foiaRequestService.getOverdueRequests();

    return c.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get overdue requests';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /requests/:id - Get request by ID
 */
requests.get('/:id', optionalAuthMiddleware, paramValidator(IdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const request = await foiaRequestService.getRequestWithAgency(id);

    if (!request) {
      return c.json({ success: false, error: 'Request not found' }, 404);
    }

    // Check if request is public or belongs to user
    const user = c.get('user');
    if (!request.isPublic && (!user || request.userId !== user.userId)) {
      return c.json({ success: false, error: 'Request not found' }, 404);
    }

    return c.json({
      success: true,
      data: request,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get request';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /requests - Create new FOIA request
 */
requests.post('/', authMiddleware, jsonValidator(CreateRequestSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');

    const request = await foiaRequestService.createRequest(userId, data);

    return c.json(
      {
        success: true,
        data: request,
        message: 'Request created successfully',
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create request';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /requests/:id/submit - Submit a draft request
 */
requests.post('/:id/submit', authMiddleware, paramValidator(IdParamSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    const request = await foiaRequestService.submitRequest(id, userId);

    return c.json({
      success: true,
      data: request,
      message: 'Request submitted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit request';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PATCH /requests/:id - Update request (status, tracking, etc.)
 */
requests.patch(
  '/:id',
  authMiddleware,
  paramValidator(IdParamSchema),
  jsonValidator(UpdateRequestSchema),
  async (c) => {
    try {
      const { userId } = c.get('user');
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const request = await foiaRequestService.updateRequest(id, userId, data);

      return c.json({
        success: true,
        data: request,
        message: 'Request updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update request';
      return c.json({ success: false, error: message }, 400);
    }
  },
);

/**
 * POST /requests/:id/withdraw - Withdraw a request
 */
requests.post('/:id/withdraw', authMiddleware, paramValidator(IdParamSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    const request = await foiaRequestService.withdrawRequest(id, userId);

    return c.json({
      success: true,
      data: request,
      message: 'Request withdrawn successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to withdraw request';
    return c.json({ success: false, error: message }, 400);
  }
});

export { requests as requestRoutes };
