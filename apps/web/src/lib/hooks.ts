'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// ============================================
// Agency Hooks
// ============================================

export function useAgencies(params?: {
  page?: number;
  limit?: number;
  search?: string;
  jurisdictionLevel?: string;
  state?: string;
}) {
  return useQuery({
    queryKey: ['agencies', params],
    queryFn: async () => {
      const response = await api.getAgencies(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch agencies');
      }
      return { data: response.data || [], pagination: response.pagination };
    },
  });
}

export function useAgency(id: string) {
  return useQuery({
    queryKey: ['agency', id],
    queryFn: async () => {
      const response = await api.getAgency(id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch agency');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useStates() {
  return useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      const response = await api.getStates();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch states');
      }
      return response.data || [];
    },
  });
}

// ============================================
// FOIA Request Hooks
// ============================================

export function useRequests(params?: {
  page?: number;
  limit?: number;
  status?: string;
  agencyId?: string;
  query?: string;
}) {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: async () => {
      const response = await api.getRequests(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch requests');
      }
      return { data: response.data || [], pagination: response.pagination };
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const response = await api.getRequest(id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch request');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      agencyId: string;
      title: string;
      description: string;
      category: string;
      dateRange?: string;
      specificIndividuals?: string;
      expeditedProcessing?: boolean;
      feeWaiverRequested?: boolean;
    }) => {
      const response = await api.createRequest(data);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create request');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ title: string; description: string; status: string }>;
    }) => {
      const response = await api.updateRequest(id, data);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update request');
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', data.id] });
    },
  });
}

// ============================================
// Template Hooks
// ============================================

export function useTemplates(params?: { category?: string }) {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: async () => {
      const response = await api.getTemplates(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch templates');
      }
      return response.data || [];
    },
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      const response = await api.getTemplate(id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch template');
      }
      return response.data;
    },
    enabled: !!id,
  });
}
