import axios from 'axios';
import { appConfig } from '../configs/app.config';
import { clearSession, getToken, normalizeApiError, type RequestApi } from '../../../shared/http';
export { ApiError } from '../../../shared/http';
export const apiClient = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeoutMs,
});
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalized = normalizeApiError(error);
    if (normalized.status === 401) clearSession();
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
    signal: options.signal,
  });
  return response.data;
};
