import axios from 'axios';
import type { AxiosError } from 'axios';
import { appConfig } from '../configs/app.config';
import { ApiClient, ApiError } from '../../../shared/api-client';

export { ApiClient, ApiError };
export type { TokenStorage } from '../../../shared/api-client';

export const authApiClient = new ApiClient(appConfig.api.baseUrl);

export const apiClient = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeoutMs,
});

if (typeof window !== 'undefined') {
  apiClient.interceptors.request.use((config) => {
    const token =
      window.localStorage?.getItem('nexus.accessToken') ||
      window.sessionStorage?.getItem('nexus.accessToken');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: unknown; error?: unknown }>;
    const responseData = axiosError.response?.data;
    const responseMessage =
      typeof responseData === 'object' && responseData !== null
        ? String(responseData.message || responseData.error || '')
        : undefined;
    const message =
      responseMessage ||
      (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT'
        ? 'The API request timed out. Please try again.'
        : !axiosError.response
          ? 'Unable to reach the API server. Check your connection and API URL.'
          : `The API request failed with status ${axiosError.response.status}.`);

    return new ApiError(
      message,
      axiosError.response?.status,
      axiosError.code,
      axiosError.response?.data,
    );
  }

  return new ApiError(error instanceof Error ? error.message : 'An unexpected API error occurred.');
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);
