import axios, { type AxiosRequestConfig } from 'axios';
import { appConfig } from '../../configs/app.config';
import {
  clearSession,
  getRefreshToken,
  getSessionUser,
  getToken,
  isSessionRemembered,
  saveSession,
} from '../../modules/auth/utils/session';
import { normalizeApiError, type RequestApi } from './http';
import type { SessionUser } from '../../modules/user/types/user.types';
export { ApiError } from './http';

export const apiClient = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeoutMs,
});

function decodeJwtExpMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}

let inFlightRefresh: Promise<string | null> | null = null;

export async function refreshAccessTokenIfNeeded(force = false): Promise<string | null> {
  const currentToken = getToken();
  const refreshToken = getRefreshToken();

  if (!force && currentToken) {
    const expMs = decodeJwtExpMs(currentToken);
    // Còn hạn trên 90 giây thì không cần làm mới
    if (expMs && expMs - Date.now() > 90_000) {
      return currentToken;
    }
  }

  if (!refreshToken) {
    return force ? null : currentToken;
  }

  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const response = await axios.post(
        `${appConfig.api.baseUrl}/auth/refresh`,
        { refreshToken },
        { timeout: appConfig.api.timeoutMs },
      );
      const data = response.data?.data;
      const nextToken: string | undefined = data?.accessToken || data?.token;
      const nextRefresh: string | undefined = data?.refreshToken || refreshToken;
      const nextUser: SessionUser | null = data?.user || getSessionUser();
      if (nextToken && nextUser) {
        saveSession(nextToken, nextUser, isSessionRemembered(), nextRefresh);
        return nextToken;
      }
      return null;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        clearSession();
        return null;
      }
      // Lỗi mạng tạm thời: giữ nguyên phiên hiện tại, không tự logout
      return getToken();
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

function isPublicAuthPath(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((p) => url === p || url.startsWith(`${p}?`));
}

apiClient.interceptors.request.use(async (config) => {
  if (!isPublicAuthPath(config.url)) {
    const current = getToken();
    const expMs = decodeJwtExpMs(current);
    if (current && expMs && expMs - Date.now() <= 60_000 && getRefreshToken()) {
      await refreshAccessTokenIfNeeded(false);
    }
  }
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const rawErr = error as {
      config?: AxiosRequestConfig & { _retryAfterRefresh?: boolean };
      response?: { status?: number };
    };
    const originalConfig = rawErr?.config;
    const status = rawErr?.response?.status;

    if (
      status === 401 &&
      originalConfig &&
      !originalConfig._retryAfterRefresh &&
      !isPublicAuthPath(originalConfig.url)
    ) {
      originalConfig._retryAfterRefresh = true;
      const refreshedToken = await refreshAccessTokenIfNeeded(true);
      if (refreshedToken) {
        originalConfig.headers = {
          ...(originalConfig.headers || {}),
          Authorization: `Bearer ${refreshedToken}`,
        };
        return apiClient.request(originalConfig);
      }
      clearSession();
    }

    const normalized = normalizeApiError(error);
    return Promise.reject(normalized);
  },
);

export const requestApi: RequestApi = async (path, options = {}) => {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new Error('API paths must be relative.');
  const response = await apiClient.request({
    url: path,
    method: options.method || 'GET',
    data: options.body,
    headers: options.headers,
    signal: options.signal,
  });
  return response.data;
};
