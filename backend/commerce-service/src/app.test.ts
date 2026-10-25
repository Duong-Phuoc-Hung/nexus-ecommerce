import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { createApplication } from './app';

function createTestToken(payload: { sub: string; email: string; role: string }): string {
  const secret = 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');

  const signingInput = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
}

async function withCommerceServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
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

test('GET /api/v1/orders enforces RBAC: 401 when unauthenticated, 403 for BUYER, 200 for SUPPORT_STAFF', async () => {
  await withCommerceServer(async (baseUrl) => {
    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/orders`);
    assert.equal(unauthRes.status, 401);

    // 2. Authenticate as BUYER -> 403 (Buyer cannot list all orders)
    const buyerToken = createTestToken({
      sub: 'usr_buyer_123',
      email: 'buyer@example.com',
      role: 'BUYER',
    });
    const buyerForbiddenRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerForbiddenRes.status, 403);

    // 3. Authenticate as SUPPORT_STAFF -> 200 OK
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });
    const staffListRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffListRes.status, 200);
    const staffJson = (await staffListRes.json()) as any;
    assert.equal(staffJson.success, true);
    assert.ok(Array.isArray(staffJson.data));
    assert.ok(staffJson.data.length >= 4);
    assert.ok(staffJson.pagination);
    assert.equal(staffJson.pagination.page, 1);

    // Kiểm tra cấu trúc tương thích với màn hình Tra cứu đơn hàng (/support/orders)
    const firstOrder = staffJson.data[0];
    assert.ok(firstOrder.id);
    assert.ok(firstOrder.buyer);
    assert.ok(firstOrder.seller);
    assert.ok(firstOrder.product);
    assert.ok(firstOrder.date);
    assert.ok(firstOrder.total);
    assert.ok(firstOrder.status);
    assert.ok(firstOrder.tracking);

    // 4. Lọc theo từ khóa q=Retro
    const searchRes = await fetch(`${baseUrl}/api/v1/orders?q=Retro`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(searchRes.status, 200);
    const searchJson = (await searchRes.json()) as any;
    assert.equal(searchJson.data.length, 1);
    assert.equal(searchJson.data[0].id, 'NX-ORD-8017');
    assert.equal(searchJson.data[0].seller, 'Retro Lab');
  });
});

test('GET /api/v1/orders/:id returns full order profile with timeline and buyer/seller info', async () => {
  await withCommerceServer(async (baseUrl) => {
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });

    const res = await fetch(`${baseUrl}/api/v1/orders/NX-ORD-8021`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.id, 'NX-ORD-8021');
    assert.equal(json.data.buyer, 'Minh Anh');
    assert.equal(json.data.seller, 'Nexus Audio');
    assert.equal(json.data.total, 1290000);
    assert.equal(json.data.tracking, 'GHN8829103VN');
    assert.ok(Array.isArray(json.data.items));
    assert.ok(Array.isArray(json.data.timeline));
    assert.ok(json.data.timeline.length >= 3);
  });
});

test('POST /api/v1/orders/:id/cancel and /refund allow SUPPORT_STAFF to manage disputes', async () => {
  await withCommerceServer(async (baseUrl) => {
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });

    // 1. Hủy đơn hàng
    const cancelRes = await fetch(`${baseUrl}/api/v1/orders/NX-ORD-8021/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Khách yêu cầu hủy qua tổng đài hỗ trợ' }),
    });

    assert.equal(cancelRes.status, 200);
    const cancelJson = (await cancelRes.json()) as any;
    assert.equal(cancelJson.success, true);
    assert.equal(cancelJson.data.status, 'CANCELLED');

    // 2. Hoàn tiền đơn hàng
    const refundRes = await fetch(`${baseUrl}/api/v1/orders/NX-ORD-8021/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Hoàn tiền vào tài khoản ngân hàng của khách' }),
    });

    assert.equal(refundRes.status, 200);
    const refundJson = (await refundRes.json()) as any;
    assert.equal(refundJson.success, true);
    assert.equal(refundJson.data.status, 'REFUNDED');
  });
});
