import { API_BASE } from './config';

// ============================================
// API Client Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organization?: string | null;
  isVerified: boolean;
  isAnonymous: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Agency {
  id: string;
  name: string;
  abbreviation: string;
  jurisdictionLevel: 'federal' | 'state' | 'local' | 'county';
  state?: string | null;
  city?: string | null;
  county?: string | null;
  foiaEmail?: string | null;
  foiaUrl?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  responseDeadlineDays?: number | null;
  appealDeadlineDays?: number | null;
}

export interface FoiaRequest {
  id: string;
  userId: string;
  agencyId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  dateRange?: string | null;
  specificIndividuals?: string | null;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  dueDate?: string | null;
  closedAt?: string | null;
  trackingNumber?: string | null;
  expeditedProcessing: boolean;
  feeWaiverRequested: boolean;
  estimatedFee?: number | null;
  actualFee?: number | null;
  createdAt: string;
  updatedAt: string;
  agency?: Agency;
}

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  content: string;
  variables: string[];
  isPublic: boolean;
}

// ============================================
// API Client Class
// ============================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
        };
      }

      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // ============================================
  // Auth Endpoints
  // ============================================

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organization?: string;
    role?: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // ============================================
  // Agency Endpoints
  // ============================================

  async getAgencies(params?: {
    page?: number;
    limit?: number;
    search?: string;
    jurisdictionLevel?: string;
    state?: string;
  }): Promise<ApiResponse<Agency[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.jurisdictionLevel) searchParams.set('jurisdictionLevel', params.jurisdictionLevel);
    if (params?.state) searchParams.set('state', params.state);

    const query = searchParams.toString();
    return this.request<Agency[]>(`/agencies${query ? `?${query}` : ''}`);
  }

  async getAgency(id: string): Promise<ApiResponse<Agency>> {
    return this.request<Agency>(`/agencies/${id}`);
  }

  async getStates(): Promise<ApiResponse<{ code: string; name: string }[]>> {
    return this.request<{ code: string; name: string }[]>('/agencies/states');
  }

  // ============================================
  // FOIA Request Endpoints
  // ============================================

  async getRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    agencyId?: string;
    query?: string;
  }): Promise<ApiResponse<FoiaRequest[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.agencyId) searchParams.set('agencyId', params.agencyId);
    if (params?.query) searchParams.set('query', params.query);

    const query = searchParams.toString();
    return this.request<FoiaRequest[]>(`/requests${query ? `?${query}` : ''}`);
  }

  async getRequest(id: string): Promise<ApiResponse<FoiaRequest>> {
    return this.request<FoiaRequest>(`/requests/${id}`);
  }

  async createRequest(data: {
    agencyId: string;
    title: string;
    description: string;
    category: string;
    dateRange?: string;
    specificIndividuals?: string;
    expeditedProcessing?: boolean;
    feeWaiverRequested?: boolean;
  }): Promise<ApiResponse<FoiaRequest>> {
    return this.request<FoiaRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRequest(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      status: string;
    }>,
  ): Promise<ApiResponse<FoiaRequest>> {
    return this.request<FoiaRequest>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Template Endpoints
  // ============================================

  async getTemplates(params?: { category?: string }): Promise<ApiResponse<Template[]>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);

    const query = searchParams.toString();
    return this.request<Template[]>(`/templates${query ? `?${query}` : ''}`);
  }

  async getTemplate(id: string): Promise<ApiResponse<Template>> {
    return this.request<Template>(`/templates/${id}`);
  }
}

// Export singleton instance
export const api = new ApiClient();
