/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Form utilities and Zod schemas for TanStack Form
 * @module lib/form-utils
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> <explanation> */

import type { ReactNode } from 'react';
import { z } from 'zod';

// ============================================
// Zod Validation Schemas
// ============================================

/**
 * Email validation schema
 */
const emailSchema = z.string().email('Please enter a valid email address');

/**
 * Password validation schema with security requirements
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Simple password schema for login (less strict, just checks presence)
 */
const loginPasswordSchema = z.string().min(1, 'Password is required');

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form schema
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    organization: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * New FOIA request form schema
 */
export const newRequestSchema = z
  .object({
    agencyId: z.string().min(1, 'Please select an agency'),
    category: z.string().min(1, 'Please select a category'),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(10000, 'Description must be less than 10,000 characters'),
    dateRangeStart: z.string(),
    dateRangeEnd: z.string(),
    templateId: z.string(),
    isPublic: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.dateRangeStart && data.dateRangeEnd) {
        return new Date(data.dateRangeStart) <= new Date(data.dateRangeEnd);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['dateRangeEnd'],
    },
  );

export type NewRequestFormData = z.infer<typeof newRequestSchema>;

// ============================================
// Form Field Components
// ============================================

/**
 * Props for form field wrapper
 */
interface FieldWrapperProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  hint?: string;
}

/**
 * Consistent styling for form field labels
 */
export const labelClass = 'block text-sm font-medium text-surface-300';

/**
 * Consistent styling for form inputs
 */
export const inputClass =
  'mt-2 block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

/**
 * Consistent styling for form inputs with error state
 */
export const inputErrorClass =
  'mt-2 block w-full rounded-lg border border-red-500 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400';

/**
 * Field wrapper component that provides consistent layout and error display
 */
export function FieldWrapper({
  label,
  htmlFor,
  required,
  error,
  children,
  hint,
}: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {!required && <span className="text-surface-500 ml-1">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-surface-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Get the first error message from a field
 */
export function getFieldError(field: any): string | undefined {
  if (field.state.meta.isTouched && field.state.meta.errors.length > 0) {
    const firstError = field.state.meta.errors[0];
    // Handle both string errors and Zod error objects
    if (typeof firstError === 'string') {
      return firstError;
    }
    if (firstError && typeof firstError === 'object' && 'message' in firstError) {
      return (firstError as { message: string }).message;
    }
  }
  return undefined;
}

/**
 * Check if a field has errors
 */
export function hasFieldError(field: any): boolean {
  return field.state.meta.isTouched && field.state.meta.errors.length > 0;
}

/**
 * Get input class based on error state
 */
export function getInputClass(field: any): string {
  return hasFieldError(field) ? inputErrorClass : inputClass;
}

/**
 * Check if form can be submitted
 */
export function canSubmit(form: any): boolean {
  return form.state.canSubmit && !form.state.isSubmitting;
}
