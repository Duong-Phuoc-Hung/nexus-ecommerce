import { createAuthApi } from '../../../shared/http';
import { requestApi } from './api-client';
export type { SessionUser as AuthUser } from '../../../shared/http';
export const authApi = createAuthApi(requestApi);
