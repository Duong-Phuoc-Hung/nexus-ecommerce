import { ApiClient, apiClient } from './api-client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  reputationScore: number;
  permissions: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export type UserProfile = Omit<AuthUser, 'permissions'>;

export interface RegisterInput {
  email: string;
  fullName: string;
  password: string;
}

export function createAuthApi(client: ApiClient = apiClient) {
  return {
    async register(input: RegisterInput): Promise<AuthUser> {
      const response = await client.request<ApiEnvelope<AuthUser>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response.data;
    },

    async login(email: string, password: string): Promise<LoginResult> {
      const response = await client.request<ApiEnvelope<LoginResult>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      client.setToken(response.data.token);
      return response.data;
    },

    async logout(): Promise<void> {
      try {
        await client.request('/auth/logout', { method: 'POST' });
      } finally {
        client.clearToken();
      }
    },

    async getProfile(): Promise<UserProfile> {
      const response = await client.request<ApiEnvelope<UserProfile>>('/users/profile');
      return response.data;
    },

    async requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
      return client.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async resetPassword(token: string, newPassword: string): Promise<void> {
      await client.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },
  };
}

export const authApi = createAuthApi();
