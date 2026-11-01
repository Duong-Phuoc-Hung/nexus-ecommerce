import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus, BidRecord } from '../../domain/entities/Auction';

export class InMemoryAuctionRepository implements IAuctionRepository {
  private readonly auctions: Map<string, Auction> = new Map();
  private readonly bids: Map<string, BidRecord[]> = new Map();

  constructor() {
    const sampleAuction = new Auction({
      id: 'auc_01hqz777live',
      productId: '1',
      sellerId: 'usr_01hqz333sel',
      title: 'Đấu giá iPhone 15 Pro Max 256GB Titan Tự Nhiên',
      startingPrice: 100.0,
      currentHighestBid: 250.0,
      highestBidderId: 'usr_01hqz789abc',
      bidIncrement: 10.0,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600 * 1000),
      antiSnipingExtensionSeconds: 120,
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

  public async findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]> {
    let list = Array.from(this.auctions.values());
    if (filters?.status) list = list.filter((a) => a.status === filters.status);
    if (filters?.sellerId) list = list.filter((a) => a.sellerId === filters.sellerId);
    return list;
  }

  public async findBySellerId(sellerId: string): Promise<Auction[]> {
    return this.findAll({ sellerId });
  }

  public async save(auction: Auction): Promise<void> {
    this.auctions.set(auction.id, auction);
  }

  public async update(auction: Auction): Promise<void> {
    this.auctions.set(auction.id, auction);
  }

  public async saveBid(bid: BidRecord): Promise<void> {
    const list = this.bids.get(bid.auctionId) || [];
    list.unshift(bid);
    this.bids.set(bid.auctionId, list);
  }

  public async findBidsByAuctionId(auctionId: string): Promise<BidRecord[]> {
    return this.bids.get(auctionId) || [];
  }
}
