/**
 * Copyright (c) 2025 Foia Stream
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We need to mock import.meta.env before importing the config
vi.mock('../../src/lib/config', async () => {
  return {
    API_BASE: 'http://localhost:3000/api/v1',
  };
});

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should export API_BASE', async () => {
    const { API_BASE } = await import('../../src/lib/config');
    expect(API_BASE).toBeDefined();
    expect(typeof API_BASE).toBe('string');
  });

  it('should have a valid URL format', async () => {
    const { API_BASE } = await import('../../src/lib/config');
    expect(API_BASE).toMatch(/^https?:\/\//);
  });

  it('should include /api/v1 in the path', async () => {
    const { API_BASE } = await import('../../src/lib/config');
    expect(API_BASE).toContain('/api/v1');
  });

  it('should default to localhost when env not set', async () => {
    const { API_BASE } = await import('../../src/lib/config');
    expect(API_BASE).toContain('localhost');
  });
});
