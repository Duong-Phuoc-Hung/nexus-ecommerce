import { requestApi } from '../../../lib/axios/api-client';
import { unwrap, type RequestApi } from '../../../lib/axios/http';
import type { AssignableRole, RolePermission } from '../types/role.types';
export function createRolesApi(request: RequestApi) {
  return {
    async getRoles(): Promise<RolePermission[]> {
      return unwrap<RolePermission[]>(await request('/auth/roles'));
    },
    async assignRole(userId: string, role: AssignableRole): Promise<{ id: string; role: string }> {
      return unwrap<{ id: string; role: string }>(
        await request(`/users/${encodeURIComponent(userId)}/role`, {
          method: 'PUT',
          body: { role },
        }),
      );
    },
  };
}
export const rolesApi = createRolesApi(requestApi);
