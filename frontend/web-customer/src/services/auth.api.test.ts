import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClient, TokenStorage } from './api-client';
import { createAuthApi } from './auth.api';

function createMemoryStorage(): TokenStorage & { token: string | null } {
  return {
    token: null,
    get() {
      return this.token;
    },
    set(token) {
      this.token = token;
    },
    clear() {
      this.token = null;
    },
  };
}

test('login stores JWT and profile request automatically sends bearer token', async () => {
  const storage = createMemoryStorage();
  const requests: Array<{ url: string; authorization: string | null }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    requests.push({ url, authorization: headers.get('authorization') });

    if (url.endsWith('/auth/login')) {
      return Response.json({
        success: true,
        data: {
          token: 'test-jwt',
          user: {
            id: 'u1',
            email: 'buyer@example.com',
            fullName: 'Buyer',
            role: 'BUYER',
            permissions: [],
          },
        },
      });
    }

    return Response.json({
      success: true,
      data: { id: 'u1', email: 'buyer@example.com', fullName: 'Buyer', role: 'BUYER' },
    });
  };
  const client = new ApiClient('http://gateway.test/api/v1', storage, fetcher);
  const authApi = createAuthApi(client);

  await authApi.login('buyer@example.com', 'StrongPassword123!');
  const profile = await authApi.getProfile();

  assert.equal(storage.token, 'test-jwt');
  assert.equal(profile.id, 'u1');
  assert.equal(requests[0].authorization, null);
  assert.equal(requests[1].authorization, 'Bearer test-jwt');
});

test('401 response clears the saved JWT', async () => {
  const storage = createMemoryStorage();
  storage.set('expired-jwt');
  const fetcher: typeof fetch = async () =>
    Response.json({ success: false, error: 'Invalid or expired token.' }, { status: 401 });
  const client = new ApiClient('http://gateway.test/api/v1', storage, fetcher);

  await assert.rejects(client.request('/users/profile'), { status: 401 });
  assert.equal(storage.token, null);
});
