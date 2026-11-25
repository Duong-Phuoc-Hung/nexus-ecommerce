import { ApiError, unwrap, type RequestApi } from '../../../lib/axios/http';
import { getSessionUser, saveSession, clearSession } from '../utils/session';
import type { SessionUser, RegisterResult } from '../../user/types/user.types';
import { createUserApi } from '../../user/api/user.api';
export function createAuthApi(request: RequestApi) {
  const users = createUserApi(request);
  return {
    getCurrentUser(): SessionUser | null {
      return getSessionUser();
    },
    async register(input: {
      email: string;
      fullName: string;
      password: string;
      phone?: string;
      otp?: string;
    }) {
      return unwrap<RegisterResult>(
        await request('/auth/register', { method: 'POST', body: input }),
      );
    },
    async sendRegistrationOtp(email: string, fullName?: string, phone?: string) {
      return request<{ success: boolean; message: string; devOtp?: string }>('/auth/send-otp', {
        method: 'POST',
        body: { email, fullName, ...(phone ? { phone } : {}) },
      });
    },
    async login(email: string, password: string, remember = true) {
      const result = unwrap<{
        token: string;
        accessToken?: string;
        refreshToken?: string;
        user: SessionUser;
      }>(await request('/auth/login', { method: 'POST', body: { email, password } }));
      const accessToken = result.accessToken || result.token;
      if (!accessToken || !result.user?.id || !result.user.role)
        throw new ApiError('Phản hồi đăng nhập thiếu thông tin phiên.');
      saveSession(accessToken, result.user, remember, result.refreshToken);
      return { ...result, token: accessToken };
    },
    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        clearSession();
      }
    },
    async getProfile(signal?: AbortSignal) {
      return users.getProfile(signal);
    },
    async requestPasswordReset(email: string) {
      return request<{ success: boolean; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
    },
    async resetPassword(token: string, newPassword: string) {
      await request('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
    },
  };
}
