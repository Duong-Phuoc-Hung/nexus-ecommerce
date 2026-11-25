import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import {
  auctionRuntimeStore,
  PAYMENT_DEADLINE_MS,
} from '../../infrastructure/state/AuctionRuntimeStore';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';

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
  paymentDueAt: string;
  version: number;
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

    const existingBids = this.auctionRepository.findBidsByAuctionId
      ? await this.auctionRepository.findBidsByAuctionId(auctionId)
      : [];
    auction.setBidCount(existingBids.length || (auction.highestBidderId ? 1 : 0));

    const now = new Date();

    // 2. Thực thi nghiệp vụ mua thẳng trong Domain Entity (Mục 11: chỉ trước lượt đầu)
    auction.buyNow(buyerId, now);

    // 3. Cập nhật trạng thái phiên thành ENDED và lưu vào CSDL
    await this.auctionRepository.update(auction);

    // 4. Lưu lượt mua vào bảng lịch sử đấu giá với tư cách người thắng cuộc
    if (this.auctionRepository.saveBid) {
      await this.auctionRepository.saveBid({
        id: generateUuidV7(),
        auctionId,
        bidderId: buyerId,
        amount: auction.currentHighestBid,
        bidTime: now,
        isWinning: true,
      });
    }

    auctionRuntimeStore.ensureMeta(auctionId, {
      endTime: auction.endTime,
      startingPrice: auction.startingPrice,
      bidIncrement: auction.bidIncrement,
    });
    const version = auctionRuntimeStore.bumpVersion(auctionId);
    const settledAt = now.toISOString();
    const paymentDueAt = new Date(now.getTime() + PAYMENT_DEADLINE_MS).toISOString();

    if (this.auctionRepository.upsertSettlement) {
      await this.auctionRepository.upsertSettlement({
        auctionId,
        winnerId: buyerId,
        winningBidAmount: auction.currentHighestBid,
        paymentDeadline: new Date(paymentDueAt),
        status: 'PENDING_PAYMENT',
        settledAt: now,
      });
    }

    auctionRuntimeStore.setSettlement({
      auctionId,
      outcome: 'WON',
      winnerId: buyerId,
      finalPrice: auction.currentHighestBid,
      settledAt,
      paymentReadyAt: settledAt,
      paymentDueAt,
      paymentStatus: 'PENDING',
    });

    auctionRuntimeStore.appendTimeline(auctionId, {
      type: 'BUY_NOW',
      actorId: buyerId,
      actorRole: 'BUYER',
      summary: `Người mua đã chốt Mua ngay với giá ${auction.currentHighestBid.toLocaleString('vi-VN')} ₫.`,
      occurredAt: settledAt,
      metadata: { winnerId: buyerId, purchasePrice: auction.currentHighestBid, paymentDueAt },
    });

    return {
      auctionId: auction.id,
      winnerId: buyerId,
      purchasePrice: auction.currentHighestBid,
      status: auction.status,
      actualEndTime: auction.actualEndTime,
      paymentDueAt,
      version,
    };
  }
}
