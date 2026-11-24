import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { IEventPublisher } from '../ports/IEventPublisher';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus } from '../../domain/entities/Auction';

export interface SettleAuctionInput {
  auctionId: string;
  triggeredBy?: string;
}

export interface SettleAuctionOutput {
  auctionId: string;
  winnerId: string;
  sellerId: string;
  productId: string;
  finalPrice: number;
  paymentDeadline: Date;
  status: string;
  settledAt: Date;
}

export class SettleAuctionUseCase {
  constructor(
    private readonly auctionRepository: IAuctionRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  public async execute(input: SettleAuctionInput): Promise<SettleAuctionOutput> {
    const { auctionId } = input;

    // 1. Kiểm tra phiên đấu giá tồn tại
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Kiểm tra nếu phiên đã bị hủy
    if (auction.status === AuctionStatus.CANCELLED) {
      throw new Error(`Không thể chốt phiên đấu giá #${auctionId} vì đã bị hủy.`);
    }

    // 3. Kiểm tra nếu phiên đã được chốt trước đó
    if (auction.status === AuctionStatus.SETTLED) {
      throw new Error(`Phiên đấu giá #${auctionId} đã được chốt trước đó.`);
    }

    // 4. Kiểm tra có người thắng (người trả giá cao nhất)
    if (!auction.highestBidderId) {
      throw new Error(`Không thể chốt phiên đấu giá #${auctionId} do chưa có lượt đặt giá hợp lệ.`);
    }

    const settledAt = new Date();
    // Hạn chót thanh toán: 48 giờ sau khi chốt phiên (SRS 3.5 & TASK-COM-01)
    const paymentDeadline = new Date(settledAt.getTime() + 48 * 60 * 60 * 1000);

    // 5. Chuyển trạng thái phiên đấu giá sang SETTLED trong Domain Entity
    auction.settle(settledAt);
    await this.auctionRepository.update(auction);

    // 6. Ghi nhận dữ liệu chốt phiên vào bảng auction_settlements
    if (this.auctionRepository.saveSettlement) {
      await this.auctionRepository.saveSettlement({
        auctionId: auction.id,
        winnerId: auction.highestBidderId,
        winningBidAmount: auction.currentHighestBid,
        paymentDeadline,
        status: 'PENDING_PAYMENT',
        settledAt,
      });
    }

    // 7. Phát Domain Event auction.settled.won sang RabbitMQ (TASK-AUC-01)
    await this.eventPublisher.publish('auction.settled.won', {
      auctionId: auction.id,
      winnerId: auction.highestBidderId,
      sellerId: auction.sellerId,
      productId: auction.productId,
      finalPrice: auction.currentHighestBid,
      paymentDeadline: paymentDeadline.toISOString(),
      settledAt: settledAt.toISOString(),
    });

    return {
      auctionId: auction.id,
      winnerId: auction.highestBidderId,
      sellerId: auction.sellerId,
      productId: auction.productId,
      finalPrice: auction.currentHighestBid,
      paymentDeadline,
      status: 'PENDING_PAYMENT',
      settledAt,
    };
  }
}
