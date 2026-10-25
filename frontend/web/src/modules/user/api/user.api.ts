import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import type { SessionUser } from '../types/user.types';
import type { RequestApi } from '@/lib/axios/http';

export function createUserApi(request: RequestApi) {
  return {
    async getProfile(signal?: AbortSignal): Promise<SessionUser> {
      return unwrap<SessionUser>(await request('/users/profile', { signal }));
    },
  };
}

export const userApi = createUserApi(requestApi);
