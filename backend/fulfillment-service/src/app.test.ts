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

async function withFulfillmentServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
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

test('GET /health returns UP with fulfillment-service details', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.status, 'UP');
    assert.equal(json.service, 'fulfillment-service');
  });
});

test('GET /api/v1/fulfillments/shipments enforces RBAC: 401 when unauthenticated, 403 for BUYER, 200 for SUPPORT_STAFF', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/fulfillments/shipments`);
    assert.equal(unauthRes.status, 401);

    // 2. Authenticate as BUYER -> 403
    const buyerToken = createTestToken({
      sub: 'usr_buyer_123',
      email: 'buyer@example.com',
      role: 'BUYER',
    });
    const buyerForbiddenRes = await fetch(`${baseUrl}/api/v1/fulfillments/shipments`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(buyerForbiddenRes.status, 403);

    // 3. Authenticate as SUPPORT_STAFF -> 200 OK
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });
    const staffListRes = await fetch(`${baseUrl}/api/v1/fulfillments/shipments`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffListRes.status, 200);
    const staffJson = (await staffListRes.json()) as any;
    assert.equal(staffJson.success, true);
    assert.ok(Array.isArray(staffJson.data));
    assert.ok(staffJson.data.length >= 3);
    assert.ok(staffJson.pagination);
    assert.equal(staffJson.pagination.page, 1);

    // Kiểm tra cấu trúc tương thích với màn hình Tra cứu vận đơn (/support/shipments)
    const firstShipment = staffJson.data[0];
    assert.ok(firstShipment.code);
    assert.ok(firstShipment.order);
    assert.ok(firstShipment.carrier);
    assert.ok(firstShipment.recipient);
    assert.ok(firstShipment.city);
    assert.ok(firstShipment.status);
    assert.ok(firstShipment.updated);

    // 4. Lọc theo từ khóa query=GHTK5908112
    const searchRes = await fetch(`${baseUrl}/api/v1/fulfillments/shipments?query=GHTK5908112`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(searchRes.status, 200);
    const searchJson = (await searchRes.json()) as any;
    assert.equal(searchJson.data.length, 1);
    assert.equal(searchJson.data[0].code, 'GHTK5908112');
    assert.equal(searchJson.data[0].carrier, 'GHTK');
  });
});

test('GET /api/v1/fulfillments/shipments/:id returns full shipment profile with timeline and tracking info', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });

    // 1. Tìm theo mã vận đơn GHN8829103VN
    const res = await fetch(`${baseUrl}/api/v1/fulfillments/shipments/GHN8829103VN`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.code, 'GHN8829103VN');
    assert.equal(json.data.order, 'NX-ORD-8021');
    assert.equal(json.data.carrier, 'GHN');
    assert.equal(json.data.recipient, 'Minh Anh');
    assert.equal(json.data.city, 'TP. Hồ Chí Minh');
    assert.ok(Array.isArray(json.data.timeline));
    assert.ok(json.data.timeline.length >= 3);

    // 2. Tìm không tồn tại -> 404
    const notFoundRes = await fetch(`${baseUrl}/api/v1/fulfillments/shipments/UNKNOWN_CODE_999`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(notFoundRes.status, 404);
  });
});

test('PATCH /api/v1/fulfillments/shipments/:id/status allows updating status and location', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });

    const res = await fetch(`${baseUrl}/api/v1/fulfillments/shipments/GHN8829103VN/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'OUT_FOR_DELIVERY',
        location: 'Bưu cục Quận 1 · Đang phát cho khách',
        note: 'Bưu tá đã liên hệ khách hẹn giao 15:00',
      }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.statusCode, 'OUT_FOR_DELIVERY');
    assert.equal(json.data.status, 'Đang phát hàng');
    assert.equal(json.data.currentLocation, 'Bưu cục Quận 1 · Đang phát cho khách');
  });
});

test('PATCH /api/v1/fulfillments/shipments/:id/override allows manual correction by SUPPORT_STAFF', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });

    const res = await fetch(`${baseUrl}/api/v1/fulfillments/shipments/GHN8829103VN/override`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city: 'Bình Dương',
        shippingAddress: 'Khu công nghiệp VSIP 1, Thuận An, Bình Dương',
        reason: 'Khách hàng đổi địa chỉ nhận hàng đột xuất',
      }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.city, 'Bình Dương');
    assert.equal(json.data.shippingAddress, 'Khu công nghiệp VSIP 1, Thuận An, Bình Dương');
  });
});

test('GET /api/v1/support/dashboard/summary provides aggregated statistics for Support Staff dashboard', async () => {
  await withFulfillmentServer(async (baseUrl) => {
    const staffToken = createTestToken({
      sub: 'usr_staff_001',
      email: 'staff@example.com',
      role: 'SUPPORT_STAFF',
    });

    // 1. Gọi qua prefix /api/v1/support/dashboard/summary
    const res = await fetch(`${baseUrl}/api/v1/support/dashboard/summary`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.equal(json.data.pendingCases, 8);
    assert.equal(json.data.processingCases, 5);
    assert.equal(json.data.resolvedToday, 17);
    assert.equal(json.data.flaggedShipments, 4);
    assert.ok(Array.isArray(json.data.recentCases));
    assert.ok(json.data.recentCases.length >= 3);

    // 2. Gọi qua prefix /api/v1/fulfillments/dashboard/summary
    const res2 = await fetch(`${baseUrl}/api/v1/fulfillments/dashboard/summary`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(res2.status, 200);
    const json2 = (await res2.json()) as any;
    assert.equal(json2.success, true);
    assert.equal(json2.data.pendingCases, 8);
  });
});
