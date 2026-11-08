import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from './app';

async function withUserServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin.test@nexus-ecommerce.com';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = 'AdminPassword123!';

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

async function login(baseUrl: string, email: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as any;
  return data.data.accessToken;
}

test('Support Staff Task 4: POST /api/v1/support/users/:userId/adjust-reputation', async () => {
  await withUserServer(async (baseUrl) => {
    const targetUserId = '01a15822-43b8-78c3-a246-16bff78bc6e8'; // buyer.test@nexus-ecommerce.com (initial score: 98)

    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(
      `${baseUrl}/api/v1/support/users/${targetUserId}/adjust-reputation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: -10, reason: 'Boom hang' }),
      },
    );
    assert.equal(unauthRes.status, 401);

    // 2. Buyer -> 403 Forbidden
    const buyerToken = await login(baseUrl, 'buyer.test@nexus-ecommerce.com', 'Password123!');
    const buyerForbiddenRes = await fetch(
      `${baseUrl}/api/v1/support/users/${targetUserId}/adjust-reputation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({ points: -10, reason: 'Boom hang' }),
      },
    );
    assert.equal(buyerForbiddenRes.status, 403);

    // 3. Support Staff -> 200 OK
    const staffToken = await login(baseUrl, 'staff.test@nexus-ecommerce.com', 'Password123!');
    const adjustRes = await fetch(
      `${baseUrl}/api/v1/support/users/${targetUserId}/adjust-reputation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          points: -10,
          reason: 'Tự ý hủy đơn hàng đã thanh toán không có lý do chính đáng',
        }),
      },
    );
    assert.equal(adjustRes.status, 200);
    const adjustBody = (await adjustRes.json()) as any;
    assert.equal(adjustBody.success, true);
    assert.equal(adjustBody.data.newReputationScore, 88); // 98 - 10 = 88
    assert.equal(adjustBody.data.adjustedPoints, -10);
    assert.equal(
      adjustBody.data.reason,
      'Tự ý hủy đơn hàng đã thanh toán không có lý do chính đáng',
    );
    assert.equal(adjustBody.data.reputationHistory.length, 1);

    // 4. User not found -> 404
    const notFoundRes = await fetch(
      `${baseUrl}/api/v1/support/users/usr_non_existent/adjust-reputation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ points: -5, reason: 'Test' }),
      },
    );
    assert.equal(notFoundRes.status, 404);

    // 5. Invalid body -> 400
    const invalidRes = await fetch(
      `${baseUrl}/api/v1/support/users/${targetUserId}/adjust-reputation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ points: 'not_a_number', reason: '' }),
      },
    );
    assert.equal(invalidRes.status, 400);
  });
});

test('Support Staff Task 4: POST /api/v1/support/users/:userId/restrict-features', async () => {
  await withUserServer(async (baseUrl) => {
    const targetUserId = '01a15822-3fd0-7b39-ad01-f11da72d5b80'; // seller.test@nexus-ecommerce.com

    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(
      `${baseUrl}/api/v1/support/users/${targetUserId}/restrict-features`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restriction: 'BAN_AUCTION_CREATION',
          durationDays: 14,
          reason: 'Bán hàng sai mô tả',
        }),
      },
    );
    assert.equal(unauthRes.status, 401);

    // 2. Buyer -> 403 Forbidden
    const buyerToken = await login(baseUrl, 'buyer.test@nexus-ecommerce.com', 'Password123!');
    const buyerForbiddenRes = await fetch(
      `${baseUrl}/api/v1/support/users/${targetUserId}/restrict-features`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({
          restriction: 'BAN_AUCTION_CREATION',
          durationDays: 14,
          reason: 'Bán hàng sai mô tả',
        }),
      },
    );
    assert.equal(buyerForbiddenRes.status, 403);

    // 3. Admin / Support Staff -> 200 OK
    const staffToken = await login(baseUrl, 'staff.test@nexus-ecommerce.com', 'Password123!');
    const restrictRes = await fetch(
      `${baseUrl}/api/v1/support/users/${targetUserId}/restrict-features`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          restriction: 'BAN_AUCTION_CREATION',
          durationDays: 14,
          reason: 'Bán hàng sai mô tả',
        }),
      },
    );
    assert.equal(restrictRes.status, 200);
    const restrictBody = (await restrictRes.json()) as any;
    assert.equal(restrictBody.success, true);
    assert.equal(restrictBody.data.restriction, 'BAN_AUCTION_CREATION');
    assert.equal(restrictBody.data.durationDays, 14);
    assert.equal(restrictBody.data.reason, 'Bán hàng sai mô tả');
    assert.ok(new Date(restrictBody.data.expiresAt).getTime() > Date.now());
    assert.equal(restrictBody.data.activeRestrictions.length, 1);
  });
});
