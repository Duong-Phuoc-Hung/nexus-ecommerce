import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { CancelAuctionUseCase } from '../src/application/use-cases/CancelAuctionUseCase';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';

describe('CancelAuctionUseCase', () => {
  it('cho phép chủ phòng hủy phiên đấu giá khi chưa kết thúc', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CancelAuctionUseCase(repo);

    const sample = new Auction({
      id: 'auc_cancel_01',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    const result = await useCase.execute({
      auctionId: 'auc_cancel_01',
      sellerId: 'seller_01',
      reason: 'Sản phẩm gặp lỗi kỹ thuật',
    });

    assert.strictEqual(result.auctionId, 'auc_cancel_01');
    assert.strictEqual(result.status, AuctionStatus.CANCELLED);

    const updated = await repo.findById('auc_cancel_01');
    assert.strictEqual(updated?.status, AuctionStatus.CANCELLED);
  });

  it('từ chối khi người hủy không phải chủ phòng và không phải admin', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CancelAuctionUseCase(repo);

    const sample = new Auction({
      id: 'auc_cancel_02',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_cancel_02',
          sellerId: 'hacker_user',
        });
      },
      { message: 'Chỉ người tạo phiên đấu giá hoặc Quản trị viên mới có quyền hủy.' },
    );
  });

  it('cho phép Admin hủy phiên của bất kỳ ai', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CancelAuctionUseCase(repo);

    const sample = new Auction({
      id: 'auc_cancel_03',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    const result = await useCase.execute({
      auctionId: 'auc_cancel_03',
      sellerId: 'admin_user',
      isAdmin: true,
      reason: 'Vi phạm chính sách đấu giá',
    });

    assert.strictEqual(result.status, AuctionStatus.CANCELLED);
  });
});
