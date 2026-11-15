import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { createApplication } from './app';
import { validateMergeCartInput, CartValidationError } from './application/cart/dtos/AddToCartDto';
import { ExpiredOrderCleanupWorker } from './infrastructure/workers/ExpiredOrderCleanupWorker';

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

import http from 'node:http';

async function withCommerceServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.JWT_ACCESS_SECRET = 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';

  // Dựng mock Catalog server để phục vụ tra cứu thông tin sản phẩm
  const mockCatalogServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/v1/products/1') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          data: {
            id: '1',
            sellerId: 'seller_partner_1',
            title: 'Tai nghe Bluetooth Nexus',
            price: 250000,
            stockQuantity: 20,
            status: 'ACTIVE',
            imageUrl: 'https://example.com/item1.jpg',
          },
        }),
      );
      return;
    }
    if (req.url === '/api/v1/products/2') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          data: {
            id: '2',
            sellerId: 'seller_partner_2',
            title: 'Bàn phím cơ không dây',
            price: 650000,
            stockQuantity: 15,
            status: 'ACTIVE',
            imageUrl: 'https://example.com/item2.jpg',
          },
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'Product not found' }));
  });

  await new Promise<void>((resolve) => mockCatalogServer.listen(0, '127.0.0.1', resolve));
  const catalogAddress = mockCatalogServer.address() as any;
  process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${catalogAddress.port}`;

  const server = createApplication().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await Promise.all([
      new Promise<void>((resolve) => server.close(() => resolve())),
      new Promise<void>((resolve) => mockCatalogServer.close(() => resolve())),
    ]);
  }
}

test('SCRUM-167: validateMergeCartInput validation test suite', () => {
  // 1. Dữ liệu hợp lệ với cả số và UUIDv7
  const valid = validateMergeCartInput({
    items: [
      { productId: '101', quantity: 2 },
      { productId: '01932f01-0003-7000-8000-000000000003', quantity: 3 },
    ],
  });
  assert.equal(valid.items.length, 2);
  assert.equal(valid.items[0].productId, '101');
  assert.equal(valid.items[0].quantity, 2);
  assert.equal(valid.items[1].productId, '01932f01-0003-7000-8000-000000000003');
  assert.equal(valid.items[1].quantity, 3);

  // 2. Reject khi items không phải mảng
  assert.throws(
    () => validateMergeCartInput({ items: 'not-an-array' }),
    (err: unknown) => {
      assert.ok(err instanceof CartValidationError);
      assert.equal(err.status, 400);
      return true;
    },
  );

  // 3. Reject khi item có quantity <= 0 hoặc > 999
  assert.throws(
    () => validateMergeCartInput({ items: [{ productId: '101', quantity: 0 }] }),
    (err: unknown) => {
      assert.ok(err instanceof CartValidationError);
      assert.ok(err.fieldErrors?.['items[0].quantity']);
      return true;
    },
  );

  // 4. Reject khi item có productId rỗng
  assert.throws(
    () => validateMergeCartInput({ items: [{ productId: '', quantity: 1 }] }),
    (err: unknown) => {
      assert.ok(err instanceof CartValidationError);
      assert.ok(err.fieldErrors?.['items[0].productId']);
      return true;
    },
  );
});

test('SCRUM-167: POST /api/v1/cart/merge merges guest cart items into DB cart upon login', async () => {
  await withCommerceServer(async (baseUrl) => {
    const buyerToken = createTestToken({
      sub: '01932f00-0001-7000-8000-000000000001',
      email: 'buyer.test@nexus.vn',
      role: 'BUYER',
    });

    // 1. Guest có 2 món trong localStorage, khi login gọi POST /api/v1/cart/merge
    const mergeRes = await fetch(`${baseUrl}/api/v1/cart/merge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${buyerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { productId: '1', quantity: 2 },
          { productId: '2', quantity: 1 },
        ],
      }),
    });

    assert.equal(mergeRes.status, 200);
    const mergeJson = (await mergeRes.json()) as any;
    assert.equal(mergeJson.success, true);
    assert.equal(mergeJson.data.items.length, 2);
    assert.equal(mergeJson.data.totalItems, 3);

    // 2. Gọi lại POST /api/v1/cart/merge với cùng sản phẩm -> tự động cộng dồn số lượng
    const mergeAgainRes = await fetch(`${baseUrl}/api/v1/cart/merge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${buyerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ productId: '1', quantity: 1 }],
      }),
    });

    assert.equal(mergeAgainRes.status, 200);
    const mergeAgainJson = (await mergeAgainRes.json()) as any;
    const item1 = mergeAgainJson.data.items.find((it: any) => it.productId === '1');
    assert.ok(item1);
    assert.equal(item1.quantity, 3); // 2 + 1 = 3 món
  });
});

test('SCRUM-173: ExpiredOrderCleanupWorker cancels expired orders and releases stock reservations', async () => {
  const updatedOrders: any[] = [];
  const updatedReservations: any[] = [];
  const updatedPayments: any[] = [];

  const now = new Date();
  const past16Minutes = new Date(now.getTime() - 16 * 60 * 1000);

  // Mock Prisma Client
  const mockPrisma = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(mockPrisma),
    order: {
      findMany: async () => [
        {
          id: 'ord_expired_001',
          orderCode: 'NX-ORD-EXP-001',
          timeline: [{ status: 'PENDING_PAYMENT', timestamp: past16Minutes.toISOString() }],
        },
      ],
      updateMany: async (args: any) => {
        updatedOrders.push(args);
        return { count: 1 };
      },
    },
    stockReservation: {
      updateMany: async (args: any) => {
        updatedReservations.push(args);
        return { count: 2 };
      },
    },
    payment: {
      updateMany: async (args: any) => {
        updatedPayments.push(args);
        return { count: 1 };
      },
    },
  };

  const worker = new ExpiredOrderCleanupWorker(mockPrisma, 15);
  const result = await worker.runCleanup();

  // Xác nhận đã hủy 1 đơn quá hạn và nhả 2 bản ghi giữ kho
  assert.equal(result.expiredOrdersCount, 1);
  assert.equal(result.releasedReservationsCount, 2);

  // Kiểm tra trạng thái đơn được đổi thành CANCELLED với guard status
  assert.equal(updatedOrders.length, 1);
  assert.equal(updatedOrders[0].where.id, 'ord_expired_001');
  assert.deepEqual(updatedOrders[0].where.status, { in: ['PENDING', 'PENDING_PAYMENT'] });
  assert.equal(updatedOrders[0].data.status, 'CANCELLED');

  // Kiểm tra timeline đã ghi nhận lý do hủy đơn
  const lastTimeline = updatedOrders[0].data.timeline[updatedOrders[0].data.timeline.length - 1];
  assert.equal(lastTimeline.status, 'CANCELLED');
  assert.match(lastTimeline.title, /quá hạn thanh toán 15 phút/);

  // Kiểm tra stock reservation được chuyển sang RELEASED
  assert.equal(updatedReservations.length, 1);
  assert.equal(updatedReservations[0].where.orderId, 'ord_expired_001');
  assert.equal(updatedReservations[0].where.status, 'ACTIVE');
  assert.equal(updatedReservations[0].data.status, 'RELEASED');

  // Kiểm tra payment PENDING được chuyển sang FAILED
  assert.equal(updatedPayments.length, 1);
  assert.equal(updatedPayments[0].where.orderId, 'ord_expired_001');
  assert.equal(updatedPayments[0].data.status, 'FAILED');
});

test('SCRUM-173: ExpiredOrderCleanupWorker race condition guard - skips releasing stock if order was already PAID', async () => {
  const updatedReservations: any[] = [];
  const updatedPayments: any[] = [];

  const mockPrisma = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(mockPrisma),
    order: {
      findMany: async () => [
        {
          id: 'ord_already_paid',
          orderCode: 'NX-ORD-PAID-001',
          timeline: [],
        },
      ],
      // Giả lập webhook PayOS vừa update PAID nên updateMany trả về count: 0 (không match PENDING/PENDING_PAYMENT)
      updateMany: async () => ({ count: 0 }),
    },
    stockReservation: {
      updateMany: async (args: any) => {
        updatedReservations.push(args);
        return { count: 1 };
      },
    },
    payment: {
      updateMany: async (args: any) => {
        updatedPayments.push(args);
        return { count: 1 };
      },
    },
  };

  const worker = new ExpiredOrderCleanupWorker(mockPrisma, 15);
  const result = await worker.runCleanup();

  assert.equal(result.expiredOrdersCount, 0);
  assert.equal(result.releasedReservationsCount, 0);
  assert.equal(updatedReservations.length, 0);
  assert.equal(updatedPayments.length, 0);
});
