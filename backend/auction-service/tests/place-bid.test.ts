import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { PlaceBidUseCase } from '../src/application/use-cases/PlaceBidUseCase';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';

describe('PlaceBidUseCase', () => {
  it('đặt giá thành công khi mức giá hợp lệ và phiên đang ACTIVE', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new PlaceBidUseCase(repo);

    const sample = new Auction({
      id: 'auc_test_01',
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
      auctionId: 'auc_test_01',
      bidderId: 'buyer_99',
      bidAmount: 1100000,
    });

    assert.strictEqual(result.auctionId, 'auc_test_01');
    assert.strictEqual(result.bidderId, 'buyer_99');
    assert.strictEqual(result.currentHighestBid, 1100000);
    assert.strictEqual(result.isExtended, false);

    const updated = await repo.findById('auc_test_01');
    assert.strictEqual(updated?.currentHighestBid, 1100000);
    assert.strictEqual(updated?.highestBidderId, 'buyer_99');

    const bids = await repo.findBidsByAuctionId?.('auc_test_01');
    assert.strictEqual(bids?.length, 1);
    assert.strictEqual(bids?.[0].amount, 1100000);
  });

  it('kích hoạt Anti-sniping tự động dời endTime khi đặt giá ở phút chót', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new PlaceBidUseCase(repo);

    // Phiên kết thúc sau 30 giây (trong khoảng anti-sniping 120s)
    const initialEndTime = new Date(Date.now() + 30 * 1000);
    const sample = new Auction({
      id: 'auc_test_sniping',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: initialEndTime,
      antiSnipingExtensionSeconds: 120,
    });
    await repo.create(sample);

    const result = await useCase.execute({
      auctionId: 'auc_test_sniping',
      bidderId: 'buyer_fast',
      bidAmount: 1050000,
    });

    assert.strictEqual(result.isExtended, true);
    assert.ok(result.endTime.getTime() > initialEndTime.getTime());

    const updated = await repo.findById('auc_test_sniping');
    assert.strictEqual(updated?.status, AuctionStatus.EXTENDED);
  });

  it('chặn không cho người bán tự đặt giá sản phẩm của mình', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new PlaceBidUseCase(repo);

    const sample = new Auction({
      id: 'auc_test_shill',
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
          auctionId: 'auc_test_shill',
          bidderId: 'seller_01', // Cùng là seller
          bidAmount: 1200000,
        });
      },
      { message: 'Người bán không được phép tự đặt giá cho sản phẩm của chính mình.' },
    );
  });

  it('từ chối khi số tiền đặt giá thấp hơn Giá hiện tại + Bước giá', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new PlaceBidUseCase(repo);

    const sample = new Auction({
      id: 'auc_test_low',
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
          auctionId: 'auc_test_low',
          bidderId: 'buyer_02',
          bidAmount: 1020000, // Cần tối thiểu 1.050.000
        });
      },
      (err: any) => err.message.includes('Mức giá đặt tối thiểu hợp lệ phải là'),
    );
  });

  it('từ chối khi phiên đấu giá chưa bắt đầu (SCHEDULED)', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new PlaceBidUseCase(repo);

    const sample = new Auction({
      id: 'auc_test_sched',
      productId: '10',
      sellerId: 'seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      status: AuctionStatus.SCHEDULED,
      startTime: new Date(Date.now() + 3600 * 1000),
      endTime: new Date(Date.now() + 7200 * 1000),
    });
    await repo.create(sample);

    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_test_sched',
          bidderId: 'buyer_02',
          bidAmount: 1100000,
        });
      },
      (err: any) => err.message.includes('hiện không mở để đặt giá'),
    );
  });
});
