/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file Effect Schema Definitions for DSA Module
 * @module dsa/schemas
 * @author FOIA Stream Team
 * @description Effect Schema validation schemas for data structure configurations
 *              and inputs. Provides type-safe validation at runtime.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

import { Schema as S } from 'effect';

// ============================================
// Trie Schemas
// ============================================

/**
 * Schema for Trie configuration options
 */
export const TrieOptionsSchema = S.Struct({
  /** Whether to make searches case-insensitive (default: true) */
  caseInsensitive: S.optional(S.Boolean),
  /** Maximum results to return from search (default: 10) */
  maxResults: S.optional(
    S.Number.pipe(
      S.int({ message: () => 'maxResults must be an integer' }),
      S.positive({ message: () => 'maxResults must be positive' }),
    ),
  ),
});
export type TrieOptions = S.Schema.Type<typeof TrieOptionsSchema>;

/**
 * Schema for Trie insert input
 */
export const TrieInsertSchema = S.Struct({
  /** Word to insert (non-empty string) */
  word: S.String.pipe(S.minLength(1, { message: () => 'Word cannot be empty' })),
});
export type TrieInsert = S.Schema.Type<typeof TrieInsertSchema>;

/**
 * Schema for Trie search input
 */
export const TrieSearchSchema = S.Struct({
  /** Prefix to search for */
  prefix: S.String,
  /** Maximum results to return */
  limit: S.optional(
    S.Number.pipe(
      S.int({ message: () => 'limit must be an integer' }),
      S.positive({ message: () => 'limit must be positive' }),
    ),
  ),
});
export type TrieSearch = S.Schema.Type<typeof TrieSearchSchema>;

// ============================================
// Priority Queue Schemas
// ============================================

/**
 * Schema for Priority Queue configuration options
 */
export const PriorityQueueOptionsSchema = S.Struct({
  /** Initial capacity for the underlying array */
  initialCapacity: S.optional(
    S.Number.pipe(
      S.int({ message: () => 'initialCapacity must be an integer' }),
      S.positive({ message: () => 'initialCapacity must be positive' }),
    ),
  ),
});
export type PriorityQueueOptions = S.Schema.Type<typeof PriorityQueueOptionsSchema>;

/**
 * Schema for FOIA Request priority item
 */
export const FOIARequestPrioritySchema = S.Struct({
  /** Request ID */
  id: S.String.pipe(S.minLength(1, { message: () => 'Request ID is required' })),
  /** Due date as ISO string or Date */
  dueDate: S.Union(S.String, S.DateFromSelf),
  /** Priority level (1-5, 1 being highest) */
  priority: S.optional(
    S.Number.pipe(
      S.int({ message: () => 'Priority must be an integer' }),
      S.greaterThanOrEqualTo(1, { message: () => 'Priority must be at least 1' }),
      S.lessThanOrEqualTo(5, { message: () => 'Priority must be at most 5' }),
    ),
  ),
  /** Request title */
  title: S.optional(S.String),
  /** Agency ID */
  agencyId: S.optional(S.String),
});
export type FOIARequestPriority = S.Schema.Type<typeof FOIARequestPrioritySchema>;

// ============================================
// Rabin-Karp Schemas
// ============================================

/**
 * Schema for Rabin-Karp search options
 */
export const RabinKarpOptionsSchema = S.Struct({
  /** Whether to perform case-insensitive search (default: false) */
  caseInsensitive: S.optional(S.Boolean),
  /** Maximum number of matches to return (default: unlimited) */
  maxMatches: S.optional(
    S.Number.pipe(
      S.int({ message: () => 'maxMatches must be an integer' }),
      S.positive({ message: () => 'maxMatches must be positive' }),
    ),
  ),
  /** Include line/column information (default: true) */
  includeLineInfo: S.optional(S.Boolean),
});
export type RabinKarpOptions = S.Schema.Type<typeof RabinKarpOptionsSchema>;

/**
 * Schema for Rabin-Karp search input
 */
export const RabinKarpSearchSchema = S.Struct({
  /** Text to search in */
  text: S.String.pipe(S.minLength(1, { message: () => 'Text cannot be empty' })),
  /** Pattern to search for */
  pattern: S.String.pipe(S.minLength(1, { message: () => 'Pattern cannot be empty' })),
});
export type RabinKarpSearch = S.Schema.Type<typeof RabinKarpSearchSchema>;

