import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import test from 'node:test';
import { createApplication } from './app';
import { getCommerceDbPool } from './infrastructure/database/pgPool';
import { PrismaClientWrapper } from './infrastructure/database/PrismaClient';
import { PostgresAdminOrderReader } from './infrastructure/repositories/PostgresAdminOrderReader';
import { PostgresPromotionRepository } from './infrastructure/repositories/PostgresPromotionRepository';
import { AdminDashboardReportService } from './application/admin/AdminDashboardReportService';
import { AdminPromotionService } from './application/admin/AdminPromotionService';

function createTestToken(payload: { sub: string; email: string; role: string }): string {
  const secret =
    process.env.JWT_ACCESS_SECRET || 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';
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

async function isPortOpen(port: number, host = '127.0.0.1', timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
}

const adminToken = createTestToken({
  sub: 'admin-test-01',
  email: 'admin@nexus.test',
  role: 'ADMIN',
});

const buyerToken = createTestToken({
  sub: 'buyer-test-01',
  email: 'buyer@nexus.test',
  role: 'BUYER',
});

const sellerToken = createTestToken({
  sub: 'seller-test-01',
  email: 'seller@nexus.test',
  role: 'SELLER',
});

test('🎯 [ADMIN COMMERCE] Live DB & API Suite (SRS A15 / B14)', async (t) => {
  const isDbLive = await isPortOpen(5434);
  assert.ok(
    isDbLive,
    'Cơ sở dữ liệu PostgreSQL nexus_commerce_db (port 5434) phải đang hoạt động.',
  );

  const pool = getCommerceDbPool();
  const prisma = PrismaClientWrapper.getInstance();
  const pgOrderReader = new PostgresAdminOrderReader(prisma);
  const pgPromoRepo = new PostgresPromotionRepository(pool, prisma);

  const reportService = new AdminDashboardReportService(pgOrderReader);
  const promoService = new AdminPromotionService(pgPromoRepo);

  // Khởi động server HTTP thật trên cổng ngẫu nhiên để kiểm thử toàn diện 9 API
  const app = createApplication();
  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test(
    '1. RBAC Guard: Toàn bộ 9 endpoint chặn 401 khi không có token và 403 khi không phải ADMIN',
    async () => {
      const endpoints: Array<{ method: string; path: string; body?: any }> = [
        { method: 'GET', path: '/api/v1/orders/admin/dashboard-summary' },
        { method: 'GET', path: '/api/v1/orders/admin/reports' },
        { method: 'GET', path: '/api/v1/orders/admin/reports/export' },
        { method: 'GET', path: '/api/v1/checkout/admin/promotions' },
        {
          method: 'POST',
          path: '/api/v1/checkout/admin/promotions',
          body: {
            code: 'TEST_RBAC',
            name: 'Test',
            discountType: 'FIXED',
            discountValue: 10000,
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 86400000),
          },
        },
        {
          method: 'PUT',
          path: '/api/v1/checkout/admin/promotions/dummy-id',
          body: { name: 'New' },
        },
        {
          method: 'PATCH',
          path: '/api/v1/checkout/admin/promotions/dummy-id/status',
          body: { status: 'PAUSED' },
        },
        { method: 'DELETE', path: '/api/v1/checkout/admin/promotions/dummy-id' },
        { method: 'GET', path: '/api/v1/checkout/admin/promotions/dummy-id/usages' },
      ];

      for (const ep of endpoints) {
        // 1.1 Không có token -> Phải trả về 401
        const resNoAuth = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: ep.body ? { 'Content-Type': 'application/json' } : {},
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        assert.equal(
          resNoAuth.status,
          401,
          `Endpoint ${ep.method} ${ep.path} phải trả 401 khi thiếu JWT.`,
        );

        // 1.2 Token BUYER -> Phải trả về 403
        const resBuyer = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: {
            Authorization: `Bearer ${buyerToken}`,
            ...(ep.body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        assert.equal(
          resBuyer.status,
          403,
          `Endpoint ${ep.method} ${ep.path} phải trả 403 khi role là BUYER.`,
        );

        // 1.3 Token SELLER -> Phải trả về 403
        const resSeller = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: {
            Authorization: `Bearer ${sellerToken}`,
            ...(ep.body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        assert.equal(
          resSeller.status,
          403,
          `Endpoint ${ep.method} ${ep.path} phải trả 403 khi role là SELLER.`,
        );
      }
    },
  );

  await t.test(
    '2. Dashboard Summary: GET /api/v1/orders/admin/dashboard-summary tổng hợp số liệu thực',
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/admin/dashboard-summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200, 'Admin phải truy cập được dashboard summary');
      const json = JSON.parse(await res.text());
      assert.equal(json.success, true);
      assert.ok(json.data.orders, 'Phải có trường orders');
      assert.equal(typeof json.data.orders.pendingProcessing, 'number');
      assert.equal(typeof json.data.orders.refundPending, 'number');
      assert.equal(typeof json.data.orders.todayCount, 'number');
      assert.equal(typeof json.data.orders.todayRevenue, 'number');
      assert.equal(typeof json.data.orders.monthRevenue, 'number');
      assert.ok(json.data.generatedAt, 'Phải có thời điểm tạo generatedAt');
    },
  );

  await t.test(
    '3. Báo cáo vận hành: GET /api/v1/orders/admin/reports tính đúng KPI & kiểm tra điều kiện biên',
    async () => {
      // 3.1 Sai thứ tự ngày (from > to) -> 400
      const resInvalid = await fetch(
        `${baseUrl}/api/v1/orders/admin/reports?from=2026-12-01&to=2026-11-01`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      assert.equal(resInvalid.status, 400, 'from > to phải trả về 400 INVALID_DATE_RANGE');
      const errJson = JSON.parse(await resInvalid.text());
      assert.equal(errJson.success, false);

      // 3.2 Hợp lệ -> 200 và tính toán chuẩn
      const resValid = await fetch(
        `${baseUrl}/api/v1/orders/admin/reports?from=2026-11-01&to=2026-11-24&granularity=day`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      assert.equal(resValid.status, 200);
      const reportJson = JSON.parse(await resValid.text());
      assert.equal(reportJson.success, true);
      const sum = reportJson.data.summary;
      assert.equal(typeof sum.netRevenue, 'number');
      assert.equal(typeof sum.grossRevenue, 'number');
      assert.equal(typeof sum.refundedAmount, 'number');
      assert.equal(
        sum.netRevenue,
        Math.max(0, sum.grossRevenue - sum.refundedAmount),
        'netRevenue = grossRevenue - refundedAmount',
      );
      assert.ok(Array.isArray(reportJson.data.rows), 'rows phải là mảng');
    },
  );

  await t.test(
    '4. Xuất CSV UTF-8 BOM: GET /api/v1/orders/admin/reports/export xuất tệp tiếng Việt chuẩn Excel',
    async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/orders/admin/reports/export?from=2026-11-01&to=2026-11-24&format=csv`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/csv'));
      assert.ok(
        res.headers.get('content-disposition')?.includes('attachment; filename="nexus-report-'),
      );

      const buffer = Buffer.from(await res.arrayBuffer());
      // Kiểm tra 3 byte đầu tiên là UTF-8 BOM: 0xEF, 0xBB, 0xBF
      assert.equal(buffer[0], 0xef, 'Byte đầu tiên phải là 0xEF');
      assert.equal(buffer[1], 0xbb, 'Byte thứ hai phải là 0xBB');
      assert.equal(buffer[2], 0xbf, 'Byte thứ ba phải là 0xBF');

      const csvText = buffer.toString('utf8');
      assert.ok(csvText.includes('Kỳ báo cáo,Số đơn hàng,Đơn hoàn tất'));
      assert.ok(csvText.includes('TỔNG CỘNG'));
    },
  );

  await t.test(
    '5. Quản lý khuyến mãi: Vòng đời CRUD, kiểm soát validation và chống xóa mã đã dùng',
    async () => {
      const testCode = `ADM_${Date.now().toString().slice(-6)}`;

      // 5.1 Bắt lỗi regex code không hợp lệ
      const resInvalidCode = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'khong_hop_le@',
          name: 'Mã lỗi',
          discountType: 'FIXED',
          discountValue: 10000,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      assert.equal(resInvalidCode.status, 400, 'Regex code sai phải trả 400');

      // 5.2 Bắt lỗi PERCENT không có maxDiscountAmount
      const resPercentNoMax = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `${testCode}_P`,
          name: 'Giảm 20%',
          discountType: 'PERCENT',
          discountValue: 20,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      assert.equal(
        resPercentNoMax.status,
        400,
        'Giảm PERCENT thiếu maxDiscountAmount phải trả 400',
      );

      // 5.3 Tạo mã FIXED thành công
      const resCreate = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testCode,
          name: 'Voucher Khuyến Mãi Test Admin',
          description: 'Voucher test hệ thống admin',
          discountType: 'FIXED',
          discountValue: 50000,
          maxDiscountAmount: 50000,
          minOrderAmount: 200000,
          usageLimit: 100,
          perUserLimit: 2,
          scope: 'ALL_USERS',
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        }),
      });
      assert.equal(resCreate.status, 201, 'Tạo voucher hợp lệ phải trả 201');
      const createdJson = JSON.parse(await resCreate.text());
      assert.equal(createdJson.success, true);
      const promoId = createdJson.data.id;
      assert.ok(promoId, 'Phải có id sinh ra');

      // 5.4 Bắt lỗi trùng mã code -> 409
      const resDuplicate = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testCode,
          name: 'Trùng mã',
          discountType: 'FIXED',
          discountValue: 10000,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      assert.equal(resDuplicate.status, 409, 'Mã trùng phải trả 409 PROMOTION_CODE_EXISTS');

      // 5.5 Tra cứu danh sách phân trang và tính toán displayStatus
      const resList = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions?q=${testCode}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resList.status, 200);
      const listJson = JSON.parse(await resList.text());
      assert.equal(listJson.success, true);
      assert.ok(listJson.data.length >= 1);
      assert.equal(listJson.data[0].code, testCode);
      assert.equal(listJson.data[0].displayStatus, 'ACTIVE');

      // 5.6 Cập nhật thông tin voucher
      const resUpdate = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions/${promoId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Voucher Khuyến Mãi Test Admin (Đã cập nhật)',
          usageLimit: 150,
        }),
      });
      assert.equal(resUpdate.status, 200);
      const updateJson = JSON.parse(await resUpdate.text());
      assert.equal(updateJson.data.name, 'Voucher Khuyến Mãi Test Admin (Đã cập nhật)');
      assert.equal(updateJson.data.usageLimit, 150);

      // 5.7 Tạm dừng voucher (PATCH status = PAUSED)
      const resPause = await fetch(
        `${baseUrl}/api/v1/checkout/admin/promotions/${promoId}/status`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'PAUSED',
            reason: 'Tạm dừng chạy thử nghiệm',
          }),
        },
      );
      assert.equal(resPause.status, 200);
      const pauseJson = JSON.parse(await resPause.text());
      assert.equal(pauseJson.data.status, 'PAUSED');

      // 5.8 Giáp lập lượt dùng thực tế trong DB: Ghi nhận 1 usage (orderId có thể null hoặc nối với đơn thật)
      await pgPromoRepo.recordUsageAndIncrement({
        promotionId: promoId,
        userId: 'test_buyer_id_01',
        orderId: null,
        discountAmount: 50000,
      });

      // Kiểm tra tra cứu lịch sử GET /usages
      const resUsages = await fetch(
        `${baseUrl}/api/v1/checkout/admin/promotions/${promoId}/usages`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      assert.equal(resUsages.status, 200);
      const usagesJson = JSON.parse(await resUsages.text());
      assert.equal(usagesJson.success, true);
      assert.equal(usagesJson.data.length, 1);
      assert.equal(usagesJson.data[0].userId, 'test_buyer_id_01');

      // 5.9 Thử đổi code khi usedCount > 0 -> Phải bị khóa (409)
      const resLockCode = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions/${promoId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `${testCode}_NEW`,
        }),
      });
      assert.equal(
        resLockCode.status,
        409,
        'Đã phát sinh lượt dùng thì không được đổi mã code (409)',
      );

      // 5.10 Thử hạ usageLimit < usedCount (usedCount = 1) -> Phải bị từ chối (400)
      const resLowLimit = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions/${promoId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usageLimit: 0,
        }),
      });
      assert.equal(resLowLimit.status, 400, 'Không được hạ hạn mức thấp hơn số lượt đã dùng (400)');

      // 5.11 Thử xóa khi usedCount > 0 -> Phải bị từ chối (409)
      const resDeleteBlocked = await fetch(
        `${baseUrl}/api/v1/checkout/admin/promotions/${promoId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      assert.equal(resDeleteBlocked.status, 409, 'Không được xóa mã đã có đơn hàng sử dụng (409)');

      // 5.12 Tạo một mã chưa dùng và xóa thành công -> 200
      const unusedCode = `UNU_${Date.now().toString().slice(-6)}`;
      const resCreateUnused = await fetch(`${baseUrl}/api/v1/checkout/admin/promotions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: unusedCode,
          name: 'Mã chưa dùng',
          discountType: 'FIXED',
          discountValue: 10000,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      assert.equal(resCreateUnused.status, 201);
      const unusedId = JSON.parse(await resCreateUnused.text()).data.id;

      const resDeleteSuccess = await fetch(
        `${baseUrl}/api/v1/checkout/admin/promotions/${unusedId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      assert.equal(resDeleteSuccess.status, 200, 'Mã chưa từng dùng phải xóa thành công (200)');
    },
  );
});
