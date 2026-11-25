import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { Auction, AuctionStatus } from '../../domain/entities/Auction';
import { AuctionDetailDto, AuctionBidDetailDto } from '../dtos/AuctionDetailDto';
import {
  AuctionSettlementRecord,
  auctionRuntimeStore,
  PAYMENT_DEADLINE_MS,
} from '../../infrastructure/state/AuctionRuntimeStore';
import { MIN_BUYER_BID_REPUTATION } from '../../infrastructure/clients/HttpUserReputationClient';
import {
  dispatchAuctionTimeoutNotification,
  maskDisplayName,
  recordAuctionReputationEvent,
  resolveUserFullName,
  syncAuctionOrderStatus,
} from '../../infrastructure/clients/AuctionSyncClient';

export function maskBidderAlias(bidderId: string): string {
  const clean = String(bidderId || '').trim();
  if (!clean) return 'Người tham gia';
  const tail = clean.slice(-4).toUpperCase();
  return `Buyer ••••${tail}`;
}

export async function hydrateAuctionSettlement(
  auction: Auction,
  repo: IAuctionRepository,
  now: Date = new Date(),
): Promise<AuctionSettlementRecord | undefined> {
  if (auction.status !== AuctionStatus.ENDED && auction.status !== AuctionStatus.SETTLED) {
    return auctionRuntimeStore.getSettlement(auction.id);
  }

  let settlement = auctionRuntimeStore.getSettlement(auction.id);
  const dbRow = repo.findSettlementByAuctionId
    ? await repo.findSettlementByAuctionId(auction.id)
    : null;

  const winnerId = dbRow?.winnerId || settlement?.winnerId || auction.highestBidderId || undefined;
  const winningBidAmount =
    dbRow?.winningBidAmount ??
    settlement?.winningBidAmount ??
    settlement?.finalPrice ??
    (winnerId ? auction.currentHighestBid : undefined);
  const settledAtIso =
    dbRow?.settledAt?.toISOString() ||
    settlement?.settledAt ||
    (auction.actualEndTime || auction.endTime || now).toISOString();
  const paymentDueIso =
    dbRow?.paymentDeadline?.toISOString() ||
    settlement?.paymentDueAt ||
    (winnerId
      ? new Date(new Date(settledAtIso).getTime() + PAYMENT_DEADLINE_MS).toISOString()
      : undefined);

  if (!winnerId) {
    return auctionRuntimeStore.setSettlement({
      auctionId: auction.id,
      outcome: 'NO_BIDS',
      closedReason: settlement?.closedReason || 'TIME_EXPIRED',
      settledAt: settledAtIso,
      paymentStatus: 'NONE',
    });
  }

  // Bảo đảm bản ghi settlement tồn tại trong PostgreSQL khi phiên vừa chuyển ENDED
  let orderId = dbRow?.orderId || settlement?.orderId || undefined;
  let orderCode = settlement?.orderCode || undefined;
  let paymentUrl = settlement?.paymentUrl || undefined;
  let paymentStatus: AuctionSettlementRecord['paymentStatus'] =
    dbRow?.status === 'PAID'
      ? 'PAID'
      : dbRow?.status === 'TIMEOUT_PENALIZED'
        ? 'TIMEOUT'
        : settlement?.paymentStatus || 'PENDING';

  // Đồng bộ trạng thái đơn / thanh toán thực tế từ Commerce Service (bao gồm đối soát PayOS trực tiếp)
  let commerceConfirmedTimeout = false;
  if (paymentStatus !== 'PAID' && dbRow?.status !== 'TIMEOUT_PENALIZED') {
    const synced = await syncAuctionOrderStatus(orderId || auction.id);
    if (synced) {
      if (synced.orderId) orderId = synced.orderId;
      commerceConfirmedTimeout = synced.noOrder === true || synced.paymentStatus === 'TIMEOUT';
      orderCode = synced.orderCode;
      if (synced.checkoutUrl) paymentUrl = synced.checkoutUrl;
      if (synced.paymentStatus === 'PAID') {
        paymentStatus = 'PAID';
      } else if (
        synced.paymentStatus === 'TIMEOUT' &&
        paymentDueIso &&
        now.getTime() >= new Date(paymentDueIso).getTime()
      ) {
        paymentStatus = 'TIMEOUT';
      }
    }
  }

  // Kiểm tra quá hạn thanh toán 24 giờ (sau khi đã đối soát PayOS qua syncAuctionOrderStatus ở trên)
  if (
    (paymentStatus === 'PENDING' || paymentStatus === 'RECONCILING') &&
    paymentDueIso &&
    now.getTime() > new Date(paymentDueIso).getTime()
  ) {
    paymentStatus = commerceConfirmedTimeout ? 'TIMEOUT' : 'RECONCILING';
  }

  const newlyPaid = paymentStatus === 'PAID' && dbRow?.status !== 'PAID';
  const newlyTimedOut = paymentStatus === 'TIMEOUT' && dbRow?.status !== 'TIMEOUT_PENALIZED';

  // Khi vừa chuyển sang PAID hoặc TIMEOUT_PENALIZED: kích hoạt cộng/trừ điểm uy tín và gửi thông báo idempotent
  if (newlyPaid && winnerId) {
    const recorded = await recordAuctionReputationEvent({
      userId: winnerId,
      ruleCode: 'AUCTION_PAID_ON_TIME',
      auctionId: auction.id,
      reason: `Thanh toán đúng hạn đơn trúng đấu giá #${orderCode || auction.id}`,
    });
    if (!recorded) paymentStatus = 'RECONCILING';
  } else if (newlyTimedOut && winnerId) {
    const penaltyAmount = winningBidAmount ?? auction.currentHighestBid;
    const recorded = await recordAuctionReputationEvent({
      userId: winnerId,
      ruleCode: 'AUCTION_PAYMENT_TIMEOUT',
      auctionId: auction.id,
      reason: `Quá hạn thanh toán phiên đấu giá thắng cuộc "${auction.title}" (#${auction.id})`,
    });
    const notified =
      recorded &&
      (await dispatchAuctionTimeoutNotification({
        recipientId: winnerId,
        auctionId: auction.id,
        auctionTitle: auction.title,
        winningAmount: penaltyAmount,
      }));
    if (!recorded || !notified) paymentStatus = 'RECONCILING';
  }

  // Ghi đồng bộ lại DB nếu chưa có bản ghi hoặc trạng thái đã chuyển sang PAID / TIMEOUT
  if (
    repo.upsertSettlement &&
    (!dbRow ||
      (orderId && dbRow.orderId !== orderId) ||
      (newlyPaid && paymentStatus === 'PAID') ||
      (newlyTimedOut && paymentStatus === 'TIMEOUT'))
  ) {
    await repo.upsertSettlement({
      auctionId: auction.id,
      winnerId,
      winningBidAmount: winningBidAmount ?? auction.currentHighestBid,
      paymentDeadline: new Date(paymentDueIso || settledAtIso),
      orderId: orderId ?? null,
      status:
        paymentStatus === 'PAID'
          ? 'PAID'
          : paymentStatus === 'TIMEOUT'
            ? 'TIMEOUT_PENALIZED'
            : 'PENDING_PAYMENT',
      settledAt: new Date(settledAtIso),
    });
  }

  const fullName = await resolveUserFullName(winnerId);
  const winnerAlias = maskDisplayName(fullName, winnerId);
  const isBuyNow = Boolean(
    auction.buyNowPrice &&
    winningBidAmount &&
    winningBidAmount >= auction.buyNowPrice &&
    auction.actualEndTime &&
    auction.actualEndTime.getTime() < auction.endTime.getTime(),
  );

  return auctionRuntimeStore.setSettlement({
    auctionId: auction.id,
    outcome: 'WON',
    closedReason: settlement?.closedReason || (isBuyNow ? 'BUY_NOW' : 'TIME_EXPIRED'),
    winnerId,
    winnerAlias,
    winnerName: fullName,
    finalPrice: winningBidAmount,
    winningBidAmount,
    settledAt: settledAtIso,
    paymentReadyAt: settlement?.paymentReadyAt || settledAtIso,
    paymentDueAt: paymentDueIso,
    orderId,
    orderCode,
    paymentUrl,
    paymentStatus,
    checkoutResult: settlement?.checkoutResult,
  });
}

