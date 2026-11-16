import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import { createApplication } from '../src/app';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import {
  createPostgresAuctionTransaction,
  TransactionalAuctionRepository,
} from '../src/infrastructure/repositories/TransactionalAuctionRepository';
import { createAuctionMutations } from '../src/application/auction-mutations';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';
import { CancelAuctionUseCase } from '../src/application/use-cases/CancelAuctionUseCase';
import { UpdateAuctionUseCase } from '../src/application/use-cases/UpdateAuctionUseCase';
import { PlaceBidUseCase } from '../src/application/use-cases/PlaceBidUseCase';
import { BuyNowUseCase } from '../src/application/use-cases/BuyNowUseCase';
import { PrismaClient } from '../src/infrastructure/database/generated/client';

function createTestToken(
  payload: {
    id: string;
    email: string;
    role: string;
    fullName?: string;
  },
  secret: string = 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev',
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, sub: payload.id, iat: now, exp: now + 3600 }),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
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
      id: '01932f01-0001-7000-8000-000000000001',
      productId: '01932f01-0001-7000-8000-000000000001',
      sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
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
      auctionId: '01932f01-0001-7000-8000-000000000001',
      sellerId: 'admin_sys',
      isAdmin: true,
      reason: 'Phát hiện hành vi gian lận thông thầu (Shill Bidding), dừng khẩn cấp để kiểm tra',
    });

    assert.strictEqual(result.auctionId, '01932f01-0001-7000-8000-000000000001');
    assert.strictEqual(result.status, AuctionStatus.CANCELLED);
    assert.strictEqual(
      result.cancelReason,
      'Phát hiện hành vi gian lận thông thầu (Shill Bidding), dừng khẩn cấp để kiểm tra',
    );
    assert.ok(result.cancelledAt);

    const updated = await repo.findById('01932f01-0001-7000-8000-000000000001');
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
      id: '01932f01-0002-7000-8000-000000000002',
      productId: 'prod_02',
      sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
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
          auctionId: '01932f01-0002-7000-8000-000000000002',
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
          auctionId: '01932f01-0002-7000-8000-000000000002',
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
      id: '01932f01-0003-7000-8000-000000000003',
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
          auctionId: '01932f01-0003-7000-8000-000000000003',
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
      id: '01932f01-0004-7000-8000-000000000004',
      productId: 'prod_04',
      sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
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
          auctionId: '01932f01-0004-7000-8000-000000000004',
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
      id: '01a15822-3be8-7505-a081-e0e45bd2e15e',
      email: 'admin@gmail.com',
      role: 'ADMIN',
      fullName: 'Admin Quản Trị Viên',
    });

    // Tạo phiên đấu giá mới qua API
    const createRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: '01932f01-0005-7000-8000-000000000005',
        sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
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

    // Kiểm tra lại chi tiết qua GET /api/v1/auctions/:id (với token Admin)
    const detailRes = await fetch(`${baseUrl}/api/v1/auctions/${createdAuctionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailJson = (await detailRes.json()) as any;
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailJson.data.status, 'CANCELLED');
    assert.strictEqual(
      detailJson.data.cancelReason,
      'Phát hiện tài khoản ảo liên tục trả giá sai quy định',
    );
  });

  it('6. HTTP POST /api/v1/auctions/:id/emergency-stop: Chỉ ADMIN/SUPPORT_STAFF được gọi với reason bắt buộc, chặn SELLER 403', async () => {
    const adminToken = createTestToken({
      id: '01a15822-3be8-7505-a081-e0e45bd2e15e',
      email: 'admin@gmail.com',
      role: 'ADMIN',
    });
    const staffToken = createTestToken({
      id: '01a15822-47a0-78fd-83de-477ceaa393a7',
      email: 'staff@gmail.com',
      role: 'SUPPORT_STAFF',
    });
    const sellerToken = createTestToken({
      id: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
      email: 'seller@gmail.com',
      role: 'SELLER',
    });

    const createRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: '01932f01-0006-7000-8000-000000000006',
        sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
        title: 'Phiên đấu giá kiểm tra alias route',
        startPrice: 1500000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    const createJson = (await createRes.json()) as any;
    const auctionId = createJson.data.id;

    // 6.1 Seller gọi emergency-stop -> 403 Forbidden
    const sellerRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/emergency-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({ reason: 'Seller cố tình gọi emergency stop' }),
    });
    assert.strictEqual(sellerRes.status, 403);

    // 6.2 Admin gọi emergency-stop mà KHÔNG gửi reason -> 400 Bad Request
    const noReasonRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/emergency-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(noReasonRes.status, 400);

    // 6.3 Admin gọi emergency-stop với reason rỗng sau trim -> 400 Bad Request
    const blankReasonRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/emergency-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: '     ' }),
    });
    assert.strictEqual(blankReasonRes.status, 400);

    // 6.4 Staff gọi emergency-stop với reason hợp lệ -> 200 CANCELLED
    const stopRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/emergency-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        reason: 'Khẩn cấp: Tranh chấp sở hữu sản phẩm',
      }),
    });
    const stopJson = (await stopRes.json()) as any;
    assert.strictEqual(stopRes.status, 200);
    assert.strictEqual(stopJson.data.status, 'CANCELLED');
    assert.strictEqual(stopJson.data.cancelReason, 'Khẩn cấp: Tranh chấp sở hữu sản phẩm');

    const repeatedStop = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/emergency-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Lý do khác' }),
    });
    assert.strictEqual(repeatedStop.status, 409);
  });

  it('7. HTTP DELETE /api/v1/auctions/:id: Hồi quy Seller DELETE phiên của chính mình (hỗ trợ không body)', async () => {
    const sellerId = '01a15822-3fd0-7b39-ad01-f11da72d5b80';
    const sellerToken = createTestToken({
      id: sellerId,
      email: 'seller@gmail.com',
      role: 'SELLER',
    });

    const createRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        productId: '01932f01-0007-7000-8000-000000000007',
        title: 'Phiên đấu giá test Seller DELETE',
        startPrice: 1000000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    const createJson = (await createRes.json()) as any;
    assert.strictEqual(createRes.status, 201);
    const auctionId = createJson.data.id;

    // Seller gọi DELETE không kèm body JSON -> tự động dùng lý do mặc định
    const deleteRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const deleteJson = (await deleteRes.json()) as any;
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteJson.data.status, 'CANCELLED');
    assert.strictEqual(deleteJson.data.cancelReason, 'Hủy theo yêu cầu của người bán');
  });

  it('8. RBAC & Anti-Spoofing: Từ chối request không có JWT dù tự gửi header x-user-* và kiểm soát vai trò', async () => {
    // 8.1 Giả mạo header x-user-id & x-user-role: ADMIN nhưng KHÔNG có Authorization JWT
    const spoofRes = await fetch(`${baseUrl}/api/v1/auctions/auc_any/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'hacker_01',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({ reason: 'Giả mạo quyền admin' }),
    });
    assert.strictEqual(spoofRes.status, 401);

    // 8.2 BUYER bị chặn 403 khi cố tình dừng khẩn cấp
    const buyerToken = createTestToken({
      id: '01a15822-43b8-78c3-a246-16bff78bc6e8',
      email: 'buyer@gmail.com',
      role: 'BUYER',
    });
    const buyerRes = await fetch(`${baseUrl}/api/v1/auctions/auc_any/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ reason: 'Người mua muốn hủy' }),
    });
    assert.strictEqual(buyerRes.status, 403);

    // 8.3 SUPPORT_STAFF có quyền dừng khẩn cấp phiên đấu giá
    const staffToken = createTestToken({
      id: '01a15822-47a0-78fd-83de-477ceaa393a7',
      email: 'staff@gmail.com',
      role: 'SUPPORT_STAFF',
    });
    const adminToken = createTestToken({
      id: '01a15822-3be8-7505-a081-e0e45bd2e15e',
      email: 'admin@gmail.com',
      role: 'ADMIN',
    });
    const createRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: '01932f01-0008-7000-8000-000000000008',
        sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
        title: 'Phiên test quyền Staff',
        startPrice: 500000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    const createJson = (await createRes.json()) as any;
    const staffStopRes = await fetch(`${baseUrl}/api/v1/auctions/${createJson.data.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ reason: 'Staff phát hiện gian lận' }),
    });
    assert.strictEqual(staffStopRes.status, 200);

    // 8.4 SUPPORT_STAFF KHÔNG được quyền tạo phiên (POST /) hoặc sửa phiên (PUT /:id) của seller khác
    const staffCreateRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        productId: 'prod_illegal_staff',
        title: 'Staff tự ý tạo phiên',
        startPrice: 1000000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    assert.strictEqual(staffCreateRes.status, 403);

    const staffUpdateRes = await fetch(`${baseUrl}/api/v1/auctions/${createJson.data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ title: 'Staff tự ý sửa phiên' }),
    });
    assert.strictEqual(staffUpdateRes.status, 403);
  });

  it('9. Concurrency & Race Conditions: Hủy và Bid / Buy-Now cạnh tranh xử lý nhất quán', async () => {
    const repo = new InMemoryAuctionRepository();
    const cancelUseCase = new CancelAuctionUseCase(repo);
    const placeBidUseCase = new PlaceBidUseCase(repo);
    const buyNowUseCase = new BuyNowUseCase(repo);

    // Thứ tự 1: HỦY TRƯỚC, BID / BUY-NOW ĐẾN SAU
    const auction1 = new Auction({
      id: 'auc_race_01',
      productId: 'prod_race_01',
      sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
      title: 'Phiên đấu giá test race condition 1',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 100000,
      buyNowPrice: 5000000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(auction1);

    // 1. Admin hủy phiên thành công
    await cancelUseCase.execute({
      auctionId: 'auc_race_01',
      sellerId: 'admin',
      isAdmin: true,
      reason: 'Dừng khẩn cấp trước khi có người mua đứt',
    });

    // 2. Request đặt giá cũ (đã đọc ACTIVE trước đó) cố tình cập nhật vào repo
    await assert.rejects(
      async () => {
        await placeBidUseCase.execute({
          auctionId: 'auc_race_01',
          bidderId: '01a15822-43b8-78c3-a246-16bff78bc6e8',
          bidAmount: 1200000,
        });
      },
      (err: any) =>
        err.message.includes('hiện không mở để đặt giá') || err.message.includes('bị hủy'),
    );

    // 3. Request mua ngay (Buy-now) gửi đồng thời cũng bị chặn
    await assert.rejects(
      async () => {
        await buyNowUseCase.execute({
          auctionId: 'auc_race_01',
          buyerId: '01a15822-43b8-78c3-a246-16bff78bc6e8',
        });
      },
      (err: any) => err.message.includes('không mở để mua ngay') || err.message.includes('bị hủy'),
    );

    // Xác minh trạng thái trong repo vẫn là CANCELLED, không bị ghi đè
    const checkAuction1 = await repo.findById('auc_race_01');
    assert.strictEqual(checkAuction1?.status, AuctionStatus.CANCELLED);

    // Thứ tự 2: BUY-NOW ĐÃ CHỐT TRƯỚC (ENDED), HỦY ĐẾN SAU
    const auction2 = new Auction({
      id: 'auc_race_02',
      productId: 'prod_race_02',
      sellerId: '01a15822-3fd0-7b39-ad01-f11da72d5b80',
      title: 'Phiên đấu giá test race condition 2',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 100000,
      buyNowPrice: 3000000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(auction2);

    // Khách mua ngay thành công -> phiên trở thành ENDED
    await buyNowUseCase.execute({
      auctionId: 'auc_race_02',
      buyerId: '01a15822-43b8-78c3-a246-16bff78bc6e8',
    });

    // Request hủy khẩn cấp đến sau phải trả lỗi rõ ràng
    await assert.rejects(
      async () => {
        await cancelUseCase.execute({
          auctionId: 'auc_race_02',
          sellerId: 'admin',
          isAdmin: true,
          reason: 'Cố tình hủy phiên đã buy-now thành công',
        });
      },
      { message: 'Không thể hủy phiên đấu giá đã kết thúc.' },
    );
  });

  it('10. Persistence & Non-Existent ID 1: ID cũ 1 không trỏ sang phiên mẫu để báo hủy thành công', async () => {
    const adminToken = createTestToken({
      id: '01a15822-3be8-7505-a081-e0e45bd2e15e',
      email: 'admin@gmail.com',
      role: 'ADMIN',
    });

    // ID cũ "1" không tồn tại trong hệ thống phải trả 404, không được trả 200 thành công giả tạo
    const res = await fetch(`${baseUrl}/api/v1/auctions/1/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Dừng phiên 1' }),
    });
    assert.strictEqual(res.status, 404);
  });

  it('11. Access Control on cancelReason: Người mua chỉ thấy thông báo chung, Admin/Staff/Seller thấy lý do thật', async () => {
    const adminToken = createTestToken({
      id: '01a15822-3be8-7505-a081-e0e45bd2e15e',
      email: 'admin@gmail.com',
      role: 'ADMIN',
    });
    const buyerToken = createTestToken({
      id: '01a15822-43b8-78c3-a246-16bff78bc6e8',
      email: 'buyer@gmail.com',
      role: 'BUYER',
    });

    // 1. Admin tạo và dừng phiên với lý do nhạy cảm nội bộ
    const createRes = await fetch(`${baseUrl}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: '01932f01-0011-7000-8000-000000000011',
        title: 'Phiên có lý do nhạy cảm',
        startPrice: 2000000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    const auctionId = ((await createRes.json()) as any).data.id;

    await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Nghi vấn rửa tiền qua thẻ tín dụng bị đánh cắp',
      }),
    });

    // 2. Buyer gọi GET /api/v1/auctions/:id -> cancelReason bị che thành thông điệp chung
    const buyerDetailRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const buyerJson = (await buyerDetailRes.json()) as any;
    assert.strictEqual(buyerDetailRes.status, 200);
    assert.strictEqual(buyerJson.data.cancelReason, 'Phiên đấu giá đã bị dừng hoặc hủy');

    // 3. Admin gọi GET /api/v1/auctions/:id -> cancelReason hiển thị chi tiết nguyên văn
    const adminDetailRes = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminJson = (await adminDetailRes.json()) as any;
    assert.strictEqual(
      adminJson.data.cancelReason,
      'Nghi vấn rửa tiền qua thẻ tín dụng bị đánh cắp',
    );
  });

  it('12. Query validation & Multi-field search: Tham số lặp trả 400, lọc theo sellerId và từ khóa q', async () => {
    const adminToken = createTestToken({
      id: '01a15822-3be8-7505-a081-e0e45bd2e15e',
      email: 'admin@gmail.com',
      role: 'ADMIN',
    });

    // 12.1 Tham số lặp lại (?sellerId=a&sellerId=b) trả 400 Bad Request
    const repeatRes = await fetch(
      `${baseUrl}/api/v1/auctions?sellerId=seller_a&sellerId=seller_b`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert.strictEqual(repeatRes.status, 400);

    // 12.2 Lọc theo status: all và sellerId
    const filterRes = await fetch(
      `${baseUrl}/api/v1/auctions?status=all&sellerId=01a15822-3fd0-7b39-ad01-f11da72d5b80`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    const filterJson = (await filterRes.json()) as any;
    assert.strictEqual(filterRes.status, 200);
    assert.ok(Array.isArray(filterJson.data));
    assert.ok(
      filterJson.data.every((a: any) => a.sellerId === '01a15822-3fd0-7b39-ad01-f11da72d5b80'),
    );
  });

  it(
    'serializes writes and preserves the first cancellation audit on PostgreSQL',
    {
      skip: process.env.AUCTION_DB_TEST !== 'true',
    },
    async () => {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url:
              process.env.AUCTION_DB_URL ||
              'postgresql://nexus_auction:nexus_password@127.0.0.1:5435/nexus_auction_db?schema=public',
          },
        },
      });
      const repository = new TransactionalAuctionRepository(prisma);
      const mutations = createAuctionMutations(createPostgresAuctionTransaction(prisma));
      const ids: string[] = [];

      async function fixture() {
        const id = crypto.randomUUID();
        ids.push(id);
        return repository.create(
          new Auction({
            id,
            productId: '01932f01-0001-7000-8000-000000000001',
            sellerId: crypto.randomUUID(),
            startingPrice: 500,
            currentHighestBid: 500,
            bidIncrement: 50,
            buyNowPrice: 900,
            status: AuctionStatus.ACTIVE,
            startTime: new Date(Date.now() - 60_000),
            endTime: new Date(Date.now() + 60_000),
          }),
        );
      }

      const adminA = crypto.randomUUID();
      const adminB = crypto.randomUUID();
      const buyerA = crypto.randomUUID();
      const buyerB = crypto.randomUUID();

      try {
        const purchase = await fixture();
        const purchases = await Promise.allSettled([
          mutations.buy.execute({ auctionId: purchase.id, buyerId: buyerA }),
          mutations.buy.execute({ auctionId: purchase.id, buyerId: buyerB }),
        ]);
        const winners = purchases.filter((result) => result.status === 'fulfilled');
        assert.equal(winners.length, 1);
        assert.equal((await repository.findBidsByAuctionId(purchase.id)).length, 1);

        const stop = await fixture();
        const stops = await Promise.allSettled([
          mutations.cancel.execute({
            auctionId: stop.id,
            sellerId: adminA,
            isAdmin: true,
            reason: 'Audit A',
          }),
          mutations.cancel.execute({
            auctionId: stop.id,
            sellerId: adminB,
            isAdmin: true,
            reason: 'Audit B',
          }),
        ]);
        const savedStops = stops.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );
        assert.equal(savedStops.length, 1);
        const saved = await new TransactionalAuctionRepository(prisma).findById(stop.id);
        assert.equal(saved?.status, AuctionStatus.CANCELLED);
        assert.equal(saved?.cancelReason, savedStops[0].cancelReason);
        assert.equal(saved?.cancelledBy, savedStops[0].cancelledBy);
        assert.equal(saved?.cancelledAt?.toISOString(), savedStops[0].cancelledAt);
        await assert.rejects(
          mutations.bid.execute({ auctionId: stop.id, bidderId: buyerA, bidAmount: 600 }),
        );
        assert.equal((await repository.findBidsByAuctionId(stop.id)).length, 0);

        const race = await fixture();
        const [buy, cancel] = await Promise.allSettled([
          mutations.buy.execute({ auctionId: race.id, buyerId: buyerA }),
          mutations.cancel.execute({
            auctionId: race.id,
            sellerId: adminA,
            isAdmin: true,
            reason: 'Concurrent stop',
          }),
        ]);
        assert.notEqual(buy.status, cancel.status);
        const final = await repository.findById(race.id);
        assert.equal(
          final?.status,
          buy.status === 'fulfilled' ? AuctionStatus.ENDED : AuctionStatus.CANCELLED,
        );
        assert.equal(
          (await repository.findBidsByAuctionId(race.id)).length,
          buy.status === 'fulfilled' ? 1 : 0,
        );
      } finally {
        try {
          await prisma.auctionRoom.deleteMany({ where: { id: { in: ids } } });
        } finally {
          await prisma.$disconnect();
        }
      }
    },
  );
});
