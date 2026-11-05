import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { CreateAuctionRoomUseCase } from '../src/application/use-cases/CreateAuctionRoomUseCase';
import { AuctionStatus } from '../src/domain/entities/Auction';

describe('CreateAuctionRoomUseCase', () => {
  it('tạo thành công phòng đấu giá hợp lệ ở tương lai (SCHEDULED)', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CreateAuctionRoomUseCase(repo);

    const startTime = new Date(Date.now() + 3600 * 1000); // 1 tiếng nữa
    const endTime = new Date(Date.now() + 7200 * 1000); // 2 tiếng nữa

    const auction = await useCase.execute({
      productId: '10',
      sellerId: 'sel_01',
      title: 'Đấu giá máy ảnh Sony A7 IV',
      startPrice: 40000000,
      bidStep: 500000,
      buyNowPrice: 55000000,
      startTime,
      endTime,
    });

    assert.strictEqual(auction.productId, '10');
    assert.strictEqual(auction.sellerId, 'sel_01');
    assert.strictEqual(auction.startingPrice, 40000000);
    assert.strictEqual(auction.currentHighestBid, 40000000);
    assert.strictEqual(auction.bidIncrement, 500000);
    assert.strictEqual(auction.buyNowPrice, 55000000);
    assert.strictEqual(auction.status, AuctionStatus.SCHEDULED);

    const saved = await repo.findById(auction.id);
    assert.ok(saved);
    assert.strictEqual(saved.title, 'Đấu giá máy ảnh Sony A7 IV');
  });

  it('tạo thành công phòng đấu giá kích hoạt ngay (ACTIVE) khi startTime <= now', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CreateAuctionRoomUseCase(repo);

    const startTime = new Date(Date.now() - 1000);
    const endTime = new Date(Date.now() + 3600 * 1000);

    const auction = await useCase.execute({
      productId: '11',
      sellerId: 'sel_02',
      startPrice: 1000000,
      startTime,
      endTime,
    });

    assert.strictEqual(auction.status, AuctionStatus.ACTIVE);
    assert.strictEqual(auction.bidIncrement, 10000); // Mặc định 10.000
  });

  it('báo lỗi khi startPrice <= 0', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CreateAuctionRoomUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          productId: '12',
          sellerId: 'sel_01',
          startPrice: 0,
          startTime: new Date(Date.now() + 1000),
          endTime: new Date(Date.now() + 3600 * 1000),
        });
      },
      { message: 'Giá khởi điểm (startPrice) phải lớn hơn 0.' },
    );
  });

  it('báo lỗi khi buyNowPrice <= startPrice', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CreateAuctionRoomUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          productId: '12',
          sellerId: 'sel_01',
          startPrice: 5000000,
          buyNowPrice: 4000000,
          startTime: new Date(Date.now() + 1000),
          endTime: new Date(Date.now() + 3600 * 1000),
        });
      },
      { message: 'Giá mua ngay (buyNowPrice) phải lớn hơn giá khởi điểm.' },
    );
  });

  it('báo lỗi khi startTime >= endTime', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new CreateAuctionRoomUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          productId: '12',
          sellerId: 'sel_01',
          startPrice: 5000000,
          startTime: new Date(Date.now() + 7200 * 1000),
          endTime: new Date(Date.now() + 3600 * 1000),
        });
      },
      { message: 'Thời gian bắt đầu (startTime) phải trước thời gian kết thúc (endTime).' },
    );
  });
});
