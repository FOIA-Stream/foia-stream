/**
 * @file Auth Route Handlers
 * @module routes/auth/auth.handlers
 * @author FOIA Stream Team
 * @description Handler implementations for authentication endpoints.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */

import { authService } from '@/services/auth.service';
import type { User } from '@/types';
import type { Context } from 'hono';

/**
 * Maps user object to API response format (excludes passwordHash)
 */
const mapUserResponse = (user: Omit<User, 'passwordHash'>) => ({
  id: user.id,
  email: user.email,
  role: user.role as
    | 'civilian'
    | 'journalist'
    | 'researcher'
    | 'attorney'
    | 'community_advocate'
    | 'agency_official'
    | 'admin',
  firstName: user.firstName,
  lastName: user.lastName,
  organization: user.organization ?? null,
  isAnonymous: user.isAnonymous,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Handler for POST /auth/register
 *
 * @param {Context} c - Hono context with validated request body
 * @returns {Promise<Response>} JSON response with created user or error
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export const register = async (c: Context) => {
  try {
    const data = c.req.valid('json' as never);
    const user = await authService.createUser(data);

    return c.json(
      {
        success: true,
        data: mapUserResponse(user),
        message: 'Account created successfully',
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/login
 *
 * @param {Context} c - Hono context with validated login credentials
 * @returns {Promise<Response>} JSON response with JWT token or error
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AU-2 (Audit Events)
 */
export const login = async (c: Context) => {
  try {
    const { email, password } = c.req.valid('json' as never);
    const result = await authService.login(email, password);

    return c.json(
      {
        success: true,
        data: {
          token: result.token,
          requiresMFA: result.requiresMFA,
          mfaToken: result.mfaToken,
          user: mapUserResponse(result.user),
        },
        message: 'Login successful',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return c.json({ success: false, error: message }, 401);
  }
};

/**
 * Handler for POST /auth/logout
 *
 * @param {Context} c - Hono context with auth token in header
 * @returns {Promise<Response>} JSON response confirming logout or error
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
export const logout = async (c: Context) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);

    if (!token) {
      return c.json({ success: false, error: 'No token provided' }, 400);
    }

    await authService.logout(token);

    return c.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for GET /auth/me
 *
 * @param {Context} c - Hono context with authenticated user
 * @returns {Promise<Response>} JSON response with user profile or error
 */
export const getMe = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const user = await authService.getUserById(userId);

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json(
      {
        success: true,
        data: mapUserResponse(user),
        message: '',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for PATCH /auth/me
 *
 * @param {Context} c - Hono context with validated update data
 * @returns {Promise<Response>} JSON response with updated user or error
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export const updateMe = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json' as never);
    const user = await authService.updateUser(userId, data);

    return c.json(
      {
        success: true,
        data: mapUserResponse(user),
        message: 'Profile updated successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/change-password
 *
 * @param {Context} c - Hono context with validated password change data
 * @returns {Promise<Response>} JSON response confirming password change or error
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const changePassword = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { currentPassword, newPassword } = c.req.valid('json' as never);

    await authService.changePassword(userId, currentPassword, newPassword);

    return c.json(
      {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password change failed';
    return c.json({ success: false, error: message }, 400);
  }
};
