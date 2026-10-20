import assert from 'node:assert/strict';
import test from 'node:test';
import { createRolesApi } from './roles.api';
import type { RequestApi, RequestOptions } from '../../../lib/axios/http';
test('role list keeps the existing endpoint and response envelope', async () => {
  const expected = [{ role: 'BUYER', permissions: ['VIEW_PRODUCTS'] }];
  const request: RequestApi = async <T>(path: string) => {
    assert.equal(path, '/auth/roles');
    return { success: true, data: expected } as T;
  };
  assert.deepEqual(await createRolesApi(request).getRoles(), expected);
});
test('role assignment keeps PUT, encoded user ID and JSON body', async () => {
  const request: RequestApi = async <T>(path: string, options?: RequestOptions) => {
    assert.equal(path, '/users/id%2Fwith%20space/role');
    assert.equal(options?.method, 'PUT');
    assert.deepEqual(options?.body, { role: 'SELLER' });
    return { success: true, data: { id: 'id/with space', role: 'SELLER' } } as T;
  };
  assert.equal(
    (await createRolesApi(request).assignRole('id/with space', 'SELLER')).role,
    'SELLER',
  );
});
