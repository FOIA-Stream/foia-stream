/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Response Helpers
 * @module lib/responses
 * @description Standard response schemas and helpers for consistent API responses.
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
// Handler Helpers
// ============================================

/**
 * Handle route error in catch blocks - reduces boilerplate
 * @param c - Hono context
 * @param error - The caught error
 * @param fallbackMessage - Message to use if error is not an Error instance
 * @param status - HTTP status code (default: 400)
 */
export function handleRouteError<S extends ContentfulStatusCode = 400>(
  c: Context,
  error: unknown,
  fallbackMessage: string,
  status: S = 400 as S,
) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return c.json({ success: false as const, error: message }, status);
}

// ============================================
// OpenAPI Route Response Helpers
// ============================================

/**
 * Standard OpenAPI responses for common status codes
 */
export const commonResponses = {
  // Success responses
  ok: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Request successful',
    },
  },
  created: {
    [HttpStatusCodes.CREATED]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Resource created successfully',
    },
  },
  // Error responses
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
