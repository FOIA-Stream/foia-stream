/**
 * Copyright (c) 2025 Foia Stream
 * QueryProvider Component Tests
 */

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

// Create a test query client with shorter timers for testing
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });
}

describe('QueryProvider', () => {
  it('should provide query context to children', async () => {
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['test'],
          queryFn: () => Promise.resolve({ data: 'test' }),
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ data: 'test' });
  });

  it('should handle query errors', async () => {
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['error-test'],
          queryFn: () => Promise.reject(new Error('Test error')),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should return loading state initially', () => {
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['loading-test'],
          queryFn: () => new Promise((resolve) => setTimeout(() => resolve('data'), 1000)),
        }),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(true);
  });
});

describe('Query Client Configuration', () => {
  it('should create query client with default options', () => {
    const client = createTestQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
  });

  it('should have retry disabled in test client', () => {
    const client = createTestQueryClient();
    const defaultOptions = client.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(false);
  });

  it('should have staleTime of 0 in test client', () => {
    const client = createTestQueryClient();
    const defaultOptions = client.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(0);
  });
});
