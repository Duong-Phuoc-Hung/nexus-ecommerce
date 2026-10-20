import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { AxiosError, type AxiosResponse } from 'axios';
import { apiClient } from '../../../lib/axios/api-client';
import { authApi } from './auth.api';
import { getToken } from '../utils/session';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  };
}
beforeEach(() => {
  const sessionStorage = memoryStorage(),
    localStorage = memoryStorage();
  Object.assign(globalThis, {
    sessionStorage,
    localStorage,
    window: {
      sessionStorage,
      localStorage,
      dispatchEvent: () => true,
    },
  });
});
const user = {
  id: 'u1',
  email: 'buyer@example.com',
  fullName: 'Buyer',
  role: 'BUYER',
  status: 'ACTIVE',
};
function mockApi(handler: (url: string, body: unknown, authorization: unknown) => unknown) {
  apiClient.defaults.adapter = async (config) => ({
    data: handler(
      config.url!,
      config.data ? JSON.parse(config.data) : undefined,
      config.headers.Authorization,
    ),
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}
test('login stores JWT and profile request sends bearer token', async () => {
  mockApi((url, body, authorization) => {
    if (url === '/auth/login') {
      assert.equal(authorization, undefined);
      assert.deepEqual(body, { email: user.email, password: 'StrongPassword123!' });
      return { success: true, data: { token: 'test-jwt', user } };
    }
    assert.equal(url, '/users/profile');
    assert.equal(authorization, 'Bearer test-jwt');
    return { success: true, data: user };
  });
  await authApi.login(user.email, 'StrongPassword123!');
  assert.equal(getToken(), 'test-jwt');
  assert.equal(localStorage.getItem('nexus.accessToken'), null);
  assert.equal((await authApi.getProfile()).id, 'u1');
});
test('401 clears the saved JWT in both storage areas', async () => {
  sessionStorage.setItem('nexus.accessToken', 'expired');
  localStorage.setItem('nexus.accessToken', 'old');
  apiClient.defaults.adapter = async (config) => {
    const response = {
      data: { success: false, error: 'Expired' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
    } as AxiosResponse;
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
  };
  await assert.rejects(authApi.getProfile(), { status: 401 });
  assert.equal(getToken(), null);
});
test('register sends input and returns user envelope', async () => {
  const input = { email: user.email, fullName: user.fullName, password: 'StrongPassword123!' };
  mockApi((url, body) => {
    assert.equal(url, '/auth/register');
    assert.deepEqual(body, input);
    return { success: true, data: user };
  });
  assert.equal((await authApi.register(input)).id, 'u1');
});
test('logout sends token and clears session even if server fails', async () => {
  sessionStorage.setItem('nexus.accessToken', 'token');
  mockApi((url, _body, token) => {
    assert.equal(url, '/auth/logout');
    assert.equal(token, 'Bearer token');
    throw new Error('Network unavailable');
  });
  await assert.rejects(authApi.logout());
  assert.equal(getToken(), null);
});
test('password reset uses the expected endpoints and payloads', async () => {
  const calls: unknown[] = [];
  mockApi((url, body) => {
    calls.push([url, body]);
    return { success: true, message: 'Request received' };
  });
  await authApi.requestPasswordReset(user.email);
  await authApi.resetPassword('reset-token', 'NewPassword123!');
  assert.deepEqual(calls, [
    ['/auth/forgot-password', { email: user.email }],
    ['/auth/reset-password', { token: 'reset-token', newPassword: 'NewPassword123!' }],
  ]);
});
