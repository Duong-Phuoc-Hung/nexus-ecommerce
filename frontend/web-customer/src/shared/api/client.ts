import axios from 'axios';

/** Shared HTTP client for frontend modules. Connected to Nexus API Gateway (Port 8000) */
export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8000/api/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Tự động gắn Bearer Token vào các request của axios nếu đã đăng nhập
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
