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
