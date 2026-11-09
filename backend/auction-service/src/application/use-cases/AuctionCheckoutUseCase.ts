import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus } from '../../domain/entities/Auction';
import {
  ICommerceOrderClient,
  ShippingAddressInput,
  AuctionOrderCheckoutResult,
} from '../ports/ICommerceOrderClient';

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

    // 2. Kiểm tra trạng thái phiên: Phải kết thúc (ENDED) mới được chốt đơn
    if (auction.status !== AuctionStatus.ENDED) {
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

    // 5. Gọi sang Commerce Service để chốt đơn hàng và sinh link VietQR PayOS
    const orderResult = await this.commerceOrderClient.createOrder({
      buyerToken,
      buyerId,
      productId: auction.productId,
      amount: auction.currentHighestBid,
      shippingAddress,
    });

    return orderResult;
  }
}
