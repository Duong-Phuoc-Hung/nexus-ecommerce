import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import type { SessionUser } from '../types/user.types';
import type { RequestApi } from '@/lib/axios/http';

export type SupportUser = SessionUser & {
  reputationScore: number;
  ordersCount?: number;
  createdAt: string;
  updatedAt?: string;
};
export type UserPage = {
  items: SupportUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
export type UserQuery = {
  q?: string;
  email?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

function queryString(query: UserQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
}

export function createUserApi(request: RequestApi) {
  return {
    async getProfile(signal?: AbortSignal): Promise<SessionUser> {
      return unwrap<SessionUser>(await request('/users/profile', { signal }));
    },
    async list(query: UserQuery = {}, signal?: AbortSignal): Promise<UserPage> {
      const suffix = queryString(query);
      const raw = await request<{
        success: boolean;
        data: SupportUser[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      }>(`/users${suffix ? `?${suffix}` : ''}`, { signal });
      const items = unwrap<SupportUser[]>(raw);
      const pagination = raw.pagination;
      return {
        items: Array.isArray(items) ? items : [],
        total: raw.total ?? pagination?.total ?? (Array.isArray(items) ? items.length : 0),
        page: raw.page ?? pagination?.page ?? 1,
        limit: raw.limit ?? pagination?.limit ?? (Array.isArray(items) ? items.length : 0),
        totalPages: raw.totalPages ?? pagination?.totalPages ?? 1,
      };
    },
    async getById(id: string, signal?: AbortSignal): Promise<SupportUser> {
      return unwrap<SupportUser>(await request(`/users/${encodeURIComponent(id)}`, { signal }));
    },
  };
}

export const userApi = createUserApi(requestApi);
