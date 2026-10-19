export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};
export type RequestApi = <T>(path: string, options?: RequestOptions) => Promise<T>;
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  reputationScore?: number;
  permissions?: string[];
};
export type RegisterResult = Omit<SessionUser, 'permissions'>;
const sessionEvent = 'nexus:session-change';
export const SESSION_EVENT = sessionEvent;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('nexus.accessToken') || localStorage.getItem('nexus.accessToken');
  } catch {
    return null;
  }
}
export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    for (const name of ['sessionStorage', 'localStorage'] as const) {
      try {
        window[name].removeItem('nexus.accessToken');
        window[name].removeItem('nexus.user');
      } catch {
        /* A blocked storage area must not prevent local sign-out. */
      }
    }
  } finally {
    window.dispatchEvent(new Event(sessionEvent));
  }
}
export function saveSession(token: string, user: SessionUser, remember = false) {
  clearSession();
  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('nexus.accessToken', token);
    storage.setItem('nexus.user', JSON.stringify(user));
  } catch {
    throw new ApiError(
      'Trình duyệt không cho phép lưu phiên đăng nhập. Vui lòng kiểm tra cài đặt lưu trữ.',
    );
  }
  window.dispatchEvent(new Event(sessionEvent));
}
export function safeNextPath(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value))
    return fallback;
  try {
    const u = new URL(value, 'https://nexus.invalid');
    return u.origin === 'https://nexus.invalid' ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const e = error as {
    response?: { status?: number; data?: unknown };
    code?: string;
    message?: string;
  };
  const data = e?.response?.data;
  const body = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const detail =
    typeof body.error === 'object' && body.error !== null
      ? (body.error as Record<string, unknown>)
      : body;
  const raw = detail.fieldErrors ?? body.fieldErrors;
  const fields: Record<string, string> = {};
  if (raw && typeof raw === 'object')
    for (const [key, value] of Object.entries(raw))
      fields[key] = Array.isArray(value) ? value.join('. ') : String(value);
  const message =
    (e?.response?.status ?? 0) >= 500
      ? 'Hệ thống tạm thời chưa xử lý được yêu cầu. Vui lòng thử lại sau.'
      : typeof body.error === 'string'
        ? body.error
        : typeof detail.message === 'string'
          ? detail.message
          : e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT'
            ? 'Kết nối mất quá nhiều thời gian. Vui lòng thử lại.'
            : !e?.response
              ? 'Chưa kết nối được hệ thống. Vui lòng thử lại sau.'
              : e.response.status === 404
                ? 'Không tìm thấy dữ liệu hoặc chức năng này chưa được cung cấp.'
                : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
  return new ApiError(
    message,
    e?.response?.status,
    typeof detail.code === 'string' ? detail.code : e?.code,
    fields,
  );
}
export function userMessage(error: unknown): string {
  return normalizeApiError(error).message;
}
export function unwrap<T>(value: unknown): T {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { success?: boolean }).success !== true ||
    !('data' in value)
  )
    throw new ApiError(
      'Dữ liệu phản hồi chưa đúng định dạng đã thống nhất.',
      undefined,
      'INVALID_RESPONSE',
    );
  return (value as { data: T }).data;
}
export function createAuthApi(request: RequestApi) {
  return {
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
