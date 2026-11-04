import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { GetBidHistoryUseCase } from '../src/application/use-cases/GetBidHistoryUseCase';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';

describe('GetBidHistoryUseCase', () => {
  it('lấy danh sách lịch sử đặt giá thành công cho phòng đấu giá', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new GetBidHistoryUseCase(repo);

    const sample = new Auction({
      id: 'auc_hist_01',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1200000,
      bidIncrement: 50000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    await repo.saveBid?.({
      auctionId: 'auc_hist_01',
      bidderId: 'buyer_01',
      amount: 1100000,
      bidTime: new Date(Date.now() - 60000),
      isWinning: false,
    });

    await repo.saveBid?.({
      auctionId: 'auc_hist_01',
      bidderId: 'buyer_02',
      amount: 1200000,
      bidTime: new Date(),
      isWinning: true,
    });

    const history = await useCase.execute('auc_hist_01');
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].bidderId, 'buyer_02');
    assert.strictEqual(history[0].bidAmount, 1200000);
    assert.strictEqual(history[0].isWinning, true);
  });

  it('báo lỗi khi phòng đấu giá không tồn tại', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new GetBidHistoryUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute('auc_not_found');
      },
      (err: any) => err.message.includes('not found') || err.message.includes('auc_not_found'),
    );
  });
});
