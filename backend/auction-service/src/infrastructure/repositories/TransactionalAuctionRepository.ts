import { Prisma, PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus, BidRecord } from '../../domain/entities/Auction';
import { generateUuidV7 } from '../utils/uuid';
import { AuctionMutationTransaction } from '../../application/auction-mutations';

export class TransactionalAuctionRepository implements IAuctionRepository {
  constructor(private readonly client?: Prisma.TransactionClient) {}

  private get prisma(): Prisma.TransactionClient {
    return this.client ?? PrismaClientWrapper.getInstance();
  }

  // Tìm phòng đấu giá theo ID qua Prisma ORM
  public async findById(id: string): Promise<Auction | null> {
    const record = await this.prisma.auctionRoom.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.mapModelToAuction(record);
  }

  // Lấy các phòng đấu giá đang diễn ra qua Prisma ORM
  public async findActiveAuctions(): Promise<Auction[]> {
    const records = await this.prisma.auctionRoom.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXTENDED'] },
      },
      orderBy: { endTime: 'asc' },
    });
    return records.map((r: any) => this.mapModelToAuction(r));
  }

  // Lấy danh sách phòng có hỗ trợ lọc qua Prisma ORM
  public async findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]> {
    const where: any = {};
    if (filters?.status && filters.status.toLowerCase() !== 'all') {
      const targetStatus = filters.status.toUpperCase();
      if (targetStatus === 'ACTIVE') {
        where.status = { in: ['ACTIVE', 'EXTENDED'] };
      } else if (targetStatus === 'UPCOMING') {
        where.status = 'SCHEDULED';
      } else {
        where.status = targetStatus;
      }
    }
    if (filters?.sellerId && filters.sellerId.toLowerCase() !== 'all') {
      where.sellerId = filters.sellerId;
    }

    const records = await this.prisma.auctionRoom.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapModelToAuction(r));
  }

  // Lấy phòng đấu giá theo người bán
  public async findBySellerId(sellerId: string): Promise<Auction[]> {
    return this.findAll({ sellerId });
  }

  // Tạo mới phòng đấu giá qua Prisma ORM
  public async create(auction: Auction): Promise<Auction> {
    const auctionId = auction.id && !auction.id.startsWith('auc_') ? auction.id : generateUuidV7();
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
        status: auction.status,
        startTime: auction.startTime,
        endTime: auction.endTime,
        actualEndTime: auction.actualEndTime || null,
        cancelReason: auction.cancelReason || null,
        cancelledBy: auction.cancelledBy || null,
        cancelledAt: auction.cancelledAt || null,
        createdAt: auction.createdAt,
        updatedAt: auction.updatedAt,
      },
    });

    return this.mapModelToAuction(record);
  }

  public async update(auction: Auction): Promise<void> {
    await this.prisma.auctionRoom.update({
      where: { id: auction.id },
      data: {
        title: auction.title,
        currentPrice: auction.currentHighestBid,
        bidStep: auction.bidIncrement,
        buyNowPrice: auction.buyNowPrice ?? null,
        status: auction.status,
        winnerId: auction.highestBidderId ?? null,
        startTime: auction.startTime,
        endTime: auction.endTime,
        actualEndTime: auction.actualEndTime ?? null,
        cancelReason: auction.cancelReason ?? null,
        cancelledBy: auction.cancelledBy ?? null,
        cancelledAt: auction.cancelledAt ?? null,
        updatedAt: auction.updatedAt,
      },
    });
  }

  public async saveBid(bid: BidRecord): Promise<void> {
    await this.prisma.auctionBid.create({
      data: {
        id: bid.id || bid.bidId || generateUuidV7(),
        auctionId: bid.auctionId,
        bidderId: bid.bidderId,
        bidAmount: bid.amount,
        bidTime: bid.bidTime,
        isWinning: bid.isWinning ?? true,
      },
    });
  }

  // Lấy lịch sử các lượt đặt giá qua Prisma ORM
  public async findBidsByAuctionId(auctionId: string): Promise<BidRecord[]> {
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
  }

  // Ánh xạ bản ghi Prisma sang Domain Entity Auction (Đọc trực tiếp audit từ DB, không dùng Map RAM)
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
      cancelReason: record.cancelReason || undefined,
      cancelledBy: record.cancelledBy || undefined,
      cancelledAt: record.cancelledAt ? new Date(record.cancelledAt) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}

export function createPostgresAuctionTransaction(
  client?: PrismaClient,
): AuctionMutationTransaction {
  return {
    run(id, operation) {
      return (client ?? PrismaClientWrapper.getInstance()).$transaction(async (tx) => {
        // Read and validate the latest auction inside the same lock used for all its writes.
        await tx.$queryRaw`SELECT id FROM auction_rooms WHERE id = ${id} FOR UPDATE`;
        return operation(new TransactionalAuctionRepository(tx));
      });
    },
  };
}
