import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from './app';

async function withUserServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin.status.test@nexus-ecommerce.com';
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

test('PATCH /api/v1/users/:id/status enforces RBAC, audit reason, status update and session revocation', async () => {
  await withUserServer(async (baseUrl) => {
    // 1. Khách vãng lai gọi vào -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUSPENDED', reason: 'Tài khoản có dấu hiệu gian lận' }),
    });
    assert.equal(unauthRes.status, 401);

    // 2. Đăng nhập tài khoản BUYER (chuẩn bị để test bị khóa)
    const buyerLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(buyerLoginRes.status, 200);
    const buyerToken = ((await buyerLoginRes.json()) as any).data.accessToken;

    // BUYER cố tình gọi API khóa tài khoản khác -> 403 Forbidden
    const buyerLockRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED', reason: 'Buyer cố tình khóa' }),
    });
    assert.equal(buyerLockRes.status, 403, 'Buyer không có quyền USER.UPDATE');

    // 3. Đăng nhập tài khoản SUPPORT_STAFF (có quyền USER.UPDATE)
    const staffLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff.test@nexus-ecommerce.com',
        password: 'Password123!',
      }),
    });
    assert.equal(staffLoginRes.status, 200);
    const staffToken = ((await staffLoginRes.json()) as any).data.accessToken;

    // 4. Test validation: Thiếu reason -> 400 Bad Request
    const noReasonRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    assert.equal(noReasonRes.status, 400);
    const noReasonJson = (await noReasonRes.json()) as any;
    assert.match(noReasonJson.error, /lý do/i);

    // 5. Test validation: Status không hợp lệ -> 400 Bad Request
    const invalidStatusRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ status: 'BANNED_FOREVER', reason: 'Lý do hợp lệ' }),
    });
    assert.equal(invalidStatusRes.status, 400);

    // 6. Test 404: User không tồn tại
    const notFoundRes = await fetch(`${baseUrl}/api/v1/users/usr_non_existent/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED', reason: 'Không tìm thấy' }),
    });
    assert.equal(notFoundRes.status, 404);

    // 7. Support Staff thực hiện KHÓA tài khoản (ACTIVE -> SUSPENDED)
    const lockSuccessRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        status: 'SUSPENDED',
        reason: 'Phát hiện nghi vấn buff giá đấu giá ảo (SRS 2.3)',
      }),
    });
    assert.equal(lockSuccessRes.status, 200);
    const lockJson = (await lockSuccessRes.json()) as any;
    assert.equal(lockJson.success, true);
    assert.equal(lockJson.data.status, 'SUSPENDED');
    assert.equal(lockJson.data.reason, 'Phát hiện nghi vấn buff giá đấu giá ảo (SRS 2.3)');

    // 8. KIỂM TRA THU HỒI PHIÊN (Session Revocation): Token của buyerToken phải bị chặn 401 ngay lập tức
    const profileAfterSuspendedRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(
      profileAfterSuspendedRes.status,
      401,
      'Khi tài khoản bị SUSPENDED, token hiện tại phải bị vô hiệu hóa ngay',
    );

    // 9. Support Staff thực hiện MỞ KHÓA tài khoản (SUSPENDED -> ACTIVE)
    const unlockSuccessRes = await fetch(`${baseUrl}/api/v1/users/usr_01hqz789abc/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        reason: 'Đã xác minh thông tin minh bạch, gỡ đình chỉ',
      }),
    });
    assert.equal(unlockSuccessRes.status, 200);
    const unlockJson = (await unlockSuccessRes.json()) as any;
    assert.equal(unlockJson.success, true);
    assert.equal(unlockJson.data.status, 'ACTIVE');
  });
});
