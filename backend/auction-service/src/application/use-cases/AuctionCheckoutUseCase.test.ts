import assert from 'node:assert/strict';
import test from 'node:test';
import { AuctionCheckoutUseCase } from './AuctionCheckoutUseCase';
import { Auction, AuctionStatus } from '../../domain/entities/Auction';
import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { ICommerceOrderClient } from '../ports/ICommerceOrderClient';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';

class MockAuctionRepo implements Partial<IAuctionRepository> {
  private readonly auctions = new Map<string, Auction>();
  private readonly settlements = new Map<string, any>();

  constructor(initial?: Auction[]) {
    if (initial) {
      initial.forEach((a) => this.auctions.set(a.id, a));
    }
  }

  public async findById(id: string): Promise<Auction | null> {
    return this.auctions.get(id) || null;
  }

  public async findSettlementByAuctionId(auctionId: string): Promise<any | null> {
    return this.settlements.get(auctionId) || null;
  }

  public async saveSettlement(settlement: any): Promise<void> {
    this.settlements.set(settlement.auctionId, settlement);
  }
}

class MockCommerceClient implements ICommerceOrderClient {
  public createOrderCallCount = 0;

  public async createOrder(input: any) {
    this.createOrderCallCount++;
    return {
      orderId: 'ord_mock_123',
      orderCode: 888999,
      totalAmount: input.amount,
      payment: {
        paymentLinkId: 'plink_test',
        checkoutUrl: 'https://pay.payos.vn/web/888999',
        status: 'PENDING',
      },
    };
  }

  public async getOrder(orderId: string) {
    return {
      orderId,
      orderCode: 888999,
      totalAmount: 8500000,
      payment: {
        paymentLinkId: 'plink_test',
        checkoutUrl: 'https://pay.payos.vn/web/888999',
        status: 'PENDING',
      },
    };
  }
}

test('AuctionCheckoutUseCase validates auction state and processes winner checkout', async () => {
  const winnerId = 'usr_winner_001';
  const otherId = 'usr_loser_002';

  const endedAuction = new Auction({
    id: 'auc_ended_1',
    productId: 'prod_camera_leica',
    sellerId: 'usr_seller_1',
    startingPrice: 5000000,
    currentHighestBid: 8500000,
    highestBidderId: winnerId,
    bidIncrement: 500000,
    status: AuctionStatus.ENDED,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() - 1000),
  });

  const activeAuction = new Auction({
    id: 'auc_active_2',
    productId: 'prod_macbook',
    sellerId: 'usr_seller_1',
    startingPrice: 20000000,
    currentHighestBid: 25000000,
    highestBidderId: winnerId,
    bidIncrement: 1000000,
    status: AuctionStatus.ACTIVE,
    startTime: new Date(Date.now() - 1000),
    endTime: new Date(Date.now() + 3600000),
  });

  const repo = new MockAuctionRepo([endedAuction, activeAuction]);
  const commerceClient = new MockCommerceClient();
  const useCase = new AuctionCheckoutUseCase(repo as unknown as IAuctionRepository, commerceClient);

  const address = {
    fullName: 'Nguyen Van A',
    phone: '0901234567',
    province: 'Ha Noi',
    addressLine: '123 Xuan Thuy',
    country: 'Vietnam',
  };

  // 1. Throws on missing auction
  await assert.rejects(
    () =>
      useCase.execute({ auctionId: 'non_existent', buyerId: winnerId, shippingAddress: address }),
    AuctionNotFoundException,
  );

  // 2. Throws on ACTIVE auction
  await assert.rejects(
    () =>
      useCase.execute({ auctionId: 'auc_active_2', buyerId: winnerId, shippingAddress: address }),
    /Phiên đấu giá chưa kết thúc/i,
  );

  // 3. Throws when caller is not the highest bidder (winner)
  await assert.rejects(
    () => useCase.execute({ auctionId: 'auc_ended_1', buyerId: otherId, shippingAddress: address }),
    /FORBIDDEN/i,
  );

  // 4. Successfully creates checkout and returns PayOS payment link
  const result = await useCase.execute({
    auctionId: 'auc_ended_1',
    buyerId: winnerId,
    shippingAddress: address,
  });

  assert.equal(result.orderId, 'ord_mock_123');
  assert.equal(result.totalAmount, 8500000);
  assert.equal(result.payment.checkoutUrl, 'https://pay.payos.vn/web/888999');
  assert.equal(result.payment.status, 'PENDING');
  assert.equal(commerceClient.createOrderCallCount, 1);

  // 5. Calling checkout again for the same auction is idempotent (does NOT create duplicate order)
  const repeatedResult = await useCase.execute({
    auctionId: 'auc_ended_1',
    buyerId: winnerId,
    shippingAddress: address,
  });

  assert.equal(repeatedResult.orderId, 'ord_mock_123');
  assert.equal(commerceClient.createOrderCallCount, 1, 'createOrder must not be called again');

  // 6. When the existing order is expired / CANCELLED / FAILED, calling checkout generates a new order
  commerceClient.getOrder = async (orderId: string) => ({
    orderId,
    orderCode: 888999,
    status: 'CANCELLED',
    totalAmount: 8500000,
    payment: {
      paymentLinkId: 'plink_test',
      status: 'FAILED',
      checkoutUrl: 'https://pay.payos.vn/web/expired',
    },
  });

  const refreshedResult = await useCase.execute({
    auctionId: 'auc_ended_1',
    buyerId: winnerId,
    shippingAddress: address,
  });

  assert.equal(
    commerceClient.createOrderCallCount,
    2,
    'createOrder MUST be called again when prior order is dead',
  );
  assert.equal(refreshedResult.orderId, 'ord_mock_123');
});
