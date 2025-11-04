const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  message: string;
  statusCode?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async fetchWithRefresh<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      credentials: 'include', // CRITICAL: Include cookies for JWT auth
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });

    // If 401 Unauthorized, try to refresh the token
    // But skip refresh for public endpoints (login, register, refresh itself)
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => url.includes(endpoint));

    if (response.status === 401 && !isPublicEndpoint) {
      const refreshResponse = await fetch(`${this.baseURL}/api/v0/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        // Retry the original request
        return this.fetchWithRefresh<T>(url, options);
      } else {
        // Refresh failed, redirect to login (only if not already there)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        statusCode: response.status,
      }));
      throw new Error(error.message || 'API request failed');
    }

    // Handle 204 No Content responses (DELETE operations)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(url: string): Promise<T> {
    return this.fetchWithRefresh<T>(url, { method: 'GET' });
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithRefresh<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithRefresh<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.fetchWithRefresh<T>(url, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_URL);
