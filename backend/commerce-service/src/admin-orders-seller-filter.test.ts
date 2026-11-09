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
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.JWT_ACCESS_SECRET = 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';

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

test('SCRUM-298: Admin Orders API - Lọc đơn hàng theo từng Seller và xem timeline/chi tiết', async () => {
  await withCommerceServer(async (baseUrl) => {
    const adminToken = createTestToken({
      sub: 'usr_admin_001',
      email: 'admin@nexus.test',
      role: 'ADMIN',
    });

    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@nexus.test',
      role: 'SUPPORT_STAFF',
    });

    // 1. Admin lấy danh sách toàn bộ đơn hàng
    const allRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(allRes.status, 200);
    const allJson = (await allRes.json()) as any;
    assert.equal(allJson.success, true);
    assert.ok(Array.isArray(allJson.data));
    assert.ok(allJson.data.length > 0);

    const firstOrder = allJson.data[0];
    const targetSellerId = firstOrder.sellerId;
    assert.ok(targetSellerId, 'Order must contain sellerId');
    assert.ok(firstOrder.buyerId, 'Order must contain buyerId');
    assert.ok(Array.isArray(firstOrder.items), 'Order must contain items list');
    assert.ok(Array.isArray(firstOrder.timeline), 'Order must contain timeline events');

    // 2. Admin lọc đơn hàng theo từng Seller cụ thể (SCRUM-298)
    const sellerFilterRes = await fetch(
      `${baseUrl}/api/v1/orders?sellerId=${encodeURIComponent(targetSellerId)}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert.equal(sellerFilterRes.status, 200);
    const sellerFilterJson = (await sellerFilterRes.json()) as any;
    assert.equal(sellerFilterJson.success, true);
    assert.ok(sellerFilterJson.data.length > 0);
    assert.ok(
      sellerFilterJson.data.every((o: any) => o.sellerId === targetSellerId),
      'All returned orders must belong to the requested sellerId',
    );

    // 3. Support Staff cũng có toàn quyền lọc theo Seller
    const staffFilterRes = await fetch(
      `${baseUrl}/api/v1/orders?sellerId=${encodeURIComponent(targetSellerId)}`,
      {
        headers: { Authorization: `Bearer ${staffToken}` },
      },
    );
    assert.equal(staffFilterRes.status, 200);
    const staffFilterJson = (await staffFilterRes.json()) as any;
    assert.ok(staffFilterJson.data.every((o: any) => o.sellerId === targetSellerId));

    // 4. Xử lý trường hợp dropdown chọn sellerId="all" hoặc status="all"
    const allFilterRes = await fetch(`${baseUrl}/api/v1/orders?sellerId=all&status=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(allFilterRes.status, 200);
    const allFilterJson = (await allFilterRes.json()) as any;
    assert.equal(allFilterJson.data.length, allJson.data.length);

    // 5. Tìm kiếm đơn hàng theo từ khóa q (mã đơn, mã seller, tên sản phẩm)
    const searchRes = await fetch(
      `${baseUrl}/api/v1/orders?q=${encodeURIComponent(firstOrder.id)}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert.equal(searchRes.status, 200);
    const searchJson = (await searchRes.json()) as any;
    assert.ok(searchJson.data.some((o: any) => o.id === firstOrder.id));

    // 6. RBAC: BUYER bị chặn 403 khi gọi API danh sách đơn hàng
    const buyerToken = createTestToken({
      sub: 'usr_buyer_999',
      email: 'buyer@test.com',
      role: 'BUYER',
    });
    const buyerRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerRes.status, 403);

    // 7. RBAC & Anti-IDOR: SELLER cố tình truyền sellerId khác thì hệ thống buộc về sellerId của token
    const sellerToken = createTestToken({
      sub: targetSellerId,
      email: 'seller@test.com',
      role: 'SELLER',
    });
    const sellerAttemptRes = await fetch(
      `${baseUrl}/api/v1/orders?sellerId=malicious_other_seller_id`,
      {
        headers: { Authorization: `Bearer ${sellerToken}` },
      },
    );
    assert.equal(sellerAttemptRes.status, 200);
    const sellerAttemptJson = (await sellerAttemptRes.json()) as any;
    // Bắt buộc tất cả đơn trả về phải thuộc về targetSellerId (ID của token), không cho xem trộm shop khác
    assert.ok(sellerAttemptJson.data.every((o: any) => o.sellerId === targetSellerId));
  });
});
