import { ApiClient } from '../../../shared/api-client';
import type { TokenStorage } from '../../../shared/api-client';

const adminTokenStorage: TokenStorage = {
  get: () =>
    typeof window === 'undefined' ? null : window.sessionStorage.getItem('nexus.admin.accessToken'),
  set: (token) => {
    if (typeof window !== 'undefined')
      window.sessionStorage.setItem('nexus.admin.accessToken', token);
  },
  clear: () => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem('nexus.admin.accessToken');
  },
};

const adminClient = new ApiClient('http://localhost:4000/api/v1', adminTokenStorage);

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
    return response.data;
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
