/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Document Route Handlers
 * @module routes/documents/handlers
 * @description Handler implementations for document management endpoints.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */

import { env } from '@/config/env';
import { db } from '@/db';
import { customRedactionTemplates, documentAccessLog, secureDocuments } from '@/db/schema';
import { HttpStatusCodes } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { handleRouteError } from '@/lib/responses';
import type { AppRouteHandler } from '@/lib/types';
import { mfaService } from '@/services/auth/mfa.service';
import {
  autoRedactionService,
  type RedactionPattern,
  type ScanResult,
} from '@/services/documents/auto-redaction.service';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  createRedactionTemplateRoute,
  deleteDocumentRoute,
  getDocumentRoute,
  listDocumentsRoute,
  listRedactionTemplatesRoute,
  redactTextRoute,
  verifyMfaRoute,
  verifyPasswordRoute,
} from './documents.routes';

// ============================================
// Helpers
// ============================================

async function ensureUploadDir(): Promise<string> {
  const uploadDir = join(process.cwd(), 'uploads', 'documents');
  await mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

async function logAccess(
  documentId: string,
  userId: string,
  accessType: 'view' | 'download' | 'preview_redaction' | 'apply_redaction' | 'share' | 'delete',
  mfaVerified: boolean,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(documentAccessLog).values({
      id: randomUUID(),
      documentId,
      userId,
      accessType,
      mfaVerified,
      ipAddress,
      userAgent,
      metadata,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error, documentId, userId, accessType }, 'Failed to log document access');
  }
}

// ============================================
// Document CRUD Handlers
// ============================================

/**
 * List user's documents
 */
