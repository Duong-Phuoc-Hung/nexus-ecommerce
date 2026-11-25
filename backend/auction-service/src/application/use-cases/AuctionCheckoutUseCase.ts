import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus } from '../../domain/entities/Auction';
import {
  ICommerceOrderClient,
  ShippingAddressInput,
  AuctionOrderCheckoutResult,
} from '../ports/ICommerceOrderClient';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';

export interface AuctionCheckoutInput {
  auctionId: string;
  buyerId: string;
  buyerToken?: string;
  shippingAddress: ShippingAddressInput;
}

export class AuctionCheckoutUseCase {
  constructor(
    private readonly auctionRepository: IAuctionRepository,
    private readonly commerceOrderClient: ICommerceOrderClient,
  ) {}

  public async execute(input: AuctionCheckoutInput): Promise<AuctionOrderCheckoutResult> {
    const { auctionId, buyerId, buyerToken, shippingAddress } = input;

    // 1. Kiểm tra phiên đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Kiểm tra trạng thái phiên: Phải kết thúc (ENDED) hoặc đã chốt (SETTLED) mới được chốt đơn
    if (auction.status !== AuctionStatus.ENDED && auction.status !== AuctionStatus.SETTLED) {
      throw new Error(`Phiên đấu giá chưa kết thúc (Trạng thái hiện tại: ${auction.status}).`);
    }

    // 3. Kiểm tra quyền hạn: Chỉ người trả giá cao nhất (Winner) mới được thanh toán
    if (auction.highestBidderId !== buyerId) {
      throw new Error('FORBIDDEN: Bạn không phải người chiến thắng phiên đấu giá này.');
    }

    // 4. Kiểm tra địa chỉ giao hàng
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

    // 5. Kiểm tra tính bất biến (Idempotency): Nếu phiên đấu giá đã có đơn hàng hợp lệ chưa bị hủy thì trả về đơn cũ
    let existingSettlement = null;
    if (this.auctionRepository.findSettlementByAuctionId) {
      existingSettlement = await this.auctionRepository.findSettlementByAuctionId(auctionId);
      if (existingSettlement && existingSettlement.orderId) {
        if (this.commerceOrderClient.getOrder) {
          const existingOrder = await this.commerceOrderClient.getOrder(
            existingSettlement.orderId,
            buyerToken,
          );
          // Chỉ tái sử dụng nếu đơn hàng còn hiệu lực và chưa bị hủy/thất bại
          const isDead =
            !existingOrder ||
            existingOrder.status === 'CANCELLED' ||
            existingOrder.status === 'FAILED' ||
            existingOrder.payment?.status === 'CANCELLED' ||
            existingOrder.payment?.status === 'FAILED' ||
            existingOrder.payment?.status === 'EXPIRED';

          if (!isDead) {
            return existingOrder;
          }
        }
      }
    }

    // 6. Gọi sang Commerce Service để chốt đơn hàng và sinh link VietQR PayOS
    const orderResult = await this.commerceOrderClient.createOrder({
      auctionId: auction.id,
      buyerToken,
      buyerId,
      productId: auction.productId,
      amount: auction.currentHighestBid,
      shippingAddress,
    });

    // 7. Liên kết mã đơn hàng Commerce vào bản ghi chốt phiên đấu giá
    if (this.auctionRepository.saveSettlement) {
      try {
        const settlementToSave = existingSettlement || {
          id: generateUuidV7(),
          auctionId,
          winnerId: buyerId,
          winningBidAmount: auction.currentHighestBid,
          paymentDeadline: new Date(Date.now() + 48 * 3600 * 1000),
          status: 'PENDING',
          settledAt: new Date(),
        };
        await this.auctionRepository.saveSettlement({
          ...settlementToSave,
          orderId: orderResult.orderId,
        });
      } catch (err) {
        console.warn('[AuctionCheckout] Could not link orderId to settlement:', err);
      }
    }

    return orderResult;
  }
}
