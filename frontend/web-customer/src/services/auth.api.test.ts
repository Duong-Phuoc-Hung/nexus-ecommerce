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

test('register sends input payload and returns user envelope data', async () => {
  const storage = createMemoryStorage();
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(String(input), 'http://gateway.test/api/v1/auth/register');
    assert.equal(init?.method, 'POST');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.email, 'newbuyer@example.com');
    assert.equal(body.fullName, 'New Buyer');
    assert.equal(body.password, '123456');
    return Response.json({
      success: true,
      data: {
        id: 'u2',
        email: 'newbuyer@example.com',
        fullName: 'New Buyer',
        role: 'BUYER',
        status: 'ACTIVE',
        reputationScore: 100,
        permissions: ['BID.CREATE', 'PROFILE.VIEW'],
      },
    });
  };
  const client = new ApiClient('http://gateway.test/api/v1', storage, fetcher);
  const authApi = createAuthApi(client);
  const user = await authApi.register({
    email: 'newbuyer@example.com',
    fullName: 'New Buyer',
    password: '123456',
  });
  assert.equal(user.id, 'u2');
  assert.equal(user.role, 'BUYER');
});

test('logout invokes /auth/logout and clears client token', async () => {
  const storage = createMemoryStorage();
  storage.set('logged-in-token');
  let logoutCalled = false;
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(String(input), 'http://gateway.test/api/v1/auth/logout');
    assert.equal(init?.method, 'POST');
    logoutCalled = true;
    return Response.json({ success: true, data: { message: 'Logged out successfully.' } });
  };
  const client = new ApiClient('http://gateway.test/api/v1', storage, fetcher);
  const authApi = createAuthApi(client);
  await authApi.logout();
  assert.equal(logoutCalled, true);
  assert.equal(storage.get(), null);
});

test('requestPasswordReset and resetPassword invoke correct endpoints', async () => {
  const storage = createMemoryStorage();
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/auth/forgot-password')) {
      return Response.json({ success: true, message: 'Reset email sent.', resetToken: 'tok_abc' });
    }
    if (url.endsWith('/auth/reset-password')) {
      return Response.json({ success: true, message: 'Password has been reset.' });
    }
    return Response.json({ success: false }, { status: 404 });
  };
  const client = new ApiClient('http://gateway.test/api/v1', storage, fetcher);
  const authApi = createAuthApi(client);

  const reqRes = await authApi.requestPasswordReset('buyer@example.com');
  assert.equal(reqRes.resetToken, 'tok_abc');

  await authApi.resetPassword('tok_abc', 'NewPass123!');
  assert.equal(calls.length, 2);
});
