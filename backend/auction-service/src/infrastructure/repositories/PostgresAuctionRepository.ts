import { Pool } from 'pg';
import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus, BidRecord } from '../../domain/entities/Auction';

export class PostgresAuctionRepository implements IAuctionRepository {
  private pool: Pool;
  private fallbackMemory: Map<string, Auction> = new Map();
  private fallbackBids: Map<string, BidRecord[]> = new Map();
  private isConnected = false;

  constructor(pool?: Pool) {
    this.pool =
      pool ||
      new Pool({
        host: process.env.AUCTION_DB_HOST || process.env.DB_HOST || 'localhost',
        port: Number(process.env.AUCTION_DB_PORT || process.env.DB_PORT) || 5435,
        user: process.env.AUCTION_DB_USER || process.env.DB_USER || 'nexus_auction',
        password: process.env.AUCTION_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password',
        database: process.env.AUCTION_DB_NAME || process.env.DB_NAME || 'nexus_auction_db',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 1500,
      });

    this.initSampleMemory();
  }

  private initSampleMemory(): void {
    const sample = new Auction({
      id: '1',
      productId: '1',
      sellerId: 'a0000000-0000-0000-0000-000000000002',
      title: 'Đấu giá iPhone 15 Pro Max 256GB Titan Tự Nhiên',
      startingPrice: 20000000,
      currentHighestBid: 25000000,
      highestBidderId: 'a0000000-0000-0000-0000-000000000003',
      bidIncrement: 500000,
      status: AuctionStatus.ACTIVE,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600 * 1000 * 24),
      antiSnipingExtensionSeconds: 120,
    });
    this.fallbackMemory.set(sample.id, sample);
  }

  public async findById(id: string): Promise<Auction | null> {
    try {
      const isNumeric = /^\d+$/.test(id);
      const query = `
        SELECT id, product_id, seller_id, title, start_price, current_price, bid_step, 
               buy_now_price, status, winner_id, start_time, end_time, created_at, updated_at
        FROM auction_rooms
        WHERE ${isNumeric ? 'id = $1' : 'id::text = $1'}
        LIMIT 1;
      `;
      const res = await this.pool.query(query, isNumeric ? [parseInt(id, 10)] : [id]);
      if (res.rows.length === 0) return null;
      return this.mapRowToAuction(res.rows[0]);
    } catch {
      return this.fallbackMemory.get(id) || null;
    }
  }

  public async findActiveAuctions(): Promise<Auction[]> {
    try {
      const query = `
        SELECT id, product_id, seller_id, title, start_price, current_price, bid_step, 
               buy_now_price, status, winner_id, start_time, end_time, created_at, updated_at
        FROM auction_rooms
        WHERE status IN ('ACTIVE', 'EXTENDED')
        ORDER BY end_time ASC;
      `;
      const res = await this.pool.query(query);
      return res.rows.map((row: any) => this.mapRowToAuction(row));
    } catch {
      return Array.from(this.fallbackMemory.values()).filter(
        (a) => a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.EXTENDED,
      );
    }
  }

  public async findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]> {
    try {
      let query = `
        SELECT id, product_id, seller_id, title, start_price, current_price, bid_step, 
               buy_now_price, status, winner_id, start_time, end_time, created_at, updated_at
        FROM auction_rooms
        WHERE 1=1
      `;
      const params: any[] = [];
      if (filters?.status) {
        params.push(filters.status);
        query += ` AND status = $${params.length}`;
      }
      if (filters?.sellerId) {
        params.push(filters.sellerId);
        query += ` AND seller_id = $${params.length}`;
      }
      query += ' ORDER BY created_at DESC;';

      const res = await this.pool.query(query, params);
      return res.rows.map((row: any) => this.mapRowToAuction(row));
    } catch {
      let items = Array.from(this.fallbackMemory.values());
      if (filters?.status) items = items.filter((a) => a.status === filters.status);
      if (filters?.sellerId) items = items.filter((a) => a.sellerId === filters.sellerId);
      return items;
    }
  }

  public async findBySellerId(sellerId: string): Promise<Auction[]> {
    return this.findAll({ sellerId });
  }

  public async save(auction: Auction): Promise<void> {
    try {
      const query = `
        INSERT INTO auction_rooms (
          product_id, seller_id, title, start_price, current_price, bid_step, 
          buy_now_price, status, start_time, end_time, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id;
      `;
      const params = [
        parseInt(auction.productId, 10) || 1,
        auction.sellerId,
        auction.title,
        auction.startingPrice,
        auction.currentHighestBid,
        auction.bidIncrement,
        auction.buyNowPrice || null,
        auction.status,
        auction.startTime,
        auction.endTime,
        auction.createdAt,
        auction.updatedAt,
      ];
      const res = await this.pool.query(query, params);
      const insertedId = String(res.rows[0].id);
      this.fallbackMemory.set(insertedId, auction);
    } catch {
      this.fallbackMemory.set(auction.id, auction);
    }
  }

  public async update(auction: Auction): Promise<void> {
    try {
      const query = `
        UPDATE auction_rooms
        SET title = $1, current_price = $2, bid_step = $3, buy_now_price = $4,
            status = $5, winner_id = $6, end_time = $7, updated_at = $8
        WHERE id = $9;
      `;
      const params = [
        auction.title,
        auction.currentHighestBid,
        auction.bidIncrement,
        auction.buyNowPrice || null,
        auction.status,
        auction.highestBidderId || null,
        auction.endTime,
        auction.updatedAt,
        parseInt(auction.id, 10) || 1,
      ];
      await this.pool.query(query, params);
      this.fallbackMemory.set(auction.id, auction);
    } catch {
      this.fallbackMemory.set(auction.id, auction);
    }
  }

  public async saveBid(bid: BidRecord): Promise<void> {
    try {
      const query = `
        INSERT INTO auction_bids (auction_id, bidder_id, bid_amount, bid_time, is_winning)
        VALUES ($1, $2, $3, $4, $5);
      `;
      await this.pool.query(query, [
        parseInt(bid.auctionId, 10) || 1,
        bid.bidderId,
        bid.amount,
        bid.bidTime,
        bid.isWinning ?? true,
      ]);
    } catch {
      const list = this.fallbackBids.get(bid.auctionId) || [];
      list.unshift(bid);
      this.fallbackBids.set(bid.auctionId, list);
    }
  }

  public async findBidsByAuctionId(auctionId: string): Promise<BidRecord[]> {
    try {
      const query = `
        SELECT id, auction_id, bidder_id, bid_amount, bid_time, is_winning
        FROM auction_bids
        WHERE auction_id = $1
        ORDER BY bid_time DESC;
      `;
      const res = await this.pool.query(query, [parseInt(auctionId, 10) || 1]);
      return res.rows.map((r: any) => ({
        id: String(r.id),
        auctionId: String(r.auction_id),
        bidderId: r.bidder_id,
        amount: Number(r.bid_amount),
        bidTime: new Date(r.bid_time),
        isWinning: r.is_winning,
      }));
    } catch {
      return this.fallbackBids.get(auctionId) || [];
    }
  }

  private mapRowToAuction(row: any): Auction {
    return new Auction({
      id: String(row.id),
      productId: String(row.product_id),
      sellerId: row.seller_id,
      title: row.title,
      startingPrice: Number(row.start_price),
      currentHighestBid: Number(row.current_price),
      highestBidderId: row.winner_id || undefined,
      bidIncrement: Number(row.bid_step),
      buyNowPrice: row.buy_now_price ? Number(row.buy_now_price) : undefined,
      status: row.status as AuctionStatus,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
