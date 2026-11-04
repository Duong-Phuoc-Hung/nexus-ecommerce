import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { Auction } from '../../domain/entities/Auction';

export interface BuyNowInput {
  auctionId: string;
  buyerId: string;
}

export interface BuyNowResult {
  auctionId: string;
  winnerId: string;
  purchasePrice: number;
  status: string;
  actualEndTime?: Date;
}

export class BuyNowUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(input: BuyNowInput): Promise<BuyNowResult> {
    const { auctionId, buyerId } = input;

    // 1. Kiểm tra phiên đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    const now = new Date();

    // 2. Thực thi nghiệp vụ mua thẳng trong Domain Entity
    auction.buyNow(buyerId, now);

    // 3. Cập nhật trạng thái phiên thành ENDED và lưu vào CSDL
    await this.auctionRepository.update(auction);

    // 4. Lưu lượt mua vào bảng lịch sử đấu giá với tư cách người thắng cuộc
    if (this.auctionRepository.saveBid) {
      await this.auctionRepository.saveBid({
        auctionId,
        bidderId: buyerId,
        amount: auction.currentHighestBid,
        bidTime: now,
        isWinning: true,
      });
    }

    return {
      auctionId: auction.id,
      winnerId: buyerId,
      purchasePrice: auction.currentHighestBid,
      status: auction.status,
      actualEndTime: auction.actualEndTime,
    };
  }
}
