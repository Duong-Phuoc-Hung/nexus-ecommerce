import { Prisma, PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  IAuctionRepository,
  PersistedSettlement,
  AuctionSettlementRecord,
} from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus, BidRecord } from '../../domain/entities/Auction';
import { generateUuidV7 } from '../utils/uuid';
import { AuctionMutationTransaction } from '../../application/auction-mutations';
import { auctionRuntimeStore } from '../state/AuctionRuntimeStore';

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
    await this.hydrateRoomAclFromDb(
      [String(record.id)],
      new Map([[String(record.id), record.endTime]]),
    );
    return this.mapModelToAuction(record);
  }

  // Lấy các phòng đấu giá đang diễn ra qua Prisma ORM
  public async findActiveAuctions(): Promise<Auction[]> {
    const records = await this.prisma.auctionRoom.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXTENDED'] },
        endTime: { gt: new Date() },
      },
      orderBy: { endTime: 'asc' },
    });
    await this.hydrateRoomAclFromDb(
      records.map((r: any) => String(r.id)),
      new Map(records.map((r: any) => [String(r.id), r.endTime])),
    );
    return records.map((r: any) => this.mapModelToAuction(r));
  }

  // Lấy danh sách phòng có hỗ trợ lọc qua Prisma ORM
  public async findAll(filters?: { status?: string; sellerId?: string }): Promise<Auction[]> {
    const where: any = {};
    if (filters?.status && filters.status.toLowerCase() !== 'all') {
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
    if (filters?.sellerId && filters.sellerId.toLowerCase() !== 'all') {
      where.sellerId = filters.sellerId;
    }

    const records = await this.prisma.auctionRoom.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    await this.hydrateRoomAclFromDb(
      records.map((r: any) => String(r.id)),
      new Map(records.map((r: any) => [String(r.id), r.endTime])),
    );
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
        imageUrl: auction.imageUrl || null,
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
        imageUrl: auction.imageUrl ?? null,
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

  // Lưu thông tin chốt phiên đấu giá vào bảng auction_settlements qua Prisma ORM
  public async saveSettlement(settlement: AuctionSettlementRecord): Promise<void> {
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
  }

  public async findSettlementByAuctionId(auctionId: string): Promise<PersistedSettlement | null> {
    const row = await this.prisma.auctionSettlement.findUnique({
      where: { auctionId },
    });
    if (!row) return null;
    return {
      id: String(row.id),
      auctionId: String(row.auctionId),
      winnerId: String(row.winnerId),
      winningBidAmount: Number(row.winningBidAmount),
      paymentDeadline: row.paymentDeadline,
      orderId: row.orderId ? String(row.orderId) : null,
      status: (row.status as PersistedSettlement['status']) || 'PENDING_PAYMENT',
      settledAt: row.settledAt,
    };
  }

  public async upsertSettlement(data: {
    auctionId: string;
    winnerId: string;
    winningBidAmount: number;
    paymentDeadline: Date;
    orderId?: string | null;
    status?: 'PENDING_PAYMENT' | 'PAID' | 'TIMEOUT_PENALIZED';
    settledAt?: Date;
  }): Promise<PersistedSettlement> {
    const row = await this.prisma.auctionSettlement.upsert({
      where: { auctionId: data.auctionId },
      create: {
        id: generateUuidV7(),
        auctionId: data.auctionId,
        winnerId: data.winnerId,
        winningBidAmount: data.winningBidAmount,
        paymentDeadline: data.paymentDeadline,
        orderId: data.orderId ?? null,
        status: data.status ?? 'PENDING_PAYMENT',
        settledAt: data.settledAt ?? new Date(),
      },
      update: {
        winnerId: data.winnerId,
        winningBidAmount: data.winningBidAmount,
        ...(data.orderId !== undefined ? { orderId: data.orderId } : {}),
        ...(data.status && data.status !== 'PENDING_PAYMENT' ? { status: data.status } : {}),
      },
    });
    return {
      id: String(row.id),
      auctionId: String(row.auctionId),
      winnerId: String(row.winnerId),
      winningBidAmount: Number(row.winningBidAmount),
      paymentDeadline: row.paymentDeadline,
      orderId: row.orderId ? String(row.orderId) : null,
      status: (row.status as PersistedSettlement['status']) || 'PENDING_PAYMENT',
      settledAt: row.settledAt,
    };
  }

  public async saveRoomAcl(
    auctionId: string,
    visibility: 'PUBLIC' | 'RESTRICTED',
    invitedUserIds: string[],
  ): Promise<void> {
    const cleanInvited = Array.isArray(invitedUserIds)
      ? invitedUserIds.map((u) => String(u).trim()).filter(Boolean)
      : [];
    try {
      await this.prisma.$executeRaw`
        UPDATE auction_rooms
        SET visibility = ${visibility},
            invited_user_ids = ${cleanInvited}::text[]
        WHERE id = ${auctionId}
      `;
    } catch (err: any) {
      console.warn('[TransactionalAuctionRepository.saveRoomAcl] Warning:', err?.message);
    }
  }

  public async loadRoomAcl(auctionId: string): Promise<{
    visibility: 'PUBLIC' | 'RESTRICTED';
    invitedUserIds: string[];
    endTime?: Date;
  } | null> {
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          end_time: Date;
          visibility: string | null;
          invited_user_ids: string[] | null;
        }>
      >`
        SELECT id, end_time, visibility, invited_user_ids
        FROM auction_rooms
        WHERE id = ${auctionId}
        LIMIT 1
      `;
      if (!rows.length) return null;
      const row = rows[0];
      // Fail-Closed policy: chỉ coi là PUBLIC khi cột visibility === 'PUBLIC'
      const resolvedVisibility: 'PUBLIC' | 'RESTRICTED' =
        row.visibility === 'PUBLIC' ? 'PUBLIC' : 'RESTRICTED';
      const resolvedInvited =
        row.visibility === 'RESTRICTED' && Array.isArray(row.invited_user_ids)
          ? row.invited_user_ids.map(String)
          : [];
      return {
        visibility: resolvedVisibility,
        invitedUserIds: resolvedInvited,
        endTime: row.end_time ? new Date(row.end_time) : undefined,
      };
    } catch {
      return null;
    }
  }

  private async hydrateRoomAclFromDb(ids: string[], endTimes: Map<string, Date>): Promise<void> {
    if (!ids.length) return;
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          visibility: string | null;
          invited_user_ids: string[] | null;
        }>
      >`
        SELECT id, visibility, invited_user_ids
        FROM auction_rooms
        WHERE id = ANY(${ids}::text[])
      `;
      for (const row of rows) {
        const auctionId = String(row.id);
        const resolvedVisibility: 'PUBLIC' | 'RESTRICTED' =
          row.visibility === 'PUBLIC' ? 'PUBLIC' : 'RESTRICTED';
        const resolvedInvited =
          row.visibility === 'RESTRICTED' && Array.isArray(row.invited_user_ids)
            ? row.invited_user_ids.map(String)
            : [];
        auctionRuntimeStore.ensureMeta(auctionId, {
          endTime: endTimes.get(auctionId) || new Date(Date.now() + 3600_000),
          visibility: resolvedVisibility,
          invitedUserIds: resolvedInvited,
        });
      }
    } catch {
      // Nếu cột V3 chưa chạy ở môi trường test cô lập cũ, bỏ qua hydration
    }
  }

  // Ánh xạ bản ghi Prisma sang Domain Entity Auction (Đọc trực tiếp audit từ DB, không dùng Map RAM)
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
