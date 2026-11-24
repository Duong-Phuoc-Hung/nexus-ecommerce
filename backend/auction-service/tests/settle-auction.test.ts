import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryAuctionRepository } from '../src/infrastructure/repositories/InMemoryAuctionRepository';
import { RabbitMqEventPublisher } from '../src/infrastructure/messaging/RabbitMqEventPublisher';
import { SettleAuctionUseCase } from '../src/application/use-cases/SettleAuctionUseCase';
import { Auction, AuctionStatus } from '../src/domain/entities/Auction';

describe('SettleAuctionUseCase (TASK-AUC-01)', () => {
  it('chốt phiên đấu giá thành công, lưu settlement và phát event auction.settled.won với đủ dữ liệu', async () => {
    const repo = new InMemoryAuctionRepository();
    const publisher = new RabbitMqEventPublisher();
    const useCase = new SettleAuctionUseCase(repo, publisher);

    const auction = new Auction({
      id: 'auc_settle_01',
      productId: 'prod_macbook_01',
      sellerId: 'usr_seller_mac',
      title: 'Đấu giá MacBook Pro M3 Max',
      startingPrice: 50000000,
      currentHighestBid: 65000000,
      highestBidderId: 'usr_winner_vip',
      bidIncrement: 1000000,
      status: AuctionStatus.ENDED,
      startTime: new Date(Date.now() - 7200 * 1000),
      endTime: new Date(Date.now() - 3600 * 1000),
    });
    await repo.create(auction);

    const result = await useCase.execute({ auctionId: 'auc_settle_01' });

    // 1. Kiểm tra kết quả trả về
    assert.strictEqual(result.auctionId, 'auc_settle_01');
    assert.strictEqual(result.winnerId, 'usr_winner_vip');
    assert.strictEqual(result.sellerId, 'usr_seller_mac');
    assert.strictEqual(result.productId, 'prod_macbook_01');
    assert.strictEqual(result.finalPrice, 65000000);
    assert.strictEqual(result.status, 'PENDING_PAYMENT');

    // 2. Kiểm tra hạn nộp tiền là đúng 48 tiếng kể từ thời điểm chốt phiên
    const expectedDeadlineApprox = Date.now() + 48 * 60 * 60 * 1000;
    assert.ok(Math.abs(result.paymentDeadline.getTime() - expectedDeadlineApprox) < 5000);

    // 3. Kiểm tra trạng thái phiên đổi sang SETTLED
    const updatedAuction = await repo.findById('auc_settle_01');
    assert.ok(updatedAuction);
    assert.strictEqual(updatedAuction.status, AuctionStatus.SETTLED);

    // 4. Kiểm tra bản ghi settlement đã lưu vào database repository
    const settlement = await repo.findSettlementByAuctionId?.('auc_settle_01');
    assert.ok(settlement);
    assert.strictEqual(settlement.winnerId, 'usr_winner_vip');
    assert.strictEqual(settlement.winningBidAmount, 65000000);
    assert.strictEqual(settlement.status, 'PENDING_PAYMENT');

    // 5. Kiểm tra Domain Event phát sang RabbitMQ chứa đầy đủ dữ liệu AC
    const published = publisher.getPublishedEvents();
    assert.strictEqual(published.length, 1);
    assert.strictEqual(published[0].eventName, 'auction.settled.won');
    assert.strictEqual(published[0].payload.auctionId, 'auc_settle_01');
    assert.strictEqual(published[0].payload.winnerId, 'usr_winner_vip');
    assert.strictEqual(published[0].payload.sellerId, 'usr_seller_mac');
    assert.strictEqual(published[0].payload.productId, 'prod_macbook_01');
    assert.strictEqual(published[0].payload.finalPrice, 65000000);
    assert.ok(published[0].payload.paymentDeadline);
    assert.ok(published[0].payload.settledAt);
  });

  it('báo lỗi khi phiên đấu giá không tồn tại', async () => {
    const repo = new InMemoryAuctionRepository();
    const publisher = new RabbitMqEventPublisher();
    const useCase = new SettleAuctionUseCase(repo, publisher);

    await assert.rejects(
      async () => {
        await useCase.execute({ auctionId: 'auc_non_existent' });
      },
      { name: 'AuctionNotFoundException' },
    );
  });

  it('từ chối chốt phiên khi chưa có người đặt giá (không có winner)', async () => {
    const repo = new InMemoryAuctionRepository();
    const publisher = new RabbitMqEventPublisher();
    const useCase = new SettleAuctionUseCase(repo, publisher);

    const auction = new Auction({
      id: 'auc_no_bids',
      productId: 'prod_99',
      sellerId: 'usr_seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1000000,
      highestBidderId: undefined, // Không có người đặt giá
      bidIncrement: 50000,
      status: AuctionStatus.ENDED,
      startTime: new Date(Date.now() - 7200 * 1000),
      endTime: new Date(Date.now() - 3600 * 1000),
    });
    await repo.create(auction);

    await assert.rejects(
      async () => {
        await useCase.execute({ auctionId: 'auc_no_bids' });
      },
      { message: /chưa có lượt đặt giá hợp lệ/ },
    );
  });

  it('từ chối chốt phiên khi phiên đã bị hủy (CANCELLED)', async () => {
    const repo = new InMemoryAuctionRepository();
    const publisher = new RabbitMqEventPublisher();
    const useCase = new SettleAuctionUseCase(repo, publisher);

    const auction = new Auction({
      id: 'auc_cancelled',
      productId: 'prod_99',
      sellerId: 'usr_seller_01',
      startingPrice: 1000000,
      currentHighestBid: 1500000,
      highestBidderId: 'usr_bidder_01',
      bidIncrement: 50000,
      status: AuctionStatus.CANCELLED,
      startTime: new Date(Date.now() - 7200 * 1000),
      endTime: new Date(Date.now() - 3600 * 1000),
    });
    await repo.create(auction);

    await assert.rejects(
      async () => {
        await useCase.execute({ auctionId: 'auc_cancelled' });
      },
      { message: /đã bị hủy/ },
    );
  });

  it('từ chối chốt lại khi phiên đã được SETTLED trước đó', async () => {
    const repo = new InMemoryAuctionRepository();
    const publisher = new RabbitMqEventPublisher();
    const useCase = new SettleAuctionUseCase(repo, publisher);

    const auction = new Auction({
      id: 'auc_already_settled',
      productId: 'prod_99',
      sellerId: 'usr_seller_01',
      startingPrice: 1000000,
      currentHighestBid: 2000000,
      highestBidderId: 'usr_bidder_winner',
      bidIncrement: 50000,
      status: AuctionStatus.SETTLED,
      startTime: new Date(Date.now() - 7200 * 1000),
      endTime: new Date(Date.now() - 3600 * 1000),
    });
    await repo.create(auction);

    await assert.rejects(
      async () => {
        await useCase.execute({ auctionId: 'auc_already_settled' });
      },
      { message: /đã được chốt trước đó/ },
    );
  });
});
