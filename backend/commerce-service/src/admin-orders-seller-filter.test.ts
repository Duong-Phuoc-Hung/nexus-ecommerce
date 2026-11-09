import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { createApplication } from './app';
import { PrismaClient } from './infrastructure/database/generated/client';
import { PostgresAdminOrderReader } from './infrastructure/repositories/PostgresAdminOrderReader';
import { InMemoryOrderRepository } from './infrastructure/repositories/InMemoryOrderRepository';
import { Order, OrderStatus } from './domain/entities/Order';

const seller2Id = '01a15822-3fd0-7b39-ad01-f11da72d5b99';

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

async function withCommerceServer<T>(
  run: (baseUrl: string) => Promise<T>,
  reader?: PostgresAdminOrderReader,
): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.JWT_ACCESS_SECRET = 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';

  const adminReader = new InMemoryOrderRepository();
  const now = new Date();
  await adminReader.save(
    new Order({
      id: 'order-test-seller-2',
      buyerId: '01a15822-43b8-78c3-a246-16bff78bc6e8',
      sellerId: seller2Id,
      items: [],
      totalAmount: 1_000,
      status: OrderStatus.PAID,
      createdAt: now,
      updatedAt: now,
    }),
  );
  const server = createApplication(reader ?? adminReader).listen(0, '127.0.0.1');
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
      sub: '01a15822-3be8-7505-a081-e0e45bd2e15e',
      email: 'admin@nexus.test',
      role: 'ADMIN',
    });

    const staffToken = createTestToken({
      sub: '01a15822-47a0-78fd-83de-477ceaa393a7',
      email: 'staff@nexus.test',
      role: 'SUPPORT_STAFF',
    });

    const seller1Id = '01a15822-3fd0-7b39-ad01-f11da72d5b80';

    // 1. Admin lấy danh sách toàn bộ đơn hàng
    const allRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(allRes.status, 200);
    const allJson = (await allRes.json()) as any;
    assert.equal(allJson.success, true);
    assert.ok(Array.isArray(allJson.data));
    assert.ok(allJson.data.length >= 2, 'Must have orders from at least 2 distinct sellers');

    // 2. Admin lọc đơn hàng theo Seller 1: Trả về đơn của Seller 1, loại bỏ hoàn toàn Seller 2
    const seller1Res = await fetch(
      `${baseUrl}/api/v1/orders?sellerId=${encodeURIComponent(seller1Id)}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert.equal(seller1Res.status, 200);
    const seller1Json = (await seller1Res.json()) as any;
    assert.equal(seller1Json.success, true);
    assert.ok(seller1Json.data.length > 0);
    assert.ok(
      seller1Json.data.every((o: any) => o.sellerId === seller1Id),
      'All returned orders must belong strictly to seller 1',
    );
    assert.ok(
      seller1Json.data.every((o: any) => o.sellerId !== seller2Id),
      'Seller 2 orders must be completely excluded',
    );

    // 3. Admin lọc đơn hàng theo Seller 2: Trả về đơn của Seller 2, loại bỏ hoàn toàn Seller 1
    const seller2Res = await fetch(
      `${baseUrl}/api/v1/orders?sellerId=${encodeURIComponent(seller2Id)}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert.equal(seller2Res.status, 200);
    const seller2Json = (await seller2Res.json()) as any;
    assert.equal(seller2Json.success, true);
    assert.ok(seller2Json.data.length > 0);
    assert.ok(
      seller2Json.data.every((o: any) => o.sellerId === seller2Id),
      'All returned orders must belong strictly to seller 2',
    );
    assert.ok(
      seller2Json.data.every((o: any) => o.sellerId !== seller1Id),
      'Seller 1 orders must be completely excluded',
    );

    // 4. Support Staff cũng có toàn quyền lọc theo Seller
    const staffFilterRes = await fetch(
      `${baseUrl}/api/v1/orders?sellerId=${encodeURIComponent(seller1Id)}`,
      {
        headers: { Authorization: `Bearer ${staffToken}` },
      },
    );
    assert.equal(staffFilterRes.status, 200);
    const staffFilterJson = (await staffFilterRes.json()) as any;
    assert.ok(staffFilterJson.data.every((o: any) => o.sellerId === seller1Id));

    // 5. Dropdown chọn sellerId="all" hoặc status="all" trả về toàn bộ
    const allFilterRes = await fetch(`${baseUrl}/api/v1/orders?sellerId=all&status=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(allFilterRes.status, 200);
    const allFilterJson = (await allFilterRes.json()) as any;
    assert.equal(allFilterJson.data.length, allJson.data.length);

    // 6. Tìm kiếm đơn hàng theo từ khóa q (mã đơn, mã seller, tên sản phẩm)
    const firstOrder = allJson.data[0];
    const searchRes = await fetch(
      `${baseUrl}/api/v1/orders?q=${encodeURIComponent(firstOrder.id)}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert.equal(searchRes.status, 200);
    const searchJson = (await searchRes.json()) as any;
    assert.ok(searchJson.data.some((o: any) => o.id === firstOrder.id));

    // 7. Tra cứu đơn hàng theo ID (hỗ trợ cả khóa chính và mã hiển thị cũ)
    const detailRes = await fetch(`${baseUrl}/api/v1/orders/${encodeURIComponent(firstOrder.id)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(detailRes.status, 200);
    const detailJson = (await detailRes.json()) as any;
    assert.equal(detailJson.data.id, firstOrder.id);
    assert.ok(Array.isArray(detailJson.data.timeline));

    // 8. Query parameter validation: Tham số lặp lại trả 400 Bad Request
    const repeatRes = await fetch(
      `${baseUrl}/api/v1/orders?sellerId=${seller1Id}&sellerId=${seller2Id}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert.equal(repeatRes.status, 400);

    // 9. Query parameter validation: Tham số page/limit không hợp lệ trả 400 Bad Request
    const invalidPageRes = await fetch(`${baseUrl}/api/v1/orders?page=-1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(invalidPageRes.status, 400);

    const invalidLimitRes = await fetch(`${baseUrl}/api/v1/orders?limit=abc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(invalidLimitRes.status, 400);

    // 10. RBAC: BUYER bị chặn 403 khi gọi API danh sách toàn bộ đơn hàng
    const buyerToken = createTestToken({
      sub: '01a15822-43b8-78c3-a246-16bff78bc6e8',
      email: 'buyer@test.com',
      role: 'BUYER',
    });
    const buyerRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerRes.status, 403);

    // 11. RBAC & Anti-IDOR: SELLER cố tình truyền sellerId khác thì hệ thống buộc về sellerId của token
    const sellerToken = createTestToken({
      sub: seller1Id,
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
    assert.ok(sellerAttemptJson.data.every((o: any) => o.sellerId === seller1Id));

    // 12. Chống Header Spoofing: Gửi header x-user-* mà không có JWT hợp lệ bị 401
    const spoofRes = await fetch(`${baseUrl}/api/v1/orders`, {
      headers: {
        'x-user-id': 'hacker_admin',
        'x-user-role': 'ADMIN',
      },
    });
    assert.equal(spoofRes.status, 401);
  });
});

test(
  'SCRUM-298: PostgresAdminOrderReader filters and reads order details',
  { skip: process.env.COMMERCE_DB_TEST !== 'true' },
  async () => {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.COMMERCE_DB_URL ||
            'postgresql://nexus_commerce:nexus_password@127.0.0.1:5434/nexus_commerce_db?schema=public',
        },
      },
    });
    try {
      const reader = new PostgresAdminOrderReader(prisma);
      const page = await reader.search({ page: 1, limit: 10 });
      assert.ok(page.orders.length > 0, 'Expected orders from the local Commerce migrations');
      const firstOrder = page.orders[0];
      assert.equal((await reader.findById(firstOrder.id))?.id, firstOrder.id);
      const filtered = await reader.search({
        page: 1,
        limit: 10,
        sellerId: firstOrder.sellerId,
        q: firstOrder.id,
      });
      assert.deepEqual(
        filtered.orders.map((order) => order.id),
        [firstOrder.id],
      );
      const empty = await reader.search({ page: 1, limit: 10, sellerId: crypto.randomUUID() });
      assert.equal(empty.total, 0);

      const token = createTestToken({
        sub: crypto.randomUUID(),
        email: 'admin@nexus.test',
        role: 'ADMIN',
      });
      await withCommerceServer(async (baseUrl) => {
        const query = new URLSearchParams({ sellerId: firstOrder.sellerId, q: firstOrder.id });
        const headers = { Authorization: `Bearer ${token}` };
        const list = await fetch(`${baseUrl}/api/v1/orders?${query}`, { headers });
        assert.equal(list.status, 200);
        const body = (await list.json()) as { data: Array<{ id: string; sellerId: string }> };
        assert.deepEqual(
          body.data.map(({ id, sellerId }) => ({ id, sellerId })),
          [{ id: firstOrder.id, sellerId: firstOrder.sellerId }],
        );
        const detail = await fetch(
          `${baseUrl}/api/v1/orders/${encodeURIComponent(firstOrder.id)}`,
          {
            headers,
          },
        );
        assert.equal(detail.status, 200);
      }, reader);
    } finally {
      await prisma.$disconnect();
    }
  },
);
