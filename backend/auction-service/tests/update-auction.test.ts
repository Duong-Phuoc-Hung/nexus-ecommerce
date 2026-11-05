import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { UpdateAuctionUseCase } from '../src/application/use-cases/UpdateAuctionUseCase';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';

describe('UpdateAuctionUseCase', () => {
  it('cho phép người bán cập nhật phiên khi còn ở trạng thái SCHEDULED', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new UpdateAuctionUseCase(repo);

    const sample = new Auction({
      id: 'auc_sched_01',
      productId: '10',
      sellerId: 'seller_01',
      title: 'Tiêu đề cũ',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      status: AuctionStatus.SCHEDULED,
      startTime: new Date(Date.now() + 3600 * 1000),
      endTime: new Date(Date.now() + 7200 * 1000),
    });
    await repo.create(sample);

    const updated = await useCase.execute({
      auctionId: 'auc_sched_01',
      sellerId: 'seller_01',
      title: 'Tiêu đề mới đã chỉnh sửa',
      bidIncrement: 100000,
    });

    assert.strictEqual(updated.title, 'Tiêu đề mới đã chỉnh sửa');
    assert.strictEqual(updated.bidIncrement, 100000);
  });

  it('từ chối khi người chỉnh sửa không phải là chủ phiên và không phải admin', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new UpdateAuctionUseCase(repo);

    const sample = new Auction({
      id: 'auc_sched_02',
      productId: '10',
      sellerId: 'seller_01',
      status: AuctionStatus.SCHEDULED,
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      startTime: new Date(Date.now() + 3600 * 1000),
      endTime: new Date(Date.now() + 7200 * 1000),
    });
    await repo.create(sample);

    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_sched_02',
          sellerId: 'impostor_seller',
          title: 'Hách tiêu đề',
        });
      },
      { message: 'Chỉ người tạo phiên đấu giá hoặc Quản trị viên mới có quyền chỉnh sửa.' },
    );
  });

  it('từ chối chỉnh sửa khi phiên đã ACTIVE hoặc ENDED', async () => {
    const repo = new InMemoryAuctionRepository();
    const useCase = new UpdateAuctionUseCase(repo);

    const sample = new Auction({
      id: 'auc_active_01',
      productId: '10',
      sellerId: 'seller_01',
      status: AuctionStatus.ACTIVE,
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      bidIncrement: 50000,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: new Date(Date.now() + 3600 * 1000),
    });
    await repo.create(sample);

    await assert.rejects(
      async () => {
        await useCase.execute({
          auctionId: 'auc_active_01',
          sellerId: 'seller_01',
          title: 'Sửa khi đang đấu',
        });
      },
      (err: any) => err.message.includes('Chỉ có thể chỉnh sửa phiên đấu giá khi chưa bắt đầu'),
    );
  });
});
