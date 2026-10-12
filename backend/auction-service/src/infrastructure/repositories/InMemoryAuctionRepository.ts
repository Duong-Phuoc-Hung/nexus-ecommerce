import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus } from '../../domain/entities/Auction';

export class InMemoryAuctionRepository implements IAuctionRepository {
  private readonly auctions: Map<string, Auction> = new Map();

  constructor() {
    const sampleAuction = new Auction({
      id: 'auc_01hqz777live',
      productId: 'prod_01hqz999xyz',
      sellerId: 'usr_01hqz333sel',
      startingPrice: 100.0,
      currentHighestBid: 250.0,
      highestBidderId: 'usr_01hqz789abc',
      bidIncrement: 10.0,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600 * 1000), // Kết thúc sau 1 giờ
      antiSnipingExtensionSeconds: 120, // Gia hạn 2 phút
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.auctions.set(sampleAuction.id, sampleAuction);
  }

  public async findById(id: string): Promise<Auction | null> {
    return this.auctions.get(id) || null;
  }

  public async findActiveAuctions(): Promise<Auction[]> {
    return Array.from(this.auctions.values()).filter(
      (a) => a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.EXTENDED,
    );
  }

  public async save(auction: Auction): Promise<void> {
    this.auctions.set(auction.id, auction);
  }

  public async update(auction: Auction): Promise<void> {
    this.auctions.set(auction.id, auction);
  }
}
