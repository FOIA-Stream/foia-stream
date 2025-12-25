/**
 * @file Auth Route Definitions (OpenAPI)
 * @module routes/auth/auth.routes
 * @author FOIA Stream Team
 * @description OpenAPI route definitions for authentication endpoints using Zod schemas.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */

import { createRoute, z } from '@hono/zod-openapi';

import { HttpStatusCodes } from '@/lib/constants';

// ============================================
// Zod Schemas
// ============================================

/**
 * User role enumeration
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */
export const UserRoleSchema = z.enum([
  'civilian',
  'journalist',
  'researcher',
  'attorney',
  'community_advocate',
  'agency_official',
  'admin',
]);

/**
 * Schema for user registration request body
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const CreateUserSchema = z
  .object({
    email: z.string().email('Invalid email address').openapi({ example: 'user@example.com' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .openapi({ example: 'SecurePass123!' }),
    role: UserRoleSchema.default('civilian').openapi({ example: 'civilian' }),
    firstName: z.string().min(1, 'First name is required').openapi({ example: 'John' }),
    lastName: z.string().min(1, 'Last name is required').openapi({ example: 'Doe' }),
    organization: z.string().optional().openapi({ example: 'ACLU' }),
    isAnonymous: z.boolean().default(false).openapi({ example: false }),
  })
  .openapi('CreateUser');

/**
 * Schema for login request body
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 */
export const LoginSchema = z
  .object({
    email: z.string().email('Invalid email address').openapi({ example: 'user@example.com' }),
    password: z.string().min(1, 'Password is required').openapi({ example: 'SecurePass123!' }),
  })
  .openapi('LoginCredentials');

/**
 * Schema for profile update request body
 */
export const UpdateUserSchema = z
  .object({
    firstName: z.string().min(1).optional().openapi({ example: 'Jane' }),
    lastName: z.string().min(1).optional().openapi({ example: 'Smith' }),
    organization: z.string().optional().openapi({ example: 'EFF' }),
    isAnonymous: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateUser');

/**
 * Schema for password change request body
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  })
  .openapi('ChangePassword');

// ============================================
// Response Schemas
// ============================================

/**
 * User data returned from API (excludes sensitive fields)
 */
export const UserResponseSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    role: UserRoleSchema,
    firstName: z.string(),
    lastName: z.string(),
    organization: z.string().nullable(),
    isAnonymous: z.boolean(),
    isVerified: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('User');

/**
 * Login response with JWT token
 */
export const LoginResponseSchema = z
  .object({
    token: z.string(),
    user: UserResponseSchema,
    requiresMFA: z.boolean(),
    mfaToken: z.string().optional(),
  })
  .openapi('LoginResponse');

/**
 * Standard success response wrapper
 */
const successResponse = <T extends z.ZodTypeAny>(dataSchema: T, message?: string) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z
      .string()
      .optional()
      .default(message ?? ''),
  });

/**
 * Standard error response
 */
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .openapi('ErrorResponse');

/**
 * Simple message response
 */
export const MessageResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi('MessageResponse');

// ============================================
// Route Definitions
// ============================================

const tags = ['Authentication'];

/**
 * POST /auth/register - Create new user account
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export const registerRoute = createRoute({
  path: '/auth/register',
  method: 'post',
  tags,
  summary: 'Register a new user account',
  description:
    'Creates a new user account with the provided credentials. Returns the created user object.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserSchema,
        },
      },
      required: true,
      description: 'User registration data',
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      content: {
        'application/json': {
          schema: successResponse(UserResponseSchema, 'Account created successfully'),
        },
      },
      description: 'User created successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Registration failed - validation error or email already exists',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

/**
 * POST /auth/login - Authenticate user
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AU-2 (Audit Events) - Login events are logged
 */
export const loginRoute = createRoute({
  path: '/auth/login',
  method: 'post',
  tags,
  summary: 'Authenticate user and get JWT token',
  description:
    'Authenticates a user with email and password. Returns a JWT token for subsequent authenticated requests.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
      required: true,
      description: 'Login credentials',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(LoginResponseSchema, 'Login successful'),
        },
      },
      description: 'Login successful',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid credentials',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

/**
 * POST /auth/logout - Logout user
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
export const logoutRoute = createRoute({
  path: '/auth/logout',
  method: 'post',
  tags,
  summary: 'Logout current user',
  description: 'Invalidates the current JWT token, logging the user out.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Logged out successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Logout failed',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
  },
});

/**
 * GET /auth/me - Get current user profile
 */
export const getMeRoute = createRoute({
  path: '/auth/me',
  method: 'get',
  tags,
  summary: 'Get current user profile',
  description: 'Returns the profile of the currently authenticated user.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(UserResponseSchema),
        },
      },
      description: 'User profile retrieved successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Failed to get profile',
    },
    [HttpStatusCodes.NOT_FOUND]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User not found',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
  },
});

/**
 * PATCH /auth/me - Update current user profile
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export const updateMeRoute = createRoute({
  path: '/auth/me',
  method: 'patch',
  tags,
  summary: 'Update current user profile',
  description: 'Updates the profile of the currently authenticated user.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
        },
      },
      required: true,
      description: 'Profile update data',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(UserResponseSchema, 'Profile updated successfully'),
        },
      },
      description: 'Profile updated successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Update failed',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

/**
 * POST /auth/change-password - Change password
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const changePasswordRoute = createRoute({
  path: '/auth/change-password',
  method: 'post',
  tags,
  summary: 'Change current user password',
  description: 'Changes the password for the currently authenticated user.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChangePasswordSchema,
        },
      },
      required: true,
      description: 'Current and new password',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Password changed successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Password change failed',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated or current password incorrect',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

// Type exports for handlers
export type RegisterRoute = typeof registerRoute;
export type LoginRoute = typeof loginRoute;
export type LogoutRoute = typeof logoutRoute;
export type GetMeRoute = typeof getMeRoute;
export type UpdateMeRoute = typeof updateMeRoute;
export type ChangePasswordRoute = typeof changePasswordRoute;
