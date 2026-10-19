import { createAuthApi } from './auth.factory';
import { requestApi } from '../../../lib/axios/api-client';
export type { SessionUser as AuthUser } from '../../user/types/user.types';
export const authApi = createAuthApi(requestApi);