export const listDocuments: AppRouteHandler<typeof listDocumentsRoute> = async (c) => {
  try {
    const { userId } = c.get('user');

    const userDocuments = await db
      .select({
        id: secureDocuments.id,
        originalFileName: secureDocuments.originalFileName,
        fileSize: secureDocuments.fileSize,
        mimeType: secureDocuments.mimeType,
        status: secureDocuments.status,
        requiresMfa: secureDocuments.requiresMfa,
        hasPassword: secureDocuments.accessPasswordHash,
        expiresAt: secureDocuments.expiresAt,
        accessCount: secureDocuments.accessCount,
        lastAccessedAt: secureDocuments.lastAccessedAt,
        createdAt: secureDocuments.createdAt,
      })
      .from(secureDocuments)
      .where(eq(secureDocuments.uploadedBy, userId))
      .orderBy(desc(secureDocuments.createdAt));

    return c.json(
      {
        success: true as const,
        data: userDocuments.map((doc) => ({
          ...doc,
          hasPassword: !!doc.hasPassword,
        })),
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Failed to list documents' },
      'Document list error',
    );
    return handleRouteError(
      c,
      error,
      'Failed to list documents',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Get document details
 */
export const getDocument: AppRouteHandler<typeof getDocumentRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json(
        { success: false as const, error: 'Document not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.json(
      {
        success: true as const,
        data: {
          id: document.id,
          originalFileName: document.originalFileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          status: document.status,
          virusScan: document.virusScanResult
            ? {
                isSafe: document.virusScanResult.isSafe ?? false,
                scanned: !!document.virusScanResult.scannedAt,
                message: document.virusScanResult.status,
              }
            : null,
          requiresMfa: document.requiresMfa,
          hasPassword: !!document.accessPasswordHash,
          expiresAt: document.expiresAt,
          accessCount: document.accessCount,
          lastAccessedAt: document.lastAccessedAt,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Failed to get document' },
      'Document get error',
    );
    return handleRouteError(
      c,
      error,
      'Failed to get document',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Delete document
 */
export const deleteDocument: AppRouteHandler<typeof deleteDocumentRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json(
        { success: false as const, error: 'Document not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    // Delete file
    const uploadDir = await ensureUploadDir();
    const filePath = join(uploadDir, document.filePath);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted
    }

    // Delete database record
    await db.delete(secureDocuments).where(eq(secureDocuments.id, documentId));

    // Log deletion
    await logAccess(
      documentId,
      userId,
      'delete',
      false,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
    );

    logger.info({ documentId, userId }, 'Document deleted');
    return c.json(
      { success: true as const, message: 'Document deleted successfully' },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      'Document delete error',
    );
    return handleRouteError(c, error, 'Delete failed', HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// ============================================
// Access Verification Handlers
// ============================================

/**
 * Verify MFA for document access
 */
export const verifyMfa: AppRouteHandler<typeof verifyMfaRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');
    const { code } = c.req.valid('json');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json(
        { success: false as const, error: 'Document not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    if (!document.requiresMfa) {
      return c.json(
        { success: false as const, error: 'MFA not required for this document' },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Verify MFA code
    const mfaResult = await mfaService.verifyMFA(userId, code);
    if (!mfaResult.success) {
      return c.json(
        { success: false as const, error: 'Invalid MFA code' },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    // Generate access token
    const { sign } = await import('hono/jwt');
    const accessToken = await sign(
      {
        documentId,
        userId,
        mfaVerified: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      env.JWT_SECRET,
    );

    await logAccess(
      documentId,
      userId,
      'view',
      true,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
      { action: 'mfa_verified' },
    );

    return c.json(
      { success: true as const, data: { accessToken, expiresIn: 3600 } },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'MFA verification failed' },
      'MFA verification error',
    );
    return handleRouteError(
      c,
      error,
      'MFA verification failed',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Verify password for document access
 */
export const verifyPassword: AppRouteHandler<typeof verifyPasswordRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');
    const { password } = c.req.valid('json');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json(
        { success: false as const, error: 'Document not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    if (!document.accessPasswordHash) {
      return c.json(
        { success: false as const, error: 'Password not required for this document' },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Verify password
    const { verifyPassword: verifyPwd } = await import('@/services/auth/password.service');
    const isValid = await verifyPwd(password, document.accessPasswordHash);
    if (!isValid) {
      return c.json(
        { success: false as const, error: 'Invalid password' },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    // Generate access token
    const { sign } = await import('hono/jwt');
    const accessToken = await sign(
      {
        documentId,
        userId,
        passwordVerified: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      env.JWT_SECRET,
    );

    await logAccess(
      documentId,
      userId,
      'view',
      false,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
      { action: 'password_verified' },
    );

    return c.json(
      { success: true as const, data: { accessToken, expiresIn: 3600 } },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Password verification failed' },
      'Password verification error',
    );
    return handleRouteError(
      c,
      error,
      'Password verification failed',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

// ============================================
// Redaction Template Handlers
// ============================================

/**
 * List redaction templates
 */
export const listRedactionTemplates: AppRouteHandler<typeof listRedactionTemplatesRoute> = async (
  c,
) => {
  try {
    const { userId } = c.get('user');

    // Get system templates
    const systemTemplates = autoRedactionService.getTemplates();

    // Get user's custom templates
    const userTemplates = await db
      .select()
      .from(customRedactionTemplates)
      .where(eq(customRedactionTemplates.userId, userId));

    return c.json(
      {
        success: true as const,
        data: {
          systemTemplates: systemTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            patterns: t.patterns,
            isShared: false,
          })),
          customTemplates: userTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            patterns: t.patterns as RedactionPattern[],
            isShared: t.isShared,
            createdAt: t.createdAt,
          })),
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Failed to list templates' },
      'Template list error',
    );
    return handleRouteError(
      c,
      error,
      'Failed to list templates',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Create custom redaction template
 */
export const createRedactionTemplate: AppRouteHandler<typeof createRedactionTemplateRoute> = async (
  c,
) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');

    const templateId = randomUUID();
    const now = new Date().toISOString();

    await db.insert(customRedactionTemplates).values({
      id: templateId,
      userId: userId,
      name: data.name,
      description: data.description || undefined,
      category: data.category || undefined,
      patterns: data.patterns,
      isShared: data.isShared || false,
      createdAt: now,
      updatedAt: now,
    });

    logger.info({ templateId, userId }, 'Custom redaction template created');

    return c.json(
      {
        success: true as const,
        data: {
          id: templateId,
          name: data.name,
          description: data.description || null,
          category: data.category || null,
          patterns: data.patterns,
          isShared: data.isShared || false,
          createdAt: now,
        },
      },
      HttpStatusCodes.CREATED,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      'Template creation error',
    );
    return handleRouteError(
      c,
      error,
      'Failed to create template',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Redact text using patterns
 */
export const redactText: AppRouteHandler<typeof redactTextRoute> = async (c) => {
  try {
    const data = c.req.valid('json');

    // Use scanText with either template or specific patterns
    let result: ScanResult | null;
    if (data.templateId) {
      result = autoRedactionService.scanWithTemplate(data.text, data.templateId);
      if (!result) {
        return c.json(
          { success: false as const, error: `Template '${data.templateId}' not found` },
          HttpStatusCodes.BAD_REQUEST,
        );
      }
    } else if (data.patternIds && data.patternIds.length > 0) {
      result = autoRedactionService.scanText(data.text, data.patternIds);
    } else {
      result = autoRedactionService.scanText(data.text, 'all');
    }

    return c.json(
      {
        success: true as const,
        data: {
          originalText: data.text,
          redactedText: result.redactedText,
          redactionsApplied: result.totalMatches,
          patternsMatched: result.patternsUsed,
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Text redaction failed' },
      'Text redaction error',
    );
    return handleRouteError(
      c,
      error,
      'Text redaction failed',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

// ============================================
// Upload Handlers
// ============================================

import { pdfService } from '@/services/documents/pdf.service';
import { virusTotalService } from '@/services/documents/virustotal.service';

import type { uploadPdfRoute, uploadStatusRoute, validatePdfRoute } from './documents.routes';

const MAX_FILE_SIZE = Math.min(env.MAX_FILE_SIZE, 50 * 1024 * 1024);

/**
 * Upload and scan a PDF file
 */
export const uploadPdf: AppRouteHandler<typeof uploadPdfRoute> = async (c) => {
  try {
    const contentType = c.req.header('Content-Type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return c.json(
        { success: false as const, error: 'Request must be multipart/form-data' },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json(
        { success: false as const, error: 'Please provide a file in the "file" field' },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        { success: false as const, error: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    if (file.type !== 'application/pdf') {
      return c.json(
        { success: false as const, error: 'Only PDF files are allowed' },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const scanResult = await pdfService.scanPDFAsync(buffer, file.name);

    return c.json(
      {
        success: scanResult.safe,
        filename: file.name,
        size: file.size,
        hash: scanResult.virusScan.hash,
        scan: {
          safe: scanResult.safe,
          canProcess: scanResult.canProcess,
          message: scanResult.message,
          validation: {
            valid: scanResult.validation.valid,
            isEncrypted: scanResult.validation.isEncrypted,
            hasJavaScript: scanResult.validation.hasJavaScript,
            hasEmbeddedFiles: scanResult.validation.hasEmbeddedFiles,
            version: scanResult.validation.version ?? null,
            warnings: [...scanResult.validation.warnings],
            errors: [...scanResult.validation.errors],
          },
          virusScan: {
            scanned: scanResult.virusScan.scanned,
            safe: scanResult.virusScan.safe,
            message: scanResult.virusScan.message,
          },
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      'PDF upload error',
    );
    return handleRouteError(c, error, 'Upload failed', HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Validate a PDF without virus scanning
 */
export const validatePdf: AppRouteHandler<typeof validatePdfRoute> = async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json(
        { success: false as const, error: 'Please provide a file in the "file" field' },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await pdfService.validatePDFAsync(buffer);
    const hash = virusTotalService.calculateSHA256(buffer);

    return c.json(
      {
        success: validation.valid,
        filename: file.name,
        hash,
        validation: {
          ...validation,
          version: validation.version ?? null,
          warnings: [...validation.warnings],
          errors: [...validation.errors],
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Validation failed' },
      'PDF validation error',
    );
    return handleRouteError(c, error, 'Validation failed', HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get upload configuration status
 */
export const uploadStatus: AppRouteHandler<typeof uploadStatusRoute> = async (c) => {
  return c.json(
    {
      virusTotalConfigured: virusTotalService.isConfigured(),
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
      supportedTypes: ['application/pdf'],
    },
    200,
  );
};
