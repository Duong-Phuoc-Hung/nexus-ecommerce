import { ApiClient } from '../../../shared/api-client';
import type { TokenStorage } from '../../../shared/api-client';
import { adminConfig } from '../configs/admin.config';

const adminTokenStorage: TokenStorage = {
  get: () =>
    typeof window === 'undefined' ? null : window.sessionStorage.getItem('nexus.admin.accessToken'),
  set: (token) => {
    if (typeof window !== 'undefined')
      window.sessionStorage.setItem('nexus.admin.accessToken', token);
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('nexus.admin.accessToken');
      window.sessionStorage.removeItem('nexus.admin.user');
    }
  },
};

const adminClient = new ApiClient(adminConfig.api.baseUrl, adminTokenStorage);

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface AdminLoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    permissions: string[];
  };
}

type AssignableRole = 'BUYER' | 'SELLER' | 'ADMIN';

export interface RolePermission {
  role: string;
  permissions: string[];
}

export const adminApi = {
  async login(email: string, password: string): Promise<AdminLoginResult> {
    const response = await adminClient.request<ApiEnvelope<AdminLoginResult>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    adminClient.setToken(response.data.token);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('nexus.admin.user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  getCurrentUser(): AdminLoginResult['user'] | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.sessionStorage.getItem('nexus.admin.user');
      return stored ? (JSON.parse(stored) as AdminLoginResult['user']) : null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await adminClient.request('/auth/logout', { method: 'POST' });
    } finally {
      adminClient.clearToken();
    }
  },

  async getRoles(): Promise<RolePermission[]> {
    const response = await adminClient.request<ApiEnvelope<RolePermission[]>>('/auth/roles');
    return response.data;
  },

  async assignRole(userId: string, role: AssignableRole): Promise<{ id: string; role: string }> {
    const response = await adminClient.request<ApiEnvelope<{ id: string; role: string }>>(
      `/users/${encodeURIComponent(userId)}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({ role }),
      },
    );
    return response.data;
  },
};
