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

test('TASK-REP-02: POST /api/v1/ratings and GET /api/v1/ratings/user/:userId', async () => {
  await withUserServer(async (baseUrl) => {
    const buyerToken = await login(baseUrl, 'buyer.test@nexus-ecommerce.com', 'Password123!');
    const sellerId = '01a15822-3fd0-7b39-ad01-f11da72d5b80'; // seller.test@nexus-ecommerce.com
    const buyerId = '01a15822-43b8-78c3-a246-16bff78bc6e8';

    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'ORD-20261123-001',
        rateeId: sellerId,
        score: 5,
        comment: 'Dịch vụ tuyệt vời',
      }),
    });
    assert.equal(unauthRes.status, 401);

    // 2. Self review -> 403 Forbidden
    const sellerToken = await login(baseUrl, 'seller.test@nexus-ecommerce.com', 'Password123!');
    const selfRes = await fetch(`${baseUrl}/api/v1/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        orderId: 'ORD-20261123-001',
        rateeId: sellerId,
        score: 5,
      }),
    });
    assert.equal(selfRes.status, 403);

    // 3. Invalid rating score (0 or 6) -> 400 Bad Request
    const invalidRes = await fetch(`${baseUrl}/api/v1/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        orderId: 'ORD-20261123-001',
        rateeId: sellerId,
        score: 6,
      }),
    });
    assert.equal(invalidRes.status, 400);

    // 4. Rate successfully -> 201 Created
    const createRes = await fetch(`${baseUrl}/api/v1/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        orderId: 'ORD-20261123-001',
        rateeId: sellerId,
        score: 5,
        comment: 'Giao hàng nhanh, đóng gói cẩn thận',
      }),
    });
    assert.equal(createRes.status, 201);
    const createData = (await createRes.json()) as any;
    assert.equal(createData.success, true);
    assert.equal(createData.data.rating, 5);
    assert.equal(createData.data.comment, 'Giao hàng nhanh, đóng gói cẩn thận');
    assert.equal(createData.data.summary.totalReviews, 1);
    assert.equal(createData.data.summary.averageRating, 5);

    // 5. Duplicate rating on same order -> 409 Conflict
    const dupRes = await fetch(`${baseUrl}/api/v1/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        orderId: 'ORD-20261123-001',
        rateeId: sellerId,
        score: 4,
      }),
    });
    assert.equal(dupRes.status, 409);

    // 6. Query seller ratings: GET /api/v1/ratings/user/:userId -> 200
    const queryRes = await fetch(`${baseUrl}/api/v1/ratings/user/${sellerId}`);
    assert.equal(queryRes.status, 200);
    const queryData = (await queryRes.json()) as any;
    assert.equal(queryData.success, true);
    assert.equal(queryData.data.summary.totalReviews, 1);
    assert.equal(queryData.data.summary.averageRating, 5);
    assert.equal(queryData.data.recentReviews.length, 1);

    // 7. Check Buyer's reputation: GET /api/v1/users/me/reputation -> 200
    const repRes = await fetch(`${baseUrl}/api/v1/users/me/reputation`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(repRes.status, 200);
    const repData = (await repRes.json()) as any;
    assert.equal(repData.success, true);
    assert.equal(repData.data.reputationScore, 98);
    assert.equal(repData.data.trustTier, 'HIGH');
    assert.equal(repData.data.biddingEligible, true);
  });
});
