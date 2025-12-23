// ============================================
// FOIA Stream - Authentication Routes
// ============================================

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware';
import { jsonValidator } from '../middleware/validator.middleware';
import { authService } from '../services/auth.service';
import {
  ChangePasswordSchema,
  CreateUserSchema,
  LoginSchema,
  UpdateUserSchema,
} from '../validators/schemas';

const auth = new Hono();

/**
 * POST /auth/register - Create new user account
 */
auth.post('/register', jsonValidator(CreateUserSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const user = await authService.createUser(data);

    return c.json(
      {
        success: true,
        data: user,
        message: 'Account created successfully',
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /auth/login - Authenticate user
 */
auth.post('/login', jsonValidator(LoginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    const result = await authService.login(email, password);

    return c.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return c.json({ success: false, error: message }, 401);
  }
});

/**
 * POST /auth/logout - Logout user
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    if (!token) {
      return c.json({ success: false, error: 'No token provided' }, 400);
    }
    await authService.logout(token);

    return c.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /auth/me - Get current user profile
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const user = await authService.getUserById(userId);

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PATCH /auth/me - Update current user profile
 */
auth.patch('/me', authMiddleware, jsonValidator(UpdateUserSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');
    const user = await authService.updateUser(userId, data);

    return c.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /auth/change-password - Change password
 */
auth.post('/change-password', authMiddleware, jsonValidator(ChangePasswordSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { currentPassword, newPassword } = c.req.valid('json');
    await authService.changePassword(userId, currentPassword, newPassword);

    return c.json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password change failed';
    return c.json({ success: false, error: message }, 400);
  }
});

export { auth as authRoutes };
