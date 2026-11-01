import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { createApplication } from './app';

function createTestToken(payload: { sub: string; email: string; role: string }): string {
  const secret =
    process.env.JWT_ACCESS_SECRET || 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${fullPayload}`)
    .digest('base64url');

  return `${header}.${fullPayload}.${signature}`;
}

async function withFulfillmentServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
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

test('Inventory API: GET /api/v1/fulfillments/inventory enforces RBAC, formula available=onHand-reserved and query filter', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const buyerToken = createTestToken({
      sub: 'usr_buyer',
      email: 'buyer@nexus.vn',
      role: 'BUYER',
    });
    const sellerToken = createTestToken({
      sub: 'usr_seller',
      email: 'seller@nexus.vn',
      role: 'SELLER',
    });
    const staffToken = createTestToken({
      sub: 'usr_staff',
      email: 'staff@nexus.vn',
      role: 'SUPPORT_STAFF',
    });

    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/fulfillments/inventory`);
    assert.equal(unauthRes.status, 401);

    // 2. BUYER -> 403 (Buyer không được tra cứu dữ liệu tồn kho)
    const buyerRes = await fetch(`${baseUrl}/api/v1/fulfillments/inventory`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerRes.status, 403);

    // 3. SELLER -> 200 OK
    const sellerRes = await fetch(`${baseUrl}/api/v1/fulfillments/inventory`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    assert.equal(sellerRes.status, 200);
    const sellerJson = (await sellerRes.json()) as any;
    assert.equal(sellerJson.success, true);
    assert.ok(Array.isArray(sellerJson.data));
    assert.ok(sellerJson.data.length >= 5);

    // Kiểm tra cấu trúc trường dữ liệu theo SRS: { sku, productName, warehouseId, warehouseName, onHand, reserved, available }
    const firstItem = sellerJson.data[0];
    assert.ok(firstItem.sku);
    assert.ok(firstItem.productName);
    assert.ok(firstItem.warehouseId);
    assert.ok(firstItem.warehouseName);
    assert.equal(typeof firstItem.onHand, 'number');
    assert.equal(typeof firstItem.reserved, 'number');
    assert.equal(typeof firstItem.available, 'number');
    // Kiểm tra công thức bắt buộc: available = onHand - reserved
    assert.equal(firstItem.available, firstItem.onHand - firstItem.reserved);

    // 4. SUPPORT_STAFF -> 200 OK với query lọc theo SKU
    const staffFilterRes = await fetch(
      `${baseUrl}/api/v1/fulfillments/inventory?sku=NX-IPHONE-15-BLUE`,
      {
        headers: { Authorization: `Bearer ${staffToken}` },
      },
    );
    assert.equal(staffFilterRes.status, 200);
    const staffFilterJson = (await staffFilterRes.json()) as any;
    assert.equal(staffFilterJson.success, true);
    assert.equal(staffFilterJson.data.length, 1);
    assert.equal(staffFilterJson.data[0].sku, 'NX-IPHONE-15-BLUE');
    assert.equal(staffFilterJson.data[0].warehouseId, 'WH_001');
    assert.equal(staffFilterJson.data[0].onHand, 150);
    assert.equal(staffFilterJson.data[0].reserved, 25);
    assert.equal(staffFilterJson.data[0].available, 125);
  });
});

