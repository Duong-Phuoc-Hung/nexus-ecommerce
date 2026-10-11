import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionDetailDto } from '../dtos/AuctionDetailDto';

export class GetAuctionDetailUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(auctionId: string): Promise<AuctionDetailDto> {
    const auction = await this.auctionRepository.findById(auctionId);

    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    return {
      id: auction.id,
      productId: auction.productId,
      sellerId: auction.sellerId,
      currentHighestBid: auction.currentHighestBid,
      highestBidderId: auction.highestBidderId,
      bidIncrement: auction.bidIncrement,
      status: auction.status,
      endTime: auction.endTime.toISOString(),
    };
  }
}
