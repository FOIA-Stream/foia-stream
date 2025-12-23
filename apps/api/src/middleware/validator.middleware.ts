// ============================================
// FOIA Stream - Effect Schema Validator Middleware
// ============================================

import { ParseResult, Schema as S } from 'effect';
import { validator } from 'hono/validator';
import { ValidationError } from '../utils/errors';

type ValidationTarget = 'json' | 'query' | 'param' | 'header' | 'form';

/**
 * Format Effect Schema parse errors into readable messages
 */
function formatSchemaError(error: ParseResult.ParseError): string {
  const message = ParseResult.TreeFormatter.formatErrorSync(error);
  return message || 'Validation failed';
}

/**
 * Extract field name from parse error if possible
 */
function extractFieldFromError(error: ParseResult.ParseError): string {
  const message = formatSchemaError(error);
  // Try to extract field name from error message patterns like "path: [fieldName]"
  const match = message.match(/└─ \["?([^"|\]]+)"?\]/);
  return match?.[1] || 'unknown';
}

/**
 * Create a ValidationError from Effect ParseResult.ParseError
 */
function createValidationError(
  parseError: ParseResult.ParseError,
  value?: unknown,
): ValidationError {
  const field = extractFieldFromError(parseError);
  const message = formatSchemaError(parseError);
  return new ValidationError(field, message, { value, parseResult: parseError });
}

/**
 * Effect Schema validator middleware for Hono
 * Similar to @hono/zod-validator but uses Effect Schema
 * Uses ValidationError from utils/errors for structured error handling
 */
export function effectValidator<T, I, Target extends ValidationTarget>(
  target: Target,
  schema: S.Schema<T, I>,
) {
  return validator(target, async (value, c) => {
    const result = S.decodeUnknownEither(schema)(value);

    if (result._tag === 'Left') {
      const validationError = createValidationError(result.left, value);
      return c.json(
        {
          success: false,
          error: validationError._tag,
          field: validationError.field,
          message: validationError.message,
          timestamp: validationError.timestamp,
        },
        400,
      );
    }

    return result.right as T;
  });
}

/**
 * Validate JSON body with Effect Schema
 */
export function jsonValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('json', schema);
}

/**
 * Validate query parameters with Effect Schema
 */
export function queryValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('query', schema);
}

/**
 * Validate URL parameters with Effect Schema
 */
export function paramValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('param', schema);
}

/**
 * Validate header parameters with Effect Schema
 */
export function headerValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('header', schema);
}

/**
 * Validate form data with Effect Schema
 */
export function formValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('form', schema);
}

/**
 * Type helper to extract the validated type from a schema
 */
export type InferSchema<T> = T extends S.Schema<infer A, unknown> ? A : never;

// Re-export error utilities for convenience
export { BadRequestError, fromParseError, toHttpResponse, ValidationError } from '../utils/errors';
