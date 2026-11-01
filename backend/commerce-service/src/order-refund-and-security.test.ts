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

async function withCommerceServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
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

test('Reject Refund API: POST /api/v1/orders/:id/refund/cancel enforces RBAC, reason and updates timeline', async () => {
  await withCommerceServer(async (baseUrl) => {
    const buyerToken = createTestToken({
      sub: 'usr_buyer_01',
      email: 'buyer@nexus.vn',
      role: 'BUYER',
    });
    const staffToken = createTestToken({
      sub: 'usr_staff_01',
      email: 'staff@nexus.vn',
      role: 'SUPPORT_STAFF',
    });

    // 1. Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/orders/ord_01hqz555abc/refund/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Từ chối hoàn tiền' }),
    });
    assert.equal(unauthRes.status, 401);

    // 2. BUYER -> 403 (Buyer không có quyền từ chối hoàn tiền)
    const buyerRes = await fetch(`${baseUrl}/api/v1/orders/ord_01hqz555abc/refund/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ reason: 'Buyer tự từ chối' }),
    });
    assert.equal(buyerRes.status, 403);

    // 3. Thiếu lý do (reason) -> 400 Bad Request
    const noReasonRes = await fetch(`${baseUrl}/api/v1/orders/ord_01hqz555abc/refund/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(noReasonRes.status, 400);
    const noReasonJson = (await noReasonRes.json()) as any;
    assert.match(noReasonJson.error, /lý do/i);

    // 4. SUPPORT_STAFF từ chối hoàn tiền thành công -> 200 OK
    const rejectRes = await fetch(`${baseUrl}/api/v1/orders/ord_01hqz555abc/refund/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        reason: 'Sản phẩm đã qua sử dụng quá 30 ngày, vi phạm điều kiện đổi trả của sàn.',
      }),
    });
    assert.equal(rejectRes.status, 200);
    const rejectJson = (await rejectRes.json()) as any;
    assert.equal(rejectJson.success, true);
    assert.equal(rejectJson.data.id, 'ord_01hqz555abc');

    // Kiểm tra dòng trạng thái trong timeline
    const timeline = rejectJson.data.timeline;
    assert.ok(Array.isArray(timeline));
    const lastEvent = timeline[timeline.length - 1];
    assert.equal(lastEvent.status, 'REFUND_REJECTED');
    assert.match(lastEvent.note, /quá 30 ngày/);

    // 5. Kiểm tra alias endpoint POST /api/v1/orders/:id/reject-refund
    const aliasRes = await fetch(`${baseUrl}/api/v1/orders/ord_01hqz555abc/reject-refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        reason: 'Thử nghiệm alias route reject-refund',
      }),
    });
    assert.equal(aliasRes.status, 200);
  });
});

test('Security & IDOR prevention: GET /api/v1/orders enforces sellerId from JWT when role is SELLER', async () => {
  await withCommerceServer(async (baseUrl) => {
    const mySellerId = 'usr_seller_authentic_123';
    const otherSellerId = 'usr_seller_victim_456';

    const sellerToken = createTestToken({
      sub: mySellerId,
      email: 'seller@nexus.vn',
      role: 'SELLER',
    });
    const staffToken = createTestToken({
      sub: 'usr_staff_01',
      email: 'staff@nexus.vn',
      role: 'SUPPORT_STAFF',
    });

    // 1. SELLER cố tình truyền query ?sellerId=usr_seller_victim_456 để xem trộm đơn
    // Hệ thống PHẢI tự động ép sellerId = mySellerId (từ JWT)
    const sellerProbeRes = await fetch(`${baseUrl}/api/v1/orders?sellerId=${otherSellerId}`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    assert.equal(sellerProbeRes.status, 200);
    const probeJson = (await sellerProbeRes.json()) as any;
    assert.equal(probeJson.success, true);

    // Mọi đơn trả về (nếu có) PHẢI thuộc về mySellerId, tuyệt đối KHÔNG chứa đơn của otherSellerId
    for (const order of probeJson.data) {
      assert.equal(
        order.sellerId,
        mySellerId,
        'Seller không bao giờ được nhận đơn hàng của sellerId khác',
      );
    }

    // 2. SUPPORT_STAFF được phép tra cứu theo bất kỳ sellerId nào
    const staffQueryRes = await fetch(`${baseUrl}/api/v1/orders?sellerId=${otherSellerId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffQueryRes.status, 200);
    const staffJson = (await staffQueryRes.json()) as any;
    assert.equal(staffJson.success, true);
  });
});
