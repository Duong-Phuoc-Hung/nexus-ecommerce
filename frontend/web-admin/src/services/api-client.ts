import axios from 'axios';
import type { AxiosError } from 'axios';
import { adminConfig } from '../configs/admin.config';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: unknown }>;
    const responseMessage = axiosError.response?.data?.message;
    const message =
      typeof responseMessage === 'string'
        ? responseMessage
        : axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT'
          ? 'The API request timed out. Please try again.'
          : !axiosError.response
            ? 'Unable to reach the API server. Check your connection and API URL.'
            : `The API request failed with status ${axiosError.response.status}.`;

    return {
      message,
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'An unexpected API error occurred.',
  };
}

export const apiClient = axios.create({
  baseURL: adminConfig.api.baseUrl,
  timeout: adminConfig.api.timeoutMs,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);
