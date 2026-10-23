import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from './app';

async function withUserServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  const server = createApplication().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('POST /api/v1/auth/register uses RegisterUseCase with Bcrypt hashing and returns created user', async () => {
  await withUserServer(async (baseUrl) => {
    const registerPayload = {
      email: 'integration.tester@nexus.vn',
      fullName: 'Integration Tester',
      password: 'SecurePassword123!',
      role: 'BUYER',
    };

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload),
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.email, 'integration.tester@nexus.vn');
    assert.equal(json.data.fullName, 'Integration Tester');
    assert.equal(json.data.role, 'BUYER');
    assert.equal('passwordHash' in json.data, false);
  });
});

test('POST /api/v1/auth/login returns both accessToken and backward-compatible token (BUG-12)', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Đăng ký tài khoản
    const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login.tester@nexus.vn',
        fullName: 'Login Tester',
        password: 'Password123!',
      }),
    });
    assert.equal(registerRes.status, 201);

    // 2. Đăng nhập
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login.tester@nexus.vn',
        password: 'Password123!',
      }),
    });

    assert.equal(loginRes.status, 200);
    const json = (await loginRes.json()) as any;
    assert.equal(json.success, true);
    assert.ok(json.data.accessToken, 'Phải có accessToken chuẩn JWT Service');
    assert.ok(json.data.refreshToken, 'Phải có refreshToken chuẩn JWT Service');
    assert.ok(json.data.token, 'Phải có token tương thích ngược cho Frontend Web');
    assert.equal(json.data.token, json.data.accessToken, 'token phải khớp với accessToken');
    assert.equal(json.data.user.email, 'login.tester@nexus.vn');
    assert.equal(json.data.user.role, 'BUYER');
  });
});

test('GET /api/v1/users enforces RBAC: 401 when unauthenticated, 403 for BUYER, 200 for SUPPORT_STAFF', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/users`);
    assert.equal(unauthRes.status, 401);

    // 2. Authenticate as BUYER
    const buyerLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(buyerLoginRes.status, 200);
    const buyerLoginJson = (await buyerLoginRes.json()) as any;
    const buyerToken = buyerLoginJson.data.accessToken;

    // BUYER calls GET /api/v1/users -> 403 Forbidden
    const buyerForbiddenRes = await fetch(`${baseUrl}/api/v1/users`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerForbiddenRes.status, 403);

    // 3. Authenticate as SUPPORT_STAFF
    const staffLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(staffLoginRes.status, 200);
    const staffLoginJson = (await staffLoginRes.json()) as any;
    const staffToken = staffLoginJson.data.accessToken;

    // SUPPORT_STAFF calls GET /api/v1/users -> 200 OK
    const staffListRes = await fetch(`${baseUrl}/api/v1/users`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffListRes.status, 200);
    const staffListJson = (await staffListRes.json()) as any;
    assert.equal(staffListJson.success, true);
    assert.ok(Array.isArray(staffListJson.data));
    assert.ok(staffListJson.data.length >= 4);
    assert.ok(staffListJson.pagination);
    assert.equal(staffListJson.pagination.page, 1);
    assert.equal(staffListJson.pagination.limit, 10);
    assert.ok(staffListJson.pagination.total >= 4);

    // Verify dual-key compatibility fields for Frontend Support Staff screen (/support/users)
    const sampleUser = staffListJson.data[0];
    assert.ok(sampleUser.id);
    assert.ok(sampleUser.fullName);
    assert.equal(sampleUser.name, sampleUser.fullName);
    assert.ok(sampleUser.email);
    assert.ok(sampleUser.role);
    assert.ok(sampleUser.status);
    assert.equal(sampleUser.reputation, sampleUser.reputationScore);
    assert.equal(sampleUser.orders, sampleUser.ordersCount);

    // 4. SUPPORT_STAFF searches with keyword q=Retro
    const staffSearchRes = await fetch(`${baseUrl}/api/v1/users?q=Retro`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffSearchRes.status, 200);
    const staffSearchJson = (await staffSearchRes.json()) as any;
    assert.equal(staffSearchJson.data.length, 1);
    assert.equal(staffSearchJson.data[0].email, 'seller.test@nexus-ecommerce.com');
    assert.equal(staffSearchJson.data[0].role, 'SELLER');
  });
});
