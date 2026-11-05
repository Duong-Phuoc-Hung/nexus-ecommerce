import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { BuyNowUseCase } from '../src/application/use-cases/BuyNowUseCase';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';

describe('BuyNowUseCase', () => {
  it('cho phép người mua mua thẳng phiên đấu giá khi có buyNowPrice', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new BuyNowUseCase(repo);

    const sample = new Auction({
      id: 'auc_buynow_01',
      productId: '10',
      sellerId: 'seller_01',
      title: 'Đấu giá máy ảnh Sony A7 IV',
      startingPrice: 30000000,
      currentHighestBid: 32000000,
      bidIncrement: 500000,
      buyNowPrice: 40000000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    const result = await useCase.execute({
      auctionId: 'auc_buynow_01',
      buyerId: 'buyer_99',
    });

    assert.strictEqual(result.auctionId, 'auc_buynow_01');
    assert.strictEqual(result.winnerId, 'buyer_99');
    assert.strictEqual(result.purchasePrice, 40000000);
    assert.strictEqual(result.status, AuctionStatus.ENDED);
    assert.ok(result.actualEndTime !== undefined);

    const updated = await repo.findById('auc_buynow_01');
    assert.strictEqual(updated?.status, AuctionStatus.ENDED);
    assert.strictEqual(updated?.highestBidderId, 'buyer_99');
    assert.strictEqual(updated?.currentHighestBid, 40000000);
  });

  it('từ chối khi người bán tự mua thẳng sản phẩm của mình', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new BuyNowUseCase(repo);

    const sample = new Auction({
      id: 'auc_buynow_02',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 10000000,
      currentHighestBid: 10000000,
      bidIncrement: 500000,
      buyNowPrice: 15000000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_buynow_02',
          buyerId: 'seller_01',
        });
      },
      { message: 'Người bán không thể tự mua sản phẩm của chính mình.' },
    );
  });

  it('từ chối khi phiên đấu giá không có giá mua ngay', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new BuyNowUseCase(repo);

    const sample = new Auction({
      id: 'auc_buynow_03',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 10000000,
      currentHighestBid: 10000000,
      bidIncrement: 500000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_buynow_03',
          buyerId: 'buyer_99',
        });
      },
      (err: any) => err.message.includes('không hỗ trợ tính năng mua ngay'),
    );
  });
});
