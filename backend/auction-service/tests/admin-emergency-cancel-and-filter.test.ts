import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import { createApplication } from '../src/app';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';
import { CancelAuctionUseCase } from '../src/application/use-cases/CancelAuctionUseCase';
import { UpdateAuctionUseCase } from '../src/application/use-cases/UpdateAuctionUseCase';

function createTestToken(payload: {
  id: string;
  email: string;
  role: string;
  fullName?: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, sub: payload.id, iat: now, exp: now + 3600 }),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev')
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('SCRUM-298: Admin Emergency Stop & Auction Management APIs', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    process.env.USE_IN_MEMORY_DB = 'true';
    process.env.SKIP_REDIS_HEALTHCHECK = 'true';
    const app = createApplication();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. CancelAuctionUseCase: Dừng khẩn cấp phiên đấu giá đang ACTIVE với lý do hợp lệ', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CancelAuctionUseCase(repo);

    const activeAuction = new Auction({
      id: 'auc_emergency_01',
      productId: 'prod_abnormal_99',
      sellerId: 'seller_suspect_01',
      title: 'Đấu giá nghi vấn bot đẩy giá',
      startingPrice: 1000000,
      currentHighestBid: 50000000,
      bidIncrement: 500000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(activeAuction);

    const result = await useCase.execute({
      auctionId: 'auc_emergency_01',
      sellerId: 'admin_sys',
      isAdmin: true,
      reason: 'Phát hiện hành vi gian lận thông thầu (Shill Bidding), dừng khẩn cấp để kiểm tra',
    });

    assert.strictEqual(result.auctionId, 'auc_emergency_01');
    assert.strictEqual(result.status, AuctionStatus.CANCELLED);
    assert.strictEqual(
      result.cancelReason,
      'Phát hiện hành vi gian lận thông thầu (Shill Bidding), dừng khẩn cấp để kiểm tra',
    );
    assert.ok(result.cancelledAt);

    const updated = await repo.findById('auc_emergency_01');
    assert.strictEqual(updated?.status, AuctionStatus.CANCELLED);
    assert.strictEqual(
      updated?.cancelReason,
      'Phát hiện hành vi gian lận thông thầu (Shill Bidding), dừng khẩn cấp để kiểm tra',
    );
    assert.ok(updated?.actualEndTime);
  });

  it('2. CancelAuctionUseCase: Bắt buộc phải có lý do hủy (reason) không được rỗng', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CancelAuctionUseCase(repo);

    const activeAuction = new Auction({
      id: 'auc_emergency_02',
      productId: 'prod_02',
      sellerId: 'seller_02',
      startingPrice: 500000,
      currentHighestBid: 500000,
      bidIncrement: 50000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(activeAuction);

    // Không truyền lý do
    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_emergency_02',
          sellerId: 'admin_sys',
          isAdmin: true,
        });
      },
      { message: 'Vui lòng cung cấp lý do hủy/dừng phiên đấu giá.' },
    );

    // Lý do chỉ toàn khoảng trắng
    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_emergency_02',
          sellerId: 'admin_sys',
          isAdmin: true,
          reason: '     ',
        });
      },
      { message: 'Vui lòng cung cấp lý do hủy/dừng phiên đấu giá.' },
    );
  });

  it('3. CancelAuctionUseCase: Chặn không cho hủy phiên đấu giá đã kết thúc (ENDED hoặc CANCELLED)', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CancelAuctionUseCase(repo);

    const endedAuction = new Auction({
      id: 'auc_ended_01',
      productId: 'prod_03',
      sellerId: 'seller_03',
      startingPrice: 500000,
      currentHighestBid: 1200000,
      bidIncrement: 50000,
      status: AuctionStatus.ENDED,
      startTime: new Date(Date.now() - 7200 * 1000),
      endTime: new Date(Date.now() - 3600 * 1000),
      actualEndTime: new Date(Date.now() - 3600 * 1000),
    });
    await repo.create(endedAuction);

    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_ended_01',
          sellerId: 'admin_sys',
          isAdmin: true,
          reason: 'Thử hủy phiên đã kết thúc',
        });
      },
      { message: 'Không thể hủy phiên đấu giá đã kết thúc.' },
    );
  });

  it('4. UpdateAuctionUseCase: Không cho sửa cấu hình phiên đang active (Jira SCRUM-298 requirement)', async () => {
    const repo = new InMemoryAuctionRepository();
    const updateUseCase = new UpdateAuctionUseCase(repo);

    const activeAuction = new Auction({
      id: 'auc_active_locked',
      productId: 'prod_04',
      sellerId: 'seller_04',
      title: 'Phiên đấu giá đang diễn ra',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(activeAuction);

    await assert.rejects(
      async () => {
        await updateUseCase.execute({
          auctionId: 'auc_active_locked',
          sellerId: 'admin_sys',
          isAdmin: true,
          title: 'Cố tình sửa tiêu đề phiên active',
        });
      },
      { message: 'Chỉ có thể chỉnh sửa phiên đấu giá khi chưa bắt đầu (SCHEDULED).' },
    );
  });

  it('5. HTTP POST /api/v1/auctions/:id/cancel: Admin thực hiện dừng khẩn cấp và trả về đầy đủ metadata', async () => {
    const adminToken = createTestToken({
      id: 'usr_admin_01',
      email: 'admin@nexus.test',
      role: 'ADMIN',
      fullName: 'Quản trị viên Nexus',
    });

    // Tạo phiên đấu giá mới qua API
    const createRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: 'prod_live_test_01',
        sellerId: 'usr_seller_01',
        title: 'Phiên đấu giá khẩn cấp HTTP test',
        startPrice: 2000000,
        bidStep: 100000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    const createJson = (await createRes.json()) as any;
    assert.strictEqual(createRes.status, 201);
    const createdAuctionId = createJson.data.id;

    // Admin gọi POST /api/v1/auctions/:id/cancel
    const cancelRes = await fetch(`${baseUrl}/api/v1/auctions/${createdAuctionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Phát hiện tài khoản ảo liên tục trả giá sai quy định',
      }),
    });
    const cancelJson = (await cancelRes.json()) as any;
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelJson.success, true);
    assert.strictEqual(cancelJson.data.status, 'CANCELLED');
    assert.strictEqual(
      cancelJson.data.cancelReason,
      'Phát hiện tài khoản ảo liên tục trả giá sai quy định',
    );

    // Kiểm tra lại chi tiết qua GET /api/v1/auctions/:id
    const detailRes = await fetch(`${baseUrl}/api/v1/auctions/${createdAuctionId}`);
    const detailJson = (await detailRes.json()) as any;
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailJson.data.status, 'CANCELLED');
    assert.strictEqual(
      detailJson.data.cancelReason,
      'Phát hiện tài khoản ảo liên tục trả giá sai quy định',
    );
  });

  it('6. HTTP POST /api/v1/auctions/:id/emergency-stop: Hỗ trợ alias route cho Admin dừng khẩn cấp', async () => {
    const adminToken = createTestToken({
      id: 'usr_admin_01',
      email: 'admin@nexus.test',
      role: 'ADMIN',
    });

    const createRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: 'prod_alias_test',
        sellerId: 'usr_seller_02',
        title: 'Phiên đấu giá kiểm tra alias route',
        startPrice: 1500000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    const createJson = (await createRes.json()) as any;
    const auctionId = createJson.data.id;

    const stopRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/emergency-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Khẩn cấp: Tranh chấp sở hữu sản phẩm',
      }),
    });
    const stopJson = (await stopRes.json()) as any;
    assert.strictEqual(stopRes.status, 200);
    assert.strictEqual(stopJson.data.status, 'CANCELLED');
  });

  it('7. RBAC: BUYER bị chặn 403 khi gọi API dừng/hủy phiên đấu giá', async () => {
    const buyerToken = createTestToken({
      id: 'usr_buyer_01',
      email: 'buyer@nexus.test',
      role: 'BUYER',
    });

    const res = await fetch(`${baseUrl}/api/v1/auctions/auc_any_id/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        reason: 'Người mua muốn hủy phiên của người khác',
      }),
    });
    assert.strictEqual(res.status, 403);
  });

  it('8. GET /api/v1/auctions: Hỗ trợ lọc theo sellerId, status: "all", và từ khóa q', async () => {
    const adminToken = createTestToken({
      id: 'usr_admin_01',
      email: 'admin@nexus.test',
      role: 'ADMIN',
    });

    // 8.1 Lấy toàn bộ với status=all
    const resAll = await fetch(`${baseUrl}/api/v1/auctions?status=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonAll = (await resAll.json()) as any;
    assert.strictEqual(resAll.status, 200);
    assert.ok(Array.isArray(jsonAll.data));
    assert.ok(jsonAll.data.length > 0);

    // 8.2 Lọc theo sellerId cụ thể
    const resSeller = await fetch(`${baseUrl}/api/v1/auctions?sellerId=usr_seller_01&status=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonSeller = (await resSeller.json()) as any;
    assert.strictEqual(resSeller.status, 200);
    assert.ok(jsonSeller.data.every((a: any) => a.sellerId === 'usr_seller_01'));

    // 8.3 Tìm kiếm theo từ khóa q
    const resSearch = await fetch(`${baseUrl}/api/v1/auctions?q=alias`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonSearch = (await resSearch.json()) as any;
    assert.strictEqual(resSearch.status, 200);
    assert.ok(jsonSearch.data.some((a: any) => a.title?.toLowerCase().includes('alias')));
  });
});