test('Inventory API: POST /api/v1/fulfillments/inventory/adjust handles STOCK_IN, DAMAGE and prevents oversell (ALLOW_OVERSELL: false)', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const sellerToken = createTestToken({
      sub: 'usr_seller',
      email: 'seller@nexus.vn',
      role: 'SELLER',
    });
    const staffToken = createTestToken({
      sub: 'usr_staff',
      email: 'staff@nexus.vn',
      role: 'SUPPORT_STAFF',
    });
    const adminToken = createTestToken({
      sub: 'usr_admin',
      email: 'admin@nexus.vn',
      role: 'ADMIN',
    });

    // 1. SUPPORT_STAFF cố điều chỉnh kho -> 403 (Chỉ SELLER và ADMIN có quyền điều chỉnh kho)
    const staffAdjustRes = await fetch(`${baseUrl}/api/v1/fulfillments/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        sku: 'NX-AIRPODS-PRO-2',
        adjustmentType: 'STOCK_IN',
        quantity: 10,
        reason: 'Nhân viên hỗ trợ thử chỉnh kho',
      }),
    });
    assert.equal(staffAdjustRes.status, 403);

    // 2. SELLER nhập thêm hàng (STOCK_IN) -> 200 OK (80 + 20 = 100 onHand)
    const stockInRes = await fetch(`${baseUrl}/api/v1/fulfillments/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        sku: 'NX-AIRPODS-PRO-2',
        adjustmentType: 'STOCK_IN',
        quantity: 20,
        reason: 'Kiểm kê nhập lô hàng mới từ xưởng',
      }),
    });
    assert.equal(stockInRes.status, 200);
    const stockInJson = (await stockInRes.json()) as any;
    assert.equal(stockInJson.success, true);
    assert.equal(stockInJson.data.onHand, 100);
    assert.equal(stockInJson.data.reserved, 10);
    assert.equal(stockInJson.data.available, 90);
    assert.ok(stockInJson.ledgerId);

    // 3. ADMIN điều chỉnh hàng lỗi (DAMAGE) -> 200 OK
    const damageRes = await fetch(`${baseUrl}/api/v1/fulfillments/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        sku: 'NX-AIRPODS-PRO-2',
        adjustmentType: 'DAMAGE',
        quantity: 5,
        reason: 'Rơi vỡ vỏ hộp trong lúc vận chuyển nội bộ kho',
      }),
    });
    assert.equal(damageRes.status, 200);
    const damageJson = (await damageRes.json()) as any;
    assert.equal(damageJson.data.onHand, 95);
    assert.equal(damageJson.data.unavailableQuantity, 5);
    assert.equal(damageJson.data.available, 85); // 95 - 10 reserved = 85

    // 4. CHỐNG BÁN ÂM (ALLOW_OVERSELL: false): Xuất kho (STOCK_OUT) vượt quá số lượng khả dụng -> 400 Bad Request
    const oversellRes = await fetch(`${baseUrl}/api/v1/fulfillments/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        sku: 'NX-AIRPODS-PRO-2',
        adjustmentType: 'STOCK_OUT',
        quantity: 90, // Hiện có onHand 95, nhưng 10 đang reserved, tối đa chỉ được xuất 85
        reason: 'Xuất kho quá đà',
      }),
    });
    assert.equal(oversellRes.status, 400);
    const oversellJson = (await oversellRes.json()) as any;
    assert.equal(oversellJson.success, false);
    assert.match(oversellJson.error, /ALLOW_OVERSELL|không đủ/);
  });
});

test('Support Cases API: GET /api/v1/support/cases and POST /api/v1/support/cases/:id/resolve', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const buyerToken = createTestToken({
      sub: 'usr_buyer',
      email: 'buyer@nexus.vn',
      role: 'BUYER',
    });
    const staffToken = createTestToken({
      sub: 'usr_staff',
      email: 'staff@nexus.vn',
      role: 'SUPPORT_STAFF',
    });

    // 1. BUYER -> 403 Forbidden
    const buyerCasesRes = await fetch(`${baseUrl}/api/v1/support/cases`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerCasesRes.status, 403);

    // 2. SUPPORT_STAFF -> 200 OK, trả về danh sách hồ sơ khiếu nại thực tế thay thế mock
    const staffCasesRes = await fetch(`${baseUrl}/api/v1/support/cases`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffCasesRes.status, 200);
    const staffCasesJson = (await staffCasesRes.json()) as any;
    assert.equal(staffCasesJson.success, true);
    assert.ok(Array.isArray(staffCasesJson.data));
    assert.equal(staffCasesJson.data.length, 3);

    // Đối chiếu với mock dashboard: CS-4021, CS-4018, CS-4012
    const caseIds = staffCasesJson.data.map((c: any) => c.id);
    assert.ok(caseIds.includes('CS-4021'));
    assert.ok(caseIds.includes('CS-4018'));
    assert.ok(caseIds.includes('CS-4012'));

    // 3. SUPPORT_STAFF xử lý phê duyệt khiếu nại: POST /api/v1/support/cases/:id/resolve
    const resolveRes = await fetch(`${baseUrl}/api/v1/support/cases/CS-4021/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        resolution: 'APPROVED',
        note: 'Đã xác thực sản phẩm lỗi theo ảnh của khách, đồng ý hoàn tiền.',
      }),
    });
    assert.equal(resolveRes.status, 200);
    const resolveJson = (await resolveRes.json()) as any;
    assert.equal(resolveJson.success, true);
    assert.equal(resolveJson.data.status, 'RESOLVED');
    assert.equal(
      resolveJson.data.resolutionNote,
      'Đã xác thực sản phẩm lỗi theo ảnh của khách, đồng ý hoàn tiền.',
    );

    // 4. Xử lý resolution không hợp lệ -> 400 Bad Request
    const invalidResolveRes = await fetch(`${baseUrl}/api/v1/support/cases/CS-4018/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        resolution: 'INVALID_STATUS',
        note: 'Ghi chú',
      }),
    });
    assert.equal(invalidResolveRes.status, 400);
  });
});
