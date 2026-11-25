import { Auction, BidRecord } from '../entities/Auction';

export interface AuctionSettlementRecord {
  id?: string;
  auctionId: string;
  winnerId: string;
  winningBidAmount: number;
  paymentDeadline: Date;
  orderId?: string;
  status: string;
  settledAt?: Date;
}

export interface IAuctionRepository {
  findById(id: string): Promise<Auction | null>;
  findActiveAuctions(): Promise<Auction[]>;
  findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]>;
  findBySellerId(sellerId: string): Promise<Auction[]>;
  create(auction: Auction): Promise<Auction>;
  update(auction: Auction): Promise<void>;
  saveBid?(bid: BidRecord): Promise<void>;
  findBidsByAuctionId?(auctionId: string): Promise<BidRecord[]>;
  saveSettlement?(settlement: AuctionSettlementRecord): Promise<void>;
  findSettlementByAuctionId?(auctionId: string): Promise<AuctionSettlementRecord | null>;
}
