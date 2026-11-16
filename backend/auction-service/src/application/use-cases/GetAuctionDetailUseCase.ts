import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionDetailDto, AuctionBidDetailDto } from '../dtos/AuctionDetailDto';

export class GetAuctionDetailUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(auctionId: string): Promise<AuctionDetailDto> {
    const auction = await this.auctionRepository.findById(auctionId);

    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    const rawBids = this.auctionRepository.findBidsByAuctionId
      ? await this.auctionRepository.findBidsByAuctionId(auctionId)
      : [];

    const bids: AuctionBidDetailDto[] = rawBids.map((b) => ({
      id: b.id || b.bidId || '',
      bidder: b.bidderId,
      amount: b.amount,
      time: b.bidTime instanceof Date ? b.bidTime.getTime() : new Date(b.bidTime).getTime(),
    }));

    return {
      id: auction.id,
      productId: auction.productId,
      sellerId: auction.sellerId,
      title: auction.title,
      startingPrice: auction.startingPrice,
      currentHighestBid: auction.currentHighestBid,
      highestBidderId: auction.highestBidderId,
      bidIncrement: auction.bidIncrement,
      buyNowPrice: auction.buyNowPrice,
      status: auction.status,
      startTime:
        auction.startTime instanceof Date
          ? auction.startTime.toISOString()
          : new Date(auction.startTime).toISOString(),
      endTime:
        auction.endTime instanceof Date
          ? auction.endTime.toISOString()
          : new Date(auction.endTime).toISOString(),
      actualEndTime: auction.actualEndTime
        ? auction.actualEndTime instanceof Date
          ? auction.actualEndTime.toISOString()
          : new Date(auction.actualEndTime).toISOString()
        : undefined,
      cancelReason: auction.cancelReason,
      cancelledBy: auction.cancelledBy,
      cancelledAt: auction.cancelledAt
        ? auction.cancelledAt instanceof Date
          ? auction.cancelledAt.toISOString()
          : new Date(auction.cancelledAt).toISOString()
        : undefined,
      bids,
      bidCount: bids.length,
      bidHistoryAvailable: true,
    };
  }
}
