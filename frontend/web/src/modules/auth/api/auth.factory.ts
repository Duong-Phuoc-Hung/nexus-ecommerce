import { ApiError, unwrap, type RequestApi } from '../../../lib/axios/http';
import { getSessionUser, saveSession, clearSession } from '../utils/session';
import type { SessionUser, RegisterResult } from '../../user/types/user.types';
export function createAuthApi(request: RequestApi) {
  return {
    getCurrentUser(): SessionUser | null {
      return getSessionUser();
    },
    async register(input: { email: string; fullName: string; password: string }) {
      return unwrap<RegisterResult>(
        await request('/auth/register', { method: 'POST', body: input }),
      );
    },
    async login(email: string, password: string, remember = false) {
      const result = unwrap<{ token: string; user: SessionUser }>(
        await request('/auth/login', { method: 'POST', body: { email, password } }),
      );
      if (!result.token || !result.user?.id || !result.user.role)
        throw new ApiError('Phản hồi đăng nhập thiếu thông tin phiên.');
      saveSession(result.token, result.user, remember);
      return result;
    },
    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        clearSession();
      }
    },
    async getProfile(signal?: AbortSignal) {
      return unwrap<SessionUser>(await request('/users/profile', { signal }));
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
