import { Auction, BidRecord } from '../entities/Auction';

export interface IAuctionRepository {
  findById(id: string): Promise<Auction | null>;
  findActiveAuctions(): Promise<Auction[]>;
  findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]>;
  findBySellerId(sellerId: string): Promise<Auction[]>;
  create(auction: Auction): Promise<Auction>;
  update(auction: Auction): Promise<void>;
  saveBid?(bid: BidRecord): Promise<void>;
  findBidsByAuctionId?(auctionId: string): Promise<BidRecord[]>;
}
