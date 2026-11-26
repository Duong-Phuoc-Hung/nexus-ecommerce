import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus } from '../../domain/entities/Auction';
import {
  ICommerceOrderClient,
  ShippingAddressInput,
  AuctionOrderCheckoutResult,
} from '../ports/ICommerceOrderClient';
import {
  auctionRuntimeStore,
  PAYMENT_DEADLINE_MS,
} from '../../infrastructure/state/AuctionRuntimeStore';
import { syncAuctionOrderStatus } from '../../infrastructure/clients/AuctionSyncClient';

export interface AuctionCheckoutInput {
  auctionId: string;
  buyerId: string;
  buyerToken?: string;
  shippingAddress: ShippingAddressInput;
}

export class AuctionCheckoutUseCase {
  // Khóa in-flight theo auctionId chống spam click / double-submit đồng thời tạo trùng đơn
  private readonly inFlight = new Map<string, Promise<AuctionOrderCheckoutResult>>();

  constructor(
    private readonly auctionRepository: IAuctionRepository,
    private readonly commerceOrderClient: ICommerceOrderClient,
  ) {}

  public async execute(input: AuctionCheckoutInput): Promise<AuctionOrderCheckoutResult> {
    const key = `${input.auctionId}:${input.buyerId}`;
    const running = this.inFlight.get(key);
    if (running) return running;

    const promise = this.runCheckout(input).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  private async runCheckout(input: AuctionCheckoutInput): Promise<AuctionOrderCheckoutResult> {
    const { auctionId, buyerId, buyerToken, shippingAddress } = input;

    // 1. Kiểm tra phiên đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    const now = new Date();
    if (auction.syncLifecycle(now)) {
      await this.auctionRepository.update(auction).catch(() => {});
    }

    // 2. Kiểm tra trạng thái phiên: Phải kết thúc (ENDED) mới được chốt đơn
    if (auction.status !== AuctionStatus.ENDED && auction.status !== AuctionStatus.SETTLED) {
      throw new Error(`Phiên đấu giá chưa kết thúc (Trạng thái hiện tại: ${auction.status}).`);
    }

    // 3. Kiểm tra quyền hạn: Chỉ người trả giá cao nhất (Winner) mới được thanh toán
    if (auction.highestBidderId !== buyerId) {
      throw new Error('FORBIDDEN: Bạn không phải người chiến thắng phiên đấu giá này.');
    }

    // 4. Kiểm tra bản ghi settlement bền vững trong PostgreSQL (chống tạo trùng kể cả sau restart)
    const dbSettlement = this.auctionRepository.findSettlementByAuctionId
      ? await this.auctionRepository.findSettlementByAuctionId(auctionId)
      : null;

    const deadline = dbSettlement?.paymentDeadline || auction.actualEndTime || auction.endTime;
    const dueAt =
      dbSettlement?.paymentDeadline || new Date(deadline.getTime() + PAYMENT_DEADLINE_MS);
    if (Date.now() >= dueAt.getTime() && dbSettlement?.status !== 'PAID') {
      throw new Error('Đã quá hạn thanh toán phiên đấu giá.');
    }

    if (dbSettlement) {
      if (dbSettlement.status === 'TIMEOUT_PENALIZED') {
        throw new Error(
          'Phiên đã quá hạn thanh toán 24 giờ theo quy định SRS và không thể tạo đơn.',
        );
      }
    }
    const existingSettlement = auctionRuntimeStore.getSettlement(auctionId);

    // 5. Kiểm tra địa chỉ giao hàng
    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.addressLine
    ) {
      throw new Error(
        'Vui lòng cung cấp đầy đủ thông tin địa chỉ nhận hàng (Họ tên, SĐT, Địa chỉ).',
      );
    }

    // 6. Gọi sang Commerce Service để tạo đơn ORD-AUC-... duy nhất & sinh link VietQR PayOS
    const orderResult = await this.commerceOrderClient.createOrder({
      auctionId,
      sellerId: auction.sellerId,
      productTitle: auction.title,
      buyerToken,
      buyerId,
      productId: auction.productId,
      amount: auction.currentHighestBid,
      shippingAddress,
    });

    const settledAtDate =
      dbSettlement?.settledAt ||
      (existingSettlement?.settledAt
        ? new Date(existingSettlement.settledAt)
        : auction.actualEndTime || auction.endTime);
    const paymentDueDate = dueAt;

    // 7. Lưu bền vững vào bảng PostgreSQL auction_settlements
    if (this.auctionRepository.upsertSettlement) {
      await this.auctionRepository
        .upsertSettlement({
          auctionId,
          winnerId: buyerId,
          winningBidAmount: auction.currentHighestBid,
          paymentDeadline: paymentDueDate,
          orderId: orderResult.orderId,
          status: 'PENDING_PAYMENT',
          settledAt: settledAtDate,
        })
        .catch((err) => {
          console.warn('[AuctionCheckoutUseCase] upsertSettlement warning:', err?.message || err);
        });
    }

    auctionRuntimeStore.setSettlement({
      auctionId,
      outcome: 'WON',
      winnerId: buyerId,
      finalPrice: auction.currentHighestBid,
      winningBidAmount: auction.currentHighestBid,
      settledAt: settledAtDate.toISOString(),
      paymentReadyAt: settledAtDate.toISOString(),
      paymentDueAt: paymentDueDate.toISOString(),
      orderId: orderResult.orderId,
      orderCode: orderResult.orderCode ? String(orderResult.orderCode) : undefined,
      paymentUrl: orderResult.payment?.checkoutUrl || undefined,
      paymentStatus: 'PENDING',
      checkoutResult: orderResult,
    });

    auctionRuntimeStore.appendTimeline(auctionId, {
      type: 'CHECKOUT_CREATED',
      actorId: buyerId,
      actorRole: 'BUYER',
      summary: `Đã tạo đơn trúng đấu giá #${orderResult.orderCode || orderResult.orderId} (${auction.currentHighestBid.toLocaleString('vi-VN')} ₫).`,
      occurredAt: now.toISOString(),
      metadata: {
        orderId: orderResult.orderId,
        orderCode: orderResult.orderCode,
        paymentDueAt: paymentDueDate.toISOString(),
      },
    });

    return orderResult;
  }
}