/**
 * Schema for multi-pattern search input
 */
export const RabinKarpMultiSearchSchema = S.Struct({
  /** Text to search in */
  text: S.String.pipe(S.minLength(1, { message: () => 'Text cannot be empty' })),
  /** Patterns to search for */
  patterns: S.Array(
    S.String.pipe(S.minLength(1, { message: () => 'Pattern cannot be empty' })),
  ).pipe(S.minItems(1, { message: () => 'At least one pattern is required' })),
});
export type RabinKarpMultiSearch = S.Schema.Type<typeof RabinKarpMultiSearchSchema>;

// ============================================
// Graph Schemas
// ============================================

/**
 * Schema for Graph configuration options
 */
export const GraphOptionsSchema = S.Struct({
  /** Whether the graph is directed (default: true) */
  directed: S.optional(S.Boolean),
});
export type GraphOptions = S.Schema.Type<typeof GraphOptionsSchema>;

/**
 * Schema for adding an edge
 */
export const GraphEdgeSchema = S.Struct({
  /** Source vertex */
  source: S.String.pipe(S.minLength(1, { message: () => 'Source vertex is required' })),
  /** Target vertex */
  target: S.String.pipe(S.minLength(1, { message: () => 'Target vertex is required' })),
  /** Edge weight (default: 1) */
  weight: S.optional(S.Number.pipe(S.finite({ message: () => 'Weight must be a finite number' }))),
});
export type GraphEdge = S.Schema.Type<typeof GraphEdgeSchema>;

/**
 * Schema for vertex identifier
 */
export const VertexIdSchema = S.String.pipe(
  S.minLength(1, { message: () => 'Vertex ID cannot be empty' }),
);
export type VertexId = S.Schema.Type<typeof VertexIdSchema>;

// ============================================
// Agency-specific Schemas
// ============================================

/**
 * Schema for agency autocomplete data
 */
export const AgencyAutocompleteDataSchema = S.Struct({
  /** Agency ID */
  id: S.String.pipe(S.minLength(1)),
  /** Agency name */
  name: S.String.pipe(S.minLength(1)),
  /** Agency abbreviation */
  abbreviation: S.optional(S.NullOr(S.String)),
  /** Jurisdiction level */
  jurisdictionLevel: S.Literal('federal', 'state', 'local', 'county'),
  /** State code (for state/local agencies) */
  state: S.optional(S.NullOr(S.String)),
});
export type AgencyAutocompleteData = S.Schema.Type<typeof AgencyAutocompleteDataSchema>;

/**
 * Schema for agency hierarchy node
 */
export const AgencyHierarchyNodeSchema = S.Struct({
  /** Agency ID */
  id: S.String.pipe(S.minLength(1)),
  /** Parent agency ID (null for root) */
  parentId: S.NullOr(S.String),
  /** Agency name */
  name: S.String.pipe(S.minLength(1)),
  /** Children agency IDs */
  children: S.optional(S.Array(S.String)),
});
export type AgencyHierarchyNode = S.Schema.Type<typeof AgencyHierarchyNodeSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Validates input against a schema and returns the decoded value
 * @param schema - Effect Schema to validate against
 * @param input - Input to validate
 * @returns Decoded and validated value
 * @throws ParseError if validation fails
 */
export function validate<A, I>(schema: S.Schema<A, I>, input: unknown): A {
  return S.decodeUnknownSync(schema)(input);
}

/**
 * Safely validates input against a schema, returning Either
 * @param schema - Effect Schema to validate against
 * @param input - Input to validate
 * @returns Either with error or validated value
 */
export function validateSafe<A, I>(
  schema: S.Schema<A, I>,
  input: unknown,
): { success: true; data: A } | { success: false; error: string } {
  try {
    const data = S.decodeUnknownSync(schema)(input);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    return { success: false, error: message };
  }
}

/**
 * Creates a validator function for a schema
 * @param schema - Effect Schema to create validator for
 * @returns Validator function
 */
export function createValidator<A, I>(schema: S.Schema<A, I>): (input: unknown) => A {
  return (input: unknown) => S.decodeUnknownSync(schema)(input);
}
