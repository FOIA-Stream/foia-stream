/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Response Helpers
 * @module lib/responses
 * @description Standard response helpers for consistent API responses.
 *              Reduces code duplication across route handlers.
 */

import { z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HttpStatusCodes } from './constants';

// ============================================
// Standard Response Schemas
// ============================================

/**
 * Standard error response schema
 */
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .openapi('ErrorResponse');

/**
 * Standard success message response schema
 */
export const MessageResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi('MessageResponse');

/**
 * Creates a success response schema with data
 */
export function successResponseSchema<T extends z.ZodTypeAny>(dataSchema: T, message?: boolean) {
  const base = {
    success: z.literal(true),
    data: dataSchema,
  };

  if (message) {
    return z.object({ ...base, message: z.string() }).openapi('SuccessResponse');
  }

  return z.object(base);
}

/**
 * Creates a paginated response schema
 */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });
}

// ============================================
// Response Helpers
// ============================================

/**
 * Send a success response with data
 */
export function successResponse<T, S extends ContentfulStatusCode = 200>(
  c: Context,
  data: T,
  options?: { message?: string; status?: S },
) {
  const response: { success: true; data: T; message?: string } = {
    success: true as const,
    data,
  };

  if (options?.message) {
    response.message = options.message;
  }

  return c.json(response, (options?.status ?? 200) as S);
}

/**
 * Send an error response
 */
export function errorResponse<S extends ContentfulStatusCode = 400>(
  c: Context,
  error: string,
  status: S = 400 as S,
) {
  return c.json({ success: false as const, error }, status);
}

/**
 * Send a message-only success response
 */
export function messageResponse<S extends ContentfulStatusCode = 200>(
  c: Context,
  message: string,
  status: S = 200 as S,
) {
  return c.json({ success: true as const, message }, status);
}

/**
 * Send a paginated response
 */
export function paginatedResponse<T>(
  c: Context,
  data: T[],
  pagination: { page: number; limit: number; total: number },
) {
  return c.json({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

// ============================================
// OpenAPI Route Response Helpers
// ============================================

/**
 * Standard OpenAPI responses for common status codes
 */
export const commonResponses = {
  unauthorized: {
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
  },
  forbidden: {
    [HttpStatusCodes.FORBIDDEN]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Access denied',
    },
  },
  notFound: {
    [HttpStatusCodes.NOT_FOUND]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Resource not found',
    },
  },
  badRequest: {
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
  serverError: {
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
} as const;

/**
 * Helper to create a success response definition for OpenAPI
 */
export function successResponseDef<T extends z.ZodTypeAny>(
  schema: T,
  description: string,
  status: number = HttpStatusCodes.OK,
) {
  return {
    [status]: {
      content: {
        'application/json': {
          schema,
        },
      },
      description,
    },
  };
}
