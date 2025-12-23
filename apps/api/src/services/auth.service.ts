// ============================================
// FOIA Stream - Authentication Service
// ============================================

import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { nanoid } from 'nanoid';
import { env } from '../config/env';
import { db, schema } from '../db';
import type { CreateUserDTO, User, UserRole } from '../types';
import { ConflictError, DatabaseError, NotFoundError, SecurityError } from '../utils/errors';
import { mfaService } from './mfa.service';
import { securityMonitoring } from './security-monitoring.service';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

// Security configuration
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionExpiryDays: 7,
};

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  mfaVerified?: boolean;
}

export interface LoginResult {
  token: string;
  user: Omit<User, 'passwordHash'>;
  requiresMFA: boolean;
  mfaToken?: string;
}

export class AuthService {
  /**
   * Check if account is locked
   */
  private async isAccountLocked(userId: string): Promise<boolean> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user || !user.lockedUntil) return false;

    const lockedUntil = new Date(user.lockedUntil);
    if (lockedUntil > new Date()) {
      return true;
    }

    // Lockout expired, reset failed attempts
    await db
      .update(schema.users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));

    return false;
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user) return;

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const now = new Date().toISOString();

    let lockedUntil: string | null = null;
    if (failedAttempts >= SECURITY_CONFIG.maxFailedAttempts) {
      const lockoutEnd = new Date(Date.now() + SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000);
      lockedUntil = lockoutEnd.toISOString();

      // Log account lockout security event
      await securityMonitoring.logSecurityEvent({
        type: 'account_lockout',
        userId,
        severity: 'high',
        details: {
          email,
          failedAttempts,
          lockoutDuration: SECURITY_CONFIG.lockoutDurationMinutes,
        },
        ipAddress,
        userAgent,
      });
    }

    await db
      .update(schema.users)
      .set({
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: now,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(schema.users.id, userId));

    // Track failed login
    await securityMonitoring.logSecurityEvent({
      type: 'failed_login',
      userId,
      severity: 'medium',
      details: { email, attemptNumber: failedAttempts },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Reset failed login attempts on successful login
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    await db
      .update(schema.users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));
  }

  /**
   * Create a new user account
   */
  async createUser(data: CreateUserDTO): Promise<Omit<User, 'passwordHash'>> {
    // Check if email already exists
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email.toLowerCase()))
      .get();

    if (existing) {
      throw ConflictError('Email already registered', { email: data.email });
    }

    // Hash password
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const id = nanoid();
    const now = new Date().toISOString();

    await db.insert(schema.users).values({
      id,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      organization: data.organization,
      isAnonymous: data.isAnonymous ?? false,
      isVerified: false,
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    // Log audit event
    await this.logAudit(id, 'user_created', 'user', id);

    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();

    if (!user) {
      throw new DatabaseError('insert', { table: 'users', metadata: { userId: id } });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'passwordHash'>;
  }

  /**
   * Authenticate user and return JWT token
   */
  async login(
    email: string,
    password: string,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .get();

    if (!user) {
      // Log failed attempt even if user doesn't exist (timing attack prevention)
      await securityMonitoring.logSecurityEvent({
        type: 'failed_login',
        severity: 'low',
        details: { email, reason: 'user_not_found' },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
      throw new SecurityError('authentication', 'Invalid credentials', { email });
    }

    // Check if account is locked
    if (await this.isAccountLocked(user.id)) {
      throw new SecurityError(
        'authentication',
        'Account is temporarily locked. Please try again later.',
        { userId: user.id },
      );
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      await this.recordFailedLogin(user.id, email, options?.ipAddress, options?.userAgent);
      throw new SecurityError('authentication', 'Invalid credentials', { email });
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(user.id);

    // Check if MFA is enabled
    const requiresMFA = user.twoFactorEnabled ?? false;
    let mfaToken: string | undefined;

    if (requiresMFA) {
      // Generate a temporary MFA token (valid for 5 minutes)
      mfaToken = await new jose.SignJWT({ userId: user.id, type: 'mfa_pending' } as jose.JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(JWT_SECRET);
    }

    // Generate JWT (without MFA verified flag if MFA is required)
    const token = await this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      mfaVerified: !requiresMFA, // True only if MFA is not required
    });

    // Create session
    const sessionId = nanoid();
    const expiresAt = new Date(
      Date.now() + SECURITY_CONFIG.sessionExpiryDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    await db.insert(schema.sessions).values({
      id: sessionId,
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    // Log successful login
    await securityMonitoring.logSecurityEvent({
      type: 'successful_login',
      userId: user.id,
      severity: 'low',
      details: { email, mfaRequired: requiresMFA },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });

    // Log audit event
    await this.logAudit(user.id, 'user_login', 'user', user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      token: requiresMFA ? '' : token, // Don't return full token until MFA verified
      user: userWithoutPassword as Omit<User, 'passwordHash'>,
      requiresMFA,
      mfaToken,
    };
  }

  /**
   * Verify MFA code and complete login
   */
  async verifyMFACode(
    mfaToken: string,
    code: string,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string }> {
    try {
      const { payload } = await jose.jwtVerify(mfaToken, JWT_SECRET);

      if ((payload as { type?: string }).type !== 'mfa_pending') {
        throw new SecurityError('invalid_token', 'Invalid MFA token');
      }

      const userId = (payload as { userId?: string }).userId;
      if (!userId) {
        throw new SecurityError('invalid_token', 'Invalid MFA token');
      }

      // Use the mfaService to verify the code
      const verifyResult = await mfaService.verifyMFA(userId, code);

      if (!verifyResult.success) {
        await securityMonitoring.logSecurityEvent({
          type: 'failed_login',
          userId,
          severity: 'medium',
          details: { reason: 'invalid_mfa_code' },
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        });
        throw new SecurityError('authentication', 'Invalid MFA code', { userId });
      }

      const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

      if (!user) {
        throw NotFoundError('User not found', { userId });
      }

      // Generate full access token
      const token = await this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        mfaVerified: true,
      });

      // Update session with full token
      await db.update(schema.sessions).set({ token }).where(eq(schema.sessions.userId, userId));

      await securityMonitoring.logSecurityEvent({
        type: 'successful_login',
        userId,
        severity: 'low',
        details: { mfaVerified: true, usedBackupCode: verifyResult.usedBackupCode },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });

      return { token };
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError('expired_token', 'Invalid or expired MFA token');
    }
  }

  /**
   * Enable MFA for user (starts the setup process)
   */
  async setupMFA(userId: string) {
    return mfaService.setupMFA(userId);
  }

  /**
   * Confirm MFA setup with verification code
   */
  async confirmMFASetup(userId: string, code: string): Promise<boolean> {
    return mfaService.verifyAndEnableMFA(userId, code);
  }

  /**
   * Disable MFA for user (requires password verification first)
   */
  async disableMFA(userId: string, password: string): Promise<void> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user) {
      throw NotFoundError('User not found', { userId });
    }

    // Verify password before disabling MFA
    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new SecurityError('authentication', 'Invalid password', { userId });
    }

    await mfaService.disableMFA(userId);
  }

  /**
   * Logout user and invalidate session
   */
  async logout(token: string): Promise<void> {
    const session = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .get();

    if (session) {
      await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
      await this.logAudit(session.userId, 'user_logout', 'user', session.userId);
    }
  }

  /**
   * Verify JWT token and return payload
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      return payload as unknown as JWTPayload;
    } catch {
      throw new SecurityError('expired_token', 'Invalid or expired token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();

    if (!user) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'passwordHash'>;
  }

  /**
   * Update user profile
   */
  async updateUser(
    id: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'organization' | 'isAnonymous'>>,
  ): Promise<Omit<User, 'passwordHash'>> {
    await db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, id));

    const user = await this.getUserById(id);
    if (!user) {
      throw NotFoundError('User not found', { userId: id });
    }

    return user;
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();

    if (!user) {
      throw NotFoundError('User not found', { userId: id });
    }

    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new SecurityError('authentication', 'Current password is incorrect', { userId: id });
    }

    const newHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await db
      .update(schema.users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, id));

    // Invalidate all sessions
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  }

  /**
   * Generate JWT token
   */
  private async generateToken(payload: JWTPayload): Promise<string> {
    return await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(JWT_SECRET);
  }

  /**
   * Log audit event
   */
  private async logAudit(
    userId: string,
    action: (typeof schema.auditLogs.$inferInsert)['action'],
    resourceType: string,
    resourceId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(schema.auditLogs).values({
      id: nanoid(),
      userId,
      action,
      resourceType,
      resourceId,
      details: details ?? null,
      createdAt: new Date().toISOString(),
    });
  }
}

export const authService = new AuthService();
