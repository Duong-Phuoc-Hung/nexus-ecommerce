import axios from 'axios';

/** Shared HTTP client for admin modules; the app can start without an API server. */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});
