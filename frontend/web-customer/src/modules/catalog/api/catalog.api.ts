import { apiClient } from '../../../services/api-client';

export function listProducts(params?: Record<string, string | number | boolean>) {
  return apiClient.get('/products', { params });
}
