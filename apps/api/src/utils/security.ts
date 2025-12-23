// ============================================
// FOIA Stream - Security Utilities
// ============================================
// Provides encryption, hashing, and security functions
// for compliance with SOC2, ISO 27001, NIST 800-53

import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Derives an encryption key from a password using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * Returns base64-encoded string: salt:iv:authTag:ciphertext
 */
export async function encryptData(plaintext: string, encryptionKey: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(encryptionKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine salt:iv:authTag:ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts data encrypted with encryptData
 */
export async function decryptData(encryptedData: string, encryptionKey: string): Promise<string> {
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = await deriveKey(encryptionKey, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Hash data using SHA-256 (for non-reversible hashing)
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Mask PII for logging (shows first 2 and last 2 characters)
 */
export function maskPII(data: string): string {
  if (data.length <= 4) {
    return '****';
  }
  return `${data.slice(0, 2)}${'*'.repeat(data.length - 4)}${data.slice(-2)}`;
}

/**
 * Mask email for logging
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts[1];
  if (!domain || !local) return maskPII(email);
  const maskedLocal =
    local.length > 2
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
      : '**';
  return `${maskedLocal}@${domain}`;
}

/**
 * Sanitize object for logging (removes sensitive fields)
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'twoFactorSecret',
    'apiKey',
  ],
): Partial<T> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (key.toLowerCase().includes('email') && typeof value === 'string') {
      sanitized[key] = maskEmail(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as Partial<T>;
}

// Export encryption key getter (should come from env)
export function getEncryptionKey(): string {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('DATA_ENCRYPTION_KEY environment variable is required for encryption');
  }
  return key;
}