export class GetAuctionDetailUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(auctionId: string): Promise<AuctionDetailDto> {
    const auction = await this.auctionRepository.findById(auctionId);

    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    const now = new Date();
    // Tự động đồng bộ trạng thái hiệu lực (SCHEDULED -> ACTIVE -> ENDED) theo giờ hệ thống
    if (auction.syncLifecycle(now)) {
      await this.auctionRepository.update(auction).catch(() => {});
    }

    const rawBids = this.auctionRepository.findBidsByAuctionId
      ? await this.auctionRepository.findBidsByAuctionId(auctionId)
      : [];

    // Gán thứ tự sequence tăng dần theo thời gian để phân biệt lượt cùng mili-giây
    const sortedAsc = [...rawBids].sort((a, b) => {
      const ta = a.bidTime instanceof Date ? a.bidTime.getTime() : new Date(a.bidTime).getTime();
      const tb = b.bidTime instanceof Date ? b.bidTime.getTime() : new Date(b.bidTime).getTime();
      return ta - tb;
    });
    const seqMap = new Map<string, number>();
    sortedAsc.forEach((b, idx) => {
      seqMap.set(b.id || b.bidId || `${idx}`, idx + 1);
    });

    auction.setBidCount(rawBids.length || (auction.highestBidderId ? 1 : 0));

