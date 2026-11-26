import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  IAuctionRepository,
  AuctionSettlementRecord,
} from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus, BidRecord } from '../../domain/entities/Auction';
import { generateUuidV7 } from '../utils/uuid';

export class PostgresAuctionRepository implements IAuctionRepository {
  private _prisma?: PrismaClient;
  private fallbackMemory: Map<string, Auction> = new Map();
  private fallbackBids: Map<string, BidRecord[]> = new Map();
  private fallbackSettlements: Map<string, AuctionSettlementRecord> = new Map();

  constructor(prisma?: PrismaClient) {
    if (prisma) {
      this._prisma = prisma;
    }
    this.initSampleMemory();
  }

  private get prisma(): PrismaClient {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
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
      const record = await this.prisma.auctionRoom.findUnique({
        where: { id },
      });
      if (!record) return this.fallbackMemory.get(id) || null;
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
          endTime: { gt: new Date() },
        },
        orderBy: { endTime: 'asc' },
      });
      return records.map((r: any) => this.mapModelToAuction(r));
    } catch {
      return Array.from(this.fallbackMemory.values()).filter(
        (a) =>
          (a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.EXTENDED) &&
          a.endTime > new Date(),
      );
    }
  }

  // Lấy danh sách phòng có hỗ trợ lọc qua Prisma ORM
  public async findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]> {
    try {
      const where: any = {};
      if (filters?.status && filters.status.toUpperCase() !== 'ALL') {
        const targetStatus = filters.status.toUpperCase();
        if (targetStatus === 'ACTIVE') {
          where.status = { in: ['ACTIVE', 'EXTENDED'] };
          where.endTime = { gt: new Date() };
        } else if (targetStatus === 'ENDED') {
          where.OR = [
            { status: { in: ['ENDED', 'SETTLED'] } },
            { status: { in: ['ACTIVE', 'EXTENDED', 'SCHEDULED'] }, endTime: { lte: new Date() } },
          ];
        } else if (targetStatus === 'UPCOMING') {
          where.status = 'SCHEDULED';
        } else {
          where.status = targetStatus;
        }
      }
      if (filters?.sellerId) where.sellerId = filters.sellerId;

      const records = await this.prisma.auctionRoom.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r: any) => this.mapModelToAuction(r));
    } catch {
      let items = Array.from(this.fallbackMemory.values());
      if (filters?.status && filters.status.toUpperCase() !== 'ALL')
        items = items.filter((a) => a.status === filters.status);
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
      const auctionId =
        auction.id && !auction.id.startsWith('auc_') ? auction.id : generateUuidV7();
      const record = await this.prisma.auctionRoom.create({
        data: {
          id: auctionId,
          productId: auction.productId || '1',
          sellerId: auction.sellerId,
          title: auction.title,
          startPrice: auction.startingPrice,
          currentPrice: auction.currentHighestBid,
          bidStep: auction.bidIncrement,
          buyNowPrice: auction.buyNowPrice || null,
          imageUrl: auction.imageUrl || null,
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
      await this.prisma.auctionRoom.update({
        where: { id: auction.id },
        data: {
          title: auction.title,
          currentPrice: auction.currentHighestBid,
          bidStep: auction.bidIncrement,
          buyNowPrice: auction.buyNowPrice || null,
          imageUrl: auction.imageUrl || null,
          status: auction.status,
          winnerId: auction.highestBidderId || null,
          endTime: auction.endTime,
          actualEndTime: auction.actualEndTime || null,
          updatedAt: auction.updatedAt,
        },
      });
      this.fallbackMemory.set(auction.id, auction);
    } catch {
      this.fallbackMemory.set(auction.id, auction);
    }
  }

  // Lưu lịch sử đặt giá mới qua Prisma ORM
  public async saveBid(bid: BidRecord): Promise<void> {
    try {
      const bidId = bid.id || bid.bidId || generateUuidV7();
      await this.prisma.auctionBid.create({
        data: {
          id: bidId,
          auctionId: bid.auctionId,
          bidderId: bid.bidderId,
          bidAmount: bid.amount,
          bidTime: bid.bidTime,
          isWinning: bid.isWinning ?? true,
        },
      });
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
      const records = await this.prisma.auctionBid.findMany({
        where: { auctionId },
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

  public async saveSettlement(settlement: AuctionSettlementRecord): Promise<void> {
    try {
      const settlementId = settlement.id || generateUuidV7();
      await this.prisma.auctionSettlement.upsert({
        where: { auctionId: settlement.auctionId },
        create: {
          id: settlementId,
          auctionId: settlement.auctionId,
          winnerId: settlement.winnerId,
          winningBidAmount: settlement.winningBidAmount,
          paymentDeadline: settlement.paymentDeadline,
          orderId: settlement.orderId || null,
          status: settlement.status || 'PENDING_PAYMENT',
          settledAt: settlement.settledAt || new Date(),
        },
        update: {
          winnerId: settlement.winnerId,
          winningBidAmount: settlement.winningBidAmount,

          orderId: settlement.orderId ?? undefined,
          status: settlement.status,
        },
      });
      this.fallbackSettlements.set(settlement.auctionId, settlement);
    } catch {
      this.fallbackSettlements.set(settlement.auctionId, settlement);
    }
  }

  public async findSettlementByAuctionId(
    auctionId: string,
  ): Promise<AuctionSettlementRecord | null> {
    try {
      const record = await this.prisma.auctionSettlement.findUnique({
        where: { auctionId },
      });
      if (!record) return null;
      return {
        id: record.id,
        auctionId: record.auctionId,
        winnerId: record.winnerId,
        winningBidAmount: Number(record.winningBidAmount),
        paymentDeadline: record.paymentDeadline,
        orderId: record.orderId || undefined,
        status: record.status,
        settledAt: record.settledAt,
      };
    } catch {
      return this.fallbackSettlements.get(auctionId) || null;
    }
  }

  // Ánh xạ bản ghi Prisma sang Domain Entity Auction
  private mapModelToAuction(record: any): Auction {
    let status = record.status as AuctionStatus;
    const now = new Date();

    // Tự động chuẩn hóa trạng thái theo thời gian thực (Life-cycle Synchronization)
    if (
      status !== AuctionStatus.ENDED &&
      status !== AuctionStatus.CANCELLED &&
      status !== AuctionStatus.SETTLED
    ) {
      const isPastEndTime = record.endTime && new Date(record.endTime) <= now;
      if (isPastEndTime) {
        status = AuctionStatus.ENDED;
      } else if (record.startTime && new Date(record.startTime) <= now) {
        status = AuctionStatus.ACTIVE;
      }
    }

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
      status,
      startTime: record.startTime,
      endTime: record.endTime,
      actualEndTime: record.actualEndTime ? new Date(record.actualEndTime) : undefined,
      imageUrl: record.imageUrl || record.image_url || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
