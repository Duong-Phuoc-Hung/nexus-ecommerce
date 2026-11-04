import { PrismaClient } from '@prisma/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus, BidRecord } from '../../domain/entities/Auction';

export class PostgresAuctionRepository implements IAuctionRepository {
  private prisma: any;
  private fallbackMemory: Map<string, Auction> = new Map();
  private fallbackBids: Map<string, BidRecord[]> = new Map();

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || PrismaClientWrapper.getInstance();
    this.initSampleMemory();
  }

  // Khởi tạo phòng mẫu trong bộ nhớ phòng khi CSDL chưa kết nối
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

  // Tìm phòng đấu giá theo ID qua Prisma ORM
  public async findById(id: string): Promise<Auction | null> {
    try {
      const isNumeric = /^\d+$/.test(id);
      if (!isNumeric) {
        return this.fallbackMemory.get(id) || null;
      }
      const record = await this.prisma.auctionRoom.findUnique({
        where: { id: BigInt(id) },
      });
      if (!record) return null;
      return this.mapModelToAuction(record);
    } catch {
      return this.fallbackMemory.get(id) || null;
    }
  }

  // Lấy các phòng đấu giá đang diễn ra qua Prisma ORM
  public async findActiveAuctions(): Promise<Auction[]> {
    try {
      const records = await this.prisma.auctionRoom.findMany({
        where: {
          status: { in: ['ACTIVE', 'EXTENDED'] },
        },
        orderBy: { endTime: 'asc' },
      });
      return records.map((r: any) => this.mapModelToAuction(r));
    } catch {
      return Array.from(this.fallbackMemory.values()).filter(
        (a) => a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.EXTENDED,
      );
    }
  }

  // Lấy danh sách phòng có hỗ trợ lọc qua Prisma ORM
  public async findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]> {
    try {
      const where: any = {};
      if (filters?.status) where.status = filters.status;
      if (filters?.sellerId) where.sellerId = filters.sellerId;

      const records = await this.prisma.auctionRoom.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r: any) => this.mapModelToAuction(r));
    } catch {
      let items = Array.from(this.fallbackMemory.values());
      if (filters?.status) items = items.filter((a) => a.status === filters.status);
      if (filters?.sellerId) items = items.filter((a) => a.sellerId === filters.sellerId);
      return items;
    }
  }

  // Lấy phòng đấu giá theo người bán
  public async findBySellerId(sellerId: string): Promise<Auction[]> {
    return this.findAll({ sellerId });
  }

  // Tạo mới phòng đấu giá qua Prisma ORM
  public async create(auction: Auction): Promise<Auction> {
    try {
      const record = await this.prisma.auctionRoom.create({
        data: {
          productId: BigInt(auction.productId || '1'),
          sellerId: auction.sellerId,
          title: auction.title,
          startPrice: auction.startingPrice,
          currentPrice: auction.currentHighestBid,
          bidStep: auction.bidIncrement,
          buyNowPrice: auction.buyNowPrice || null,
          status: auction.status,
          startTime: auction.startTime,
          endTime: auction.endTime,
          actualEndTime: auction.actualEndTime || null,
          createdAt: auction.createdAt,
          updatedAt: auction.updatedAt,
        },
      });

      const saved = this.mapModelToAuction(record);
      this.fallbackMemory.set(saved.id, saved);
      return saved;
    } catch {
      this.fallbackMemory.set(auction.id, auction);
      return auction;
    }
  }

  // Cập nhật thông tin và trạng thái phòng đấu giá qua Prisma ORM
  public async update(auction: Auction): Promise<void> {
    try {
      const isNumeric = /^\d+$/.test(auction.id);
      if (isNumeric) {
        await this.prisma.auctionRoom.update({
          where: { id: BigInt(auction.id) },
          data: {
            title: auction.title,
            currentPrice: auction.currentHighestBid,
            bidStep: auction.bidIncrement,
            buyNowPrice: auction.buyNowPrice || null,
            status: auction.status,
            winnerId: auction.highestBidderId || null,
            endTime: auction.endTime,
            actualEndTime: auction.actualEndTime || null,
            updatedAt: auction.updatedAt,
          },
        });
      }
      this.fallbackMemory.set(auction.id, auction);
    } catch {
      this.fallbackMemory.set(auction.id, auction);
    }
  }

  // Lưu lịch sử đặt giá mới qua Prisma ORM
  public async saveBid(bid: BidRecord): Promise<void> {
    try {
      const isNumeric = /^\d+$/.test(bid.auctionId);
      if (isNumeric) {
        await this.prisma.auctionBid.create({
          data: {
            auctionId: BigInt(bid.auctionId),
            bidderId: bid.bidderId,
            bidAmount: bid.amount,
            bidTime: bid.bidTime,
            isWinning: bid.isWinning ?? true,
          },
        });
      }
      const list = this.fallbackBids.get(bid.auctionId) || [];
      list.unshift(bid);
      this.fallbackBids.set(bid.auctionId, list);
    } catch {
      const list = this.fallbackBids.get(bid.auctionId) || [];
      list.unshift(bid);
      this.fallbackBids.set(bid.auctionId, list);
    }
  }

  // Lấy lịch sử các lượt đặt giá qua Prisma ORM
  public async findBidsByAuctionId(auctionId: string): Promise<BidRecord[]> {
    try {
      const isNumeric = /^\d+$/.test(auctionId);
      if (!isNumeric) {
        return this.fallbackBids.get(auctionId) || [];
      }
      const records = await this.prisma.auctionBid.findMany({
        where: { auctionId: BigInt(auctionId) },
        orderBy: { bidTime: 'desc' },
      });
      return records.map((r: any) => ({
        id: String(r.id),
        auctionId: String(r.auctionId),
        bidderId: r.bidderId,
        amount: Number(r.bidAmount),
        bidTime: r.bidTime,
        isWinning: r.isWinning,
      }));
    } catch {
      return this.fallbackBids.get(auctionId) || [];
    }
  }

  // Ánh xạ bản ghi Prisma sang Domain Entity Auction
  private mapModelToAuction(record: any): Auction {
    return new Auction({
      id: String(record.id),
      productId: String(record.productId),
      sellerId: record.sellerId,
      title: record.title,
      startingPrice: Number(record.startPrice),
      currentHighestBid: Number(record.currentPrice),
      highestBidderId: record.winnerId || undefined,
      bidIncrement: Number(record.bidStep),
      buyNowPrice: record.buyNowPrice ? Number(record.buyNowPrice) : undefined,
      status: record.status as AuctionStatus,
      startTime: record.startTime,
      endTime: record.endTime,
      actualEndTime: record.actualEndTime ? new Date(record.actualEndTime) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