    const meta = auctionRuntimeStore.ensureMeta(auctionId, {
      endTime: auction.endTime,
      startingPrice: auction.startingPrice,
      bidIncrement: auction.bidIncrement,
    });
    auction.setExtensionCount(meta.extensionCount);

    // Hydrate settlement bền vững từ PostgreSQL + đồng bộ thanh toán Commerce + winnerAlias
    const settlement = await hydrateAuctionSettlement(auction, this.auctionRepository, now);

    const bids: AuctionBidDetailDto[] = rawBids.map((b, idx) => {
      const timeMs =
        b.bidTime instanceof Date ? b.bidTime.getTime() : new Date(b.bidTime).getTime();
      const bidKey = b.id || b.bidId || `${idx}`;
      return {
        id: bidKey,
        seq: seqMap.get(bidKey) ?? rawBids.length - idx,
        bidder: b.bidderId,
        displayAlias: maskBidderAlias(b.bidderId),
        amount: b.amount,
        time: timeMs,
        acceptedAt: new Date(timeMs).toISOString(),
      };
    });

    const endIso =
      auction.endTime instanceof Date
        ? auction.endTime.toISOString()
        : new Date(auction.endTime).toISOString();
    const actualEndIso = auction.actualEndTime
      ? auction.actualEndTime instanceof Date
        ? auction.actualEndTime.toISOString()
        : new Date(auction.actualEndTime).toISOString()
      : undefined;
    const isClosed =
      auction.status === AuctionStatus.ENDED || auction.status === AuctionStatus.CANCELLED;
    const effectiveEndsIso = isClosed && actualEndIso ? actualEndIso : endIso;

    // Đối với client / frontend, phiên đã SETTLED tương ứng với trạng thái kết thúc (ENDED)
    const isSettled = (auction.status as string) === 'SETTLED';
    const clientStatus = isSettled ? 'ENDED' : auction.status;
    const effectiveEndTime =
      (isSettled || auction.status === 'ENDED') && auction.actualEndTime
        ? auction.actualEndTime.toISOString()
        : auction.endTime instanceof Date
          ? auction.endTime.toISOString()
          : new Date(auction.endTime).toISOString();

    return {
      id: auction.id,
      productId: auction.productId,
      sellerId: auction.sellerId,
      title: auction.title,
      imageUrl: auction.imageUrl,
      startingPrice: auction.startingPrice,
      currentHighestBid: auction.currentHighestBid,
      highestBidAmount: auction.highestBidAmount,
      nextMinBid: auction.nextMinBid,
      highestBidderId: auction.highestBidderId,
      bidIncrement: auction.bidIncrement,
      buyNowPrice: auction.buyNowPrice,
      status: clientStatus,
      visibility: meta.visibility,
      startTime:
        auction.startTime instanceof Date
          ? auction.startTime.toISOString()
          : new Date(auction.startTime).toISOString(),
      endTime: effectiveEndTime,
      originalEndTime: meta.originalEndTime,
      effectiveEndsAt: effectiveEndsIso,
      actualEndTime: actualEndIso,
      extensionCount: meta.extensionCount,
      maxExtensions: meta.maxExtensions,
      version: meta.version,
      serverTime: now.toISOString(),
      demoMode: meta.demoMode,
      demoMultiplier: meta.demoMultiplier,
      createdByAdminId: meta.createdByAdminId,
      cancelReason: auction.cancelReason,
      publicCancelReason: meta.publicCancelReason,
      internalCancelNote: meta.internalCancelNote,
      cancelledBy: auction.cancelledBy,
      cancelledAt: auction.cancelledAt
        ? auction.cancelledAt instanceof Date
          ? auction.cancelledAt.toISOString()
          : new Date(auction.cancelledAt).toISOString()
        : undefined,
      auditRef: meta.auditRef,
      effectiveRules: {
        firstBidStartsAtStartPrice: true,
        bidIncrement: auction.bidIncrement,
        antiSnipingWindowSeconds: meta.antiSnipingWindowSeconds,
        antiSnipingExtendSeconds: meta.antiSnipingExtendSeconds,
        maxExtensions: meta.maxExtensions,
        buyNowBeforeFirstBidOnly: true,
        paymentDeadlineHours: 24,
        minBuyerReputation: MIN_BUYER_BID_REPUTATION,
        demoMode: meta.demoMode,
        demoMultiplier: meta.demoMultiplier,
      },
      settlement,
      timeline: auctionRuntimeStore.getTimeline(auctionId),
      bids,
      bidCount: bids.length,
      bidHistoryAvailable: true,
    };
  }
}
