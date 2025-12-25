/**
 * @file Application Constants
 * @module lib/constants
 * @author FOIA Stream Team
 * @description Shared constants, error messages, and reusable schemas
 *              for the FOIA Stream API.
 */

/**
 * Common Zod validation error messages
 * @constant
 */
export const ZOD_ERROR_MESSAGES = {
  REQUIRED: 'Required',
  EXPECTED_NUMBER: 'Invalid input: expected number, received NaN',
  NO_UPDATES: 'No updates provided',
  EXPECTED_STRING: 'Invalid input: expected string, received undefined',
  INVALID_EMAIL: 'Invalid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  INVALID_UUID: 'Invalid UUID format',
} as const;

/**
 * Custom Zod error codes
 * @constant
 */
export const ZOD_ERROR_CODES = {
  INVALID_UPDATES: 'invalid_updates',
  INVALID_CREDENTIALS: 'invalid_credentials',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
} as const;

/**
 * HTTP Status phrases for responses
 * @constant
 */
export * as HttpStatusCodes from 'stoker/http-status-codes';
export * as HttpStatusPhrases from 'stoker/http-status-phrases';
