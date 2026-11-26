import { Request, Response } from 'express';
import {
  GetAuctionDetailUseCase,
  hydrateAuctionSettlement,
  maskBidderAlias,
} from '../../../application/use-cases/GetAuctionDetailUseCase';
import { resolveUserFullName } from '../../../infrastructure/clients/AuctionSyncClient';
import { CreateAuctionRoomUseCase } from '../../../application/use-cases/CreateAuctionRoomUseCase';
import { AuctionNotFoundException } from '../../../domain/exceptions/AuctionNotFoundException';
import {
  AuctionStatus,
  BidAmountTooLowError,
  BuyNowUnavailableError,
} from '../../../domain/entities/Auction';
import { IAuctionRepository } from '../../../domain/repositories/IAuctionRepository';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';
import {
  BidIdempotencyConflictError,
  BidVersionConflictError,
  PlaceBidUseCase,
} from '../../../application/use-cases/PlaceBidUseCase';
import { GetBidHistoryUseCase } from '../../../application/use-cases/GetBidHistoryUseCase';
import { UpdateAuctionUseCase } from '../../../application/use-cases/UpdateAuctionUseCase';
import { BuyNowUseCase } from '../../../application/use-cases/BuyNowUseCase';
import {
  AuctionCancellationConflict,
  AuctionCancellationForbidden,
  CancelAuctionUseCase,
} from '../../../application/use-cases/CancelAuctionUseCase';
import { AuctionCheckoutUseCase } from '../../../application/use-cases/AuctionCheckoutUseCase';
import { SettleAuctionUseCase } from '../../../application/use-cases/SettleAuctionUseCase';
import { getAuctionIO as getSocketServer } from '../../../infrastructure/websocket/socket';
import { emitAuctionEvent } from '../../../infrastructure/websocket/socket';
import { auctionRuntimeStore } from '../../../infrastructure/state/AuctionRuntimeStore';
import { HttpUserReputationClient } from '../../../infrastructure/clients/HttpUserReputationClient';

function sanitizeServerError(error: unknown, context: string): string {
  console.error(`[auction-service] ${context}:`, error);
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (
    !msg ||
    /prisma|invocation|database|column|relation|syntax error|[A-Za-z]:\\|\/src\//i.test(msg)
  ) {
    return 'Hệ thống đấu giá đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.';
  }
  return msg;
}

function canViewerAccessAuction(
  auctionId: string,
  sellerId: string,
  authUser?: { id: string; role: string },
): boolean {
  const meta = auctionRuntimeStore.getMeta(auctionId);
  if (!meta || meta.visibility === 'PUBLIC') return true;
  if (!authUser) return false;
  if (authUser.role === 'ADMIN' || authUser.role === 'SUPPORT_STAFF') return true;
  if (authUser.id === sellerId) return true;
  return Array.isArray(meta.invitedUserIds) && meta.invitedUserIds.includes(authUser.id);
}

export class AuctionController {
  private readonly reputationClient: HttpUserReputationClient;

  constructor(
    private readonly getAuctionDetailUseCase: GetAuctionDetailUseCase,
    private readonly createAuctionRoomUseCase: CreateAuctionRoomUseCase,
    private readonly placeBidUseCase: Pick<PlaceBidUseCase, 'execute'>,
    private readonly getBidHistoryUseCase: GetBidHistoryUseCase,
    private readonly updateAuctionUseCase: Pick<UpdateAuctionUseCase, 'execute'>,
    private readonly buyNowUseCase: Pick<BuyNowUseCase, 'execute'>,
    private readonly cancelAuctionUseCase: Pick<CancelAuctionUseCase, 'execute'>,
    private readonly auctionRepository: IAuctionRepository,
    private readonly auctionCheckoutUseCase?: AuctionCheckoutUseCase,
    private readonly settleAuctionUseCase?: Pick<SettleAuctionUseCase, 'execute'>,
    reputationClient?: HttpUserReputationClient,
  ) {
    this.reputationClient = reputationClient || new HttpUserReputationClient();
  }

  // Lấy danh sách các phiên đấu giá (hỗ trợ lọc status, sellerId, q, phân trang)
  public async getActive(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const isAdminOrStaff = authUser?.role === 'ADMIN' || authUser?.role === 'SUPPORT_STAFF';
      const isSeller = authUser?.role === 'SELLER';
      const { status, sellerId, q } = req.query;

      if (Array.isArray(sellerId) || Array.isArray(status) || Array.isArray(q)) {
        res.status(400).json({
          success: false,
          error: 'Tham số truy vấn không hợp lệ (không hỗ trợ mảng lặp lại).',
        });
        return;
      }

      const effectiveSellerId =
        typeof sellerId === 'string' && sellerId.trim()
          ? sellerId.trim()
          : isSeller && authUser?.id
            ? authUser.id
            : undefined;

      const rawStatus = typeof status === 'string' ? status.trim().toUpperCase() : undefined;
      const filterStatus = rawStatus && rawStatus !== 'ALL' ? rawStatus : undefined;

      const shouldFindAll = Boolean(status || effectiveSellerId || isAdminOrStaff || isSeller);
      let auctions = await this.auctionRepository.findAll({
        sellerId: effectiveSellerId,
      });

      const now = new Date();
      const nowIso = now.toISOString();

      await Promise.all(
        auctions.map(async (auction) => {
          if (auction.syncLifecycle(now)) {
            await this.auctionRepository.update(auction).catch(() => {});
          }
          if (this.auctionRepository.findBidsByAuctionId) {
            const bids = await this.auctionRepository
              .findBidsByAuctionId(auction.id)
              .catch(() => []);
            auction.setBidCount(bids.length || (auction.highestBidderId ? 1 : 0));
          }
        }),
      );

      // Lọc quyền truy cập phiên RESTRICTED
      auctions = auctions.filter((a) => canViewerAccessAuction(a.id, a.sellerId, authUser));

      if (filterStatus) {
        if (filterStatus === 'ACTIVE') {
          auctions = auctions.filter(
            (a) => a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.EXTENDED,
          );
        } else {
          auctions = auctions.filter((a) => a.status === filterStatus);
        }
      } else if (!shouldFindAll) {
        auctions = auctions.filter(
          (a) => a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.EXTENDED,
        );
      }

      if (q && typeof q === 'string' && q.trim()) {
        const queryTerm = q.trim().toLowerCase();
        auctions = auctions.filter(
          (a) =>
            a.id.toLowerCase().includes(queryTerm) ||
            a.productId.toLowerCase().includes(queryTerm) ||
            (a.title && a.title.toLowerCase().includes(queryTerm)) ||
            a.sellerId.toLowerCase().includes(queryTerm),
        );
      }

      const mappedList = await Promise.all(
        auctions.map(async (a) => {
          const meta = auctionRuntimeStore.ensureMeta(a.id, {
            endTime: a.endTime,
            startingPrice: a.startingPrice,
            bidIncrement: a.bidIncrement,
          });
          const rawSettlement =
            a.status === AuctionStatus.ENDED || a.status === AuctionStatus.SETTLED
              ? await hydrateAuctionSettlement(a, this.auctionRepository, now)
              : auctionRuntimeStore.getSettlement(a.id);
          const sellerName = await resolveUserFullName(a.sellerId);
          const canViewFullReason =
            isAdminOrStaff || (authUser?.role === 'SELLER' && authUser?.id === a.sellerId);
          const effectiveCancelReason = canViewFullReason
            ? a.cancelReason
            : meta.publicCancelReason ||
              (a.cancelReason ? 'Phiên đấu giá đã bị dừng hoặc hủy' : undefined);
          const settlement = rawSettlement
            ? {
                ...rawSettlement,
                winnerName: canViewFullReason ? (rawSettlement.winnerName ?? null) : null,
              }
            : undefined;
          const isClosed = a.status === AuctionStatus.ENDED || a.status === AuctionStatus.CANCELLED;
          const effectiveEndsAt = isClosed && a.actualEndTime ? a.actualEndTime : a.endTime;

          // Đối với client / frontend, phiên đã SETTLED tương ứng với trạng thái kết thúc (ENDED)
          const isSettled = (a.status as string) === 'SETTLED';
          const clientStatus = isSettled ? 'ENDED' : a.status;
          const effectiveEndTime =
            (isSettled || a.status === 'ENDED') && a.actualEndTime ? a.actualEndTime : a.endTime;

          return {
            id: a.id,
            productId: a.productId,
            sellerId: a.sellerId,
            sellerName: sellerName || undefined,
            title: a.title,
            startingPrice: a.startingPrice,
            currentHighestBid: a.currentHighestBid,
            highestBidAmount: a.highestBidAmount,
            nextMinBid: a.nextMinBid,
            bidCount: a.bidCount,
            highestBidderId: a.highestBidderId,
            bidIncrement: a.bidIncrement,
            buyNowPrice: a.buyNowPrice,
            imageUrl: a.imageUrl,
            status: clientStatus,
            visibility: meta.visibility,
            startTime: a.startTime,
            endTime: effectiveEndTime,
            originalEndTime: meta.originalEndTime,
            effectiveEndsAt,
            actualEndTime: a.actualEndTime,
            extensionCount: meta.extensionCount,
            maxExtensions: meta.maxExtensions,
            version: meta.version,
            serverTime: nowIso,
            demoMode: meta.demoMode,
            demoMultiplier: meta.demoMultiplier,
            settlement,
            cancelReason: effectiveCancelReason,
            cancelledBy: canViewFullReason ? a.cancelledBy : undefined,
            cancelledAt: canViewFullReason ? a.cancelledAt : undefined,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          };
        }),
      );

      res.status(200).json({
        success: true,
        serverTime: nowIso,
        total: mappedList.length,
        data: mappedList,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: sanitizeServerError(error, 'auction-endpoint') });
    }
  }

  /**
   * GET /api/v1/auctions/my
   * Danh sách "Phiên của tôi" cho Buyer: Đang tham gia / Cần thanh toán / Đã kết thúc (B3)
   */
  public async getMyAuctions(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser?.id) {
        res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.' });
        return;
      }

      const now = new Date();
      const all = await this.auctionRepository.findAll();
      const myItems: Array<Record<string, unknown>> = [];

      for (const auction of all) {
        if (auction.syncLifecycle(now)) {
          await this.auctionRepository.update(auction).catch(() => {});
        }
        if (!canViewerAccessAuction(auction.id, auction.sellerId, authUser)) {
          continue;
        }

        const bids = this.auctionRepository.findBidsByAuctionId
          ? await this.auctionRepository.findBidsByAuctionId(auction.id).catch(() => [])
          : [];
        auction.setBidCount(bids.length || (auction.highestBidderId ? 1 : 0));

        const myBids = bids.filter((b) => b.bidderId === authUser.id);
        const isLeader = auction.highestBidderId === authUser.id;
        if (myBids.length === 0 && !isLeader) continue;

        const myLastBid =
          myBids.length > 0 ? myBids[0].amount : isLeader ? auction.currentHighestBid : null;
        const meta = auctionRuntimeStore.ensureMeta(auction.id, {
          endTime: auction.endTime,
          startingPrice: auction.startingPrice,
          bidIncrement: auction.bidIncrement,
        });
        const settlement =
          auction.status === AuctionStatus.ENDED || auction.status === AuctionStatus.SETTLED
            ? await hydrateAuctionSettlement(auction, this.auctionRepository, now)
            : auctionRuntimeStore.getSettlement(auction.id);
        const sellerName = await resolveUserFullName(auction.sellerId);

        const isActive =
          auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.EXTENDED;
        const isWon =
          auction.status === AuctionStatus.ENDED &&
          (settlement?.winnerId ? settlement.winnerId === authUser.id : isLeader);
        const isPaid = settlement?.paymentStatus === 'PAID';
        const isTimeout = settlement?.paymentStatus === 'TIMEOUT';
        const needsPayment = isWon && !isPaid && !isTimeout;

        const group: 'PARTICIPATING' | 'NEEDS_PAYMENT' | 'ENDED' = isActive
          ? 'PARTICIPATING'
          : needsPayment
            ? 'NEEDS_PAYMENT'
            : 'ENDED';

        const personalStatus = isActive
          ? isLeader
            ? 'LEADING'
            : 'OUTBID'
          : auction.status === AuctionStatus.CANCELLED
            ? 'CANCELLED'
            : isWon
              ? isPaid
                ? 'PAID'
                : isTimeout
                  ? 'PAYMENT_TIMEOUT'
                  : 'WON_AWAITING_PAYMENT'
              : 'LOST';

        const winningBidAmount =
          settlement?.winningBidAmount ?? settlement?.finalPrice ?? auction.currentHighestBid;
        const effectiveMyLastBid = isWon
          ? Math.max(Number(myLastBid || 0), Number(winningBidAmount || 0))
          : myLastBid;

        myItems.push({
          id: auction.id,
          productId: auction.productId,
          sellerId: auction.sellerId,
          sellerName: sellerName || undefined,
          title: auction.title,
          imageUrl: auction.imageUrl || undefined,
          status: auction.status,
          group,
          personalStatus,
          startingPrice: auction.startingPrice,
          currentHighestBid: auction.currentHighestBid,
          highestBidAmount: auction.highestBidAmount,
          winningBidAmount: isWon ? winningBidAmount : undefined,
          nextMinBid: auction.nextMinBid,
          bidCount: auction.bidCount,
          myLastBid: effectiveMyLastBid,
          isLeading: isLeader,
          isWinner: isWon,
          winnerAlias: settlement?.winnerAlias ?? null,
          startTime: auction.startTime,
          endTime: auction.endTime,
          actualEndTime: auction.actualEndTime,
          demoMode: meta.demoMode,
          demoMultiplier: meta.demoMultiplier,
          paymentDueAt: settlement?.paymentDueAt ?? null,
          settledAt: settlement?.settledAt ?? null,
          orderId: settlement?.orderId ?? null,
          orderCode: settlement?.orderCode ?? null,
          paymentUrl: settlement?.paymentUrl ?? null,
          paymentStatus: settlement?.paymentStatus ?? 'NONE',
          canCheckout: needsPayment && !settlement?.orderId,
          cancelReason:
            meta.publicCancelReason || (auction.cancelReason ? 'Phiên đã bị hủy' : undefined),
        });
      }

      res.status(200).json({
        success: true,
        serverTime: now.toISOString(),
        data: {
          items: myItems,
          summary: {
            participating: myItems.filter((i) => i.group === 'PARTICIPATING').length,
            needsPayment: myItems.filter((i) => i.group === 'NEEDS_PAYMENT').length,
            ended: myItems.filter((i) => i.group === 'ENDED').length,
          },
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: sanitizeServerError(error, 'auction-endpoint') });
    }
  }

  public async getInternalSettlement(req: Request, res: Response): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId || '').trim();
      if (!auctionId) {
        res.status(400).json({ success: false, error: 'auctionId is required.' });
        return;
      }
      const auction = await this.auctionRepository.findById(auctionId);
      if (!auction) {
        res.status(404).json({ success: false, error: 'Auction not found.' });
        return;
      }
      auction.syncLifecycle(new Date());
      const dbSettlement = await this.auctionRepository.findSettlementByAuctionId?.(auction.id);
      const endAnchor = auction.actualEndTime || auction.endTime;
      const paymentDueAt = dbSettlement?.paymentDeadline
        ? dbSettlement.paymentDeadline.toISOString()
        : new Date(endAnchor.getTime() + 24 * 60 * 60 * 1000).toISOString();

      res.status(200).json({
        success: true,
        data: {
          auctionId: auction.id,
          status: auction.status,
          productId: auction.productId,
          productTitle: auction.title,
          sellerId: auction.sellerId,
          highestBidderId: auction.highestBidderId || null,
          winningAmount: auction.currentHighestBid,
          endTime: endAnchor.toISOString(),
          paymentDueAt,
          settlementStatus: dbSettlement?.status || 'PENDING_PAYMENT',
          orderId: dbSettlement?.orderId || null,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Unable to load authoritative auction settlement.',
      });
    }
  }

  public async getUserObligations(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const serviceAuth = (req as any).serviceAuth;
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : String(req.params.userId || '');
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required.' });
        return;
      }

      // Kiểm tra phạm vi đọc: chỉ scoped service (đã bind userId) hoặc chính chủ / Admin / Support
      if (!serviceAuth) {
        if (
          !authUser ||
          (authUser.id !== userId && authUser.role !== 'ADMIN' && authUser.role !== 'SUPPORT_STAFF')
        ) {
          res.status(403).json({
            success: false,
            error: 'Bạn không có quyền xem nghĩa vụ đấu giá của tài khoản khác.',
          });
          return;
        }
      }

      const activeAuctions = await this.auctionRepository.findActiveAuctions();
      const obligations: Array<{
        auctionId: string;
        title?: string;
        bidderId: string;
        type: 'LEADING_ACTIVE_AUCTION' | 'PARTICIPATING_ACTIVE_AUCTION' | 'UNSETTLED_WON_AUCTION';
      }> = [];

      for (const auction of activeAuctions) {
        if (auction.highestBidderId === userId) {
          obligations.push({
            auctionId: auction.id,
            title: auction.title || `Phiên đấu giá #${auction.id}`,
            bidderId: userId,
            type: 'LEADING_ACTIVE_AUCTION',
          });
          continue;
        }

        const bids = this.auctionRepository.findBidsByAuctionId
          ? await this.auctionRepository.findBidsByAuctionId(auction.id)
          : [];
        const participated = bids.some((b) => b.bidderId === userId);
        if (participated) {
          obligations.push({
            auctionId: auction.id,
            title: auction.title || `Phiên đấu giá #${auction.id}`,
            bidderId: userId,
            type: 'PARTICIPATING_ACTIVE_AUCTION',
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          userId,
          obligations,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: sanitizeServerError(error, 'getUserObligations'),
      });
    }
  }

  public async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const auctionId = req.params.id as string;
      const auction = await this.auctionRepository.findById(auctionId);
      if (!auction) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy phiên đấu giá "${auctionId}".` });
        return;
      }
      if (!canViewerAccessAuction(auction.id, auction.sellerId, authUser)) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy phiên đấu giá "${auctionId}".` });
        return;
      }

      const canViewInternal =
        authUser?.role === 'ADMIN' ||
        authUser?.role === 'SUPPORT_STAFF' ||
        authUser?.id === auction.sellerId;

      const events = auctionRuntimeStore.getTimeline(auctionId).map((ev) =>
        canViewInternal
          ? ev
          : {
              id: ev.id,
              auctionId: ev.auctionId,
              type: ev.type,
              occurredAt: ev.occurredAt,
              summary: ev.summary,
              publicReason: ev.publicReason,
            },
      );

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: sanitizeServerError(error, 'auction-endpoint') });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const isAdminOrStaff = authUser?.role === 'ADMIN' || authUser?.role === 'SUPPORT_STAFF';
      const auctionId = req.params.id as string;
      const auction = await this.getAuctionDetailUseCase.execute(auctionId);

      if (!canViewerAccessAuction(auction.id, auction.sellerId, authUser)) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy phiên đấu giá "${auctionId}".`,
        });
        return;
      }

      const canViewFullReason =
        isAdminOrStaff || (authUser?.role === 'SELLER' && authUser?.id === auction.sellerId);
      const effectiveCancelReason = canViewFullReason
        ? auction.cancelReason
        : auction.publicCancelReason ||
          (auction.cancelReason ? 'Phiên đấu giá đã bị dừng hoặc hủy' : undefined);

      // Che định danh bidder với Buyer/khách (dùng "Bạn" cho chính người xem, Admin thấy đầy đủ)
      const sanitizedBids = auction.bids.map((b) => ({
        ...b,
        isMine: Boolean(authUser?.id && b.bidder === authUser.id),
        displayAlias:
          authUser?.id && b.bidder === authUser.id
            ? 'Bạn'
            : canViewFullReason
              ? b.bidder
              : b.displayAlias || maskBidderAlias(b.bidder),
        bidder:
          canViewFullReason || (authUser?.id && b.bidder === authUser.id)
            ? b.bidder
            : b.displayAlias,
      }));

      const myBids = authUser?.id ? auction.bids.filter((b) => b.bidder === authUser.id) : [];
      const isOwner = Boolean(authUser?.id && authUser.id === auction.sellerId);
      const isLeading = Boolean(authUser?.id && auction.highestBidderId === authUser.id);
      const isOpen =
        auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.EXTENDED;

      let cannotBidReason: string | null = null;
      if (!isOpen) {
        cannotBidReason =
          auction.status === AuctionStatus.SCHEDULED
            ? 'Phiên chưa đến giờ bắt đầu.'
            : auction.status === AuctionStatus.CANCELLED
              ? 'Phiên đã bị hủy.'
              : 'Phiên đấu giá đã kết thúc.';
      } else if (!authUser) {
        cannotBidReason = 'Đăng nhập bằng tài khoản Buyer để tham gia đặt giá.';
      } else if (authUser.role !== 'BUYER') {
        cannotBidReason = 'Chỉ tài khoản Buyer mới có quyền đặt giá.';
      } else if (isOwner) {
        cannotBidReason = 'Bạn không thể tự đặt giá cho sản phẩm của chính mình.';
      }

      const canBid = Boolean(isOpen && authUser?.role === 'BUYER' && !isOwner);
      const canBuyNow = Boolean(
        canBid && auction.buyNowPrice && auction.buyNowPrice > 0 && auction.bidCount === 0,
      );
      const canCheckout = Boolean(
        auction.status === AuctionStatus.ENDED &&
        isLeading &&
        auction.settlement?.paymentStatus !== 'PAID' &&
        auction.settlement?.paymentStatus !== 'TIMEOUT',
      );

      const sellerName = await resolveUserFullName(auction.sellerId);
      const sanitizedSettlement = auction.settlement
        ? {
            ...auction.settlement,
            winnerName:
              canViewFullReason || isLeading ? (auction.settlement.winnerName ?? null) : null,
          }
        : undefined;

      res.status(200).json({
        success: true,
        data: {
          ...auction,
          sellerName: sellerName || undefined,
          settlement: sanitizedSettlement,
          bids: sanitizedBids,
          cancelReason: effectiveCancelReason,
          internalCancelNote: canViewFullReason ? auction.internalCancelNote : undefined,
          cancelledBy: canViewFullReason ? auction.cancelledBy : undefined,
          cancelledAt: canViewFullReason ? auction.cancelledAt : undefined,
          timeline: canViewFullReason
            ? auction.timeline
            : (auction.timeline || []).map((t) => ({
                id: t.id,
                type: t.type,
                occurredAt: t.occurredAt,
                summary: t.summary,
                publicReason: t.publicReason,
              })),
          viewerState: {
            isOwner,
            isLeading,
            canBid,
            cannotBidReason,
            canBuyNow,
            canCheckout,
            myLastBid: myBids[0]?.amount ?? null,
          },
        },
      });
    } catch (error) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Lỗi máy chủ nội bộ.',
      });
    }
  }

  // Tạo mới phòng đấu giá (dành cho Seller và Admin)
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const {
        productId,
        sellerId,
        title,
        startPrice,
        bidStep,
        buyNowPrice,
        imageUrl,
        startTime,
        endTime,
        antiSnipingExtensionSeconds,
        antiSnipingExtendSeconds,
        maxExtensions,
        visibility,
        invitedUserIds,
        demoMode,
        demoMultiplier,
      } = req.body;

      if (!productId) {
        res.status(400).json({ success: false, error: 'Mã sản phẩm (productId) là bắt buộc.' });
        return;
      }
      if (startPrice === undefined || startPrice === null) {
        res.status(400).json({ success: false, error: 'Giá khởi điểm (startPrice) là bắt buộc.' });
        return;
      }
      if (!startTime || !endTime) {
        res
          .status(400)
          .json({ success: false, error: 'Thời gian bắt đầu và kết thúc là bắt buộc.' });
        return;
      }

      const isAdmin = authUser?.role === 'ADMIN';
      const effectiveSellerId =
        isAdmin && sellerId
          ? String(sellerId).trim()
          : authUser?.id || sellerId || 'usr_seller_default';

      const auction = await this.createAuctionRoomUseCase.execute({
        productId: String(productId),
        sellerId: effectiveSellerId,
        title,
        startPrice: Number(startPrice),
        bidStep: bidStep !== undefined && bidStep !== '' ? Number(bidStep) : undefined,
        buyNowPrice:
          buyNowPrice !== undefined && buyNowPrice !== null && buyNowPrice !== ''
            ? Number(buyNowPrice)
            : undefined,
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : undefined,
        startTime,
        endTime,
        antiSnipingExtensionSeconds:
          antiSnipingExtensionSeconds !== undefined
            ? Number(antiSnipingExtensionSeconds)
            : undefined,
        antiSnipingExtendSeconds:
          antiSnipingExtendSeconds !== undefined ? Number(antiSnipingExtendSeconds) : undefined,
        maxExtensions: maxExtensions !== undefined ? Number(maxExtensions) : undefined,
        visibility: visibility === 'RESTRICTED' ? 'RESTRICTED' : 'PUBLIC',
        invitedUserIds: Array.isArray(invitedUserIds) ? invitedUserIds.map(String) : undefined,
        demoMode: typeof demoMode === 'boolean' ? demoMode : undefined,
        demoMultiplier: demoMultiplier !== undefined ? Number(demoMultiplier) : undefined,
        createdByAdminId: isAdmin && effectiveSellerId !== authUser?.id ? authUser?.id : undefined,
      });

      const meta = auctionRuntimeStore.getMeta(auction.id);

      emitAuctionEvent(
        'auction:created',
        {
          auctionId: auction.id,
          status: auction.status,
          currentHighestBid: auction.currentHighestBid,
          highestBidAmount: auction.highestBidAmount,
          nextMinBid: auction.nextMinBid,
          endTime: auction.endTime,
          version: meta?.version ?? 1,
        },
        auction.id,
      );

      res.status(201).json({
        success: true,
        message: 'Tạo phòng đấu giá thành công.',
        data: {
          id: auction.id,
          productId: auction.productId,
          sellerId: auction.sellerId,
          title: auction.title,
          startingPrice: auction.startingPrice,
          currentHighestBid: auction.currentHighestBid,
          highestBidAmount: auction.highestBidAmount,
          nextMinBid: auction.nextMinBid,
          bidIncrement: auction.bidIncrement,
          buyNowPrice: auction.buyNowPrice,
          imageUrl: auction.imageUrl,
          status: auction.status,
          visibility: meta?.visibility ?? 'PUBLIC',
          demoMode: meta?.demoMode ?? false,
          demoMultiplier: meta?.demoMultiplier ?? 1,
          createdByAdminId: meta?.createdByAdminId,
          startTime: auction.startTime,
          endTime: auction.endTime,
          createdAt: auction.createdAt,
        },
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Dữ liệu yêu cầu không hợp lệ.' });
    }
  }

  // Đặt giá cho phiên đấu giá (G01-G04: xác thực bắt buộc, kiểm tra uy tín >= 40, idempotency, lượt đầu = startPrice)
  public async placeBid(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser?.id) {
        res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để tham gia trả giá.' });
        return;
      }
      if (authUser.role !== 'BUYER') {
        res.status(403).json({
          success: false,
          code: 'AUCTION_BID_FORBIDDEN_ROLE',
          error: 'Chỉ tài khoản BUYER mới có quyền đặt giá đấu giá (AUCTION.BID).',
        });
        return;
      }

      const auctionId = req.params.id as string;
      const existingAuction = await this.auctionRepository.findById(auctionId);
      if (
        !existingAuction ||
        !canViewerAccessAuction(auctionId, existingAuction.sellerId, authUser)
      ) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy phiên đấu giá "${auctionId}".`,
        });
        return;
      }

      // Kiểm tra uy tín >= 40 theo Mục 13 (chặn trước khi đặt giá)
      const repCheck = await this.reputationClient.checkBuyerEligibility(
        authUser.id,
        req.headers.authorization,
      );
      if (!repCheck.available) {
        res.status(503).json({
          success: false,
          code: 'REPUTATION_SERVICE_UNAVAILABLE',
          error: repCheck.reason || 'Không thể xác minh uy tín ngay lúc này. Vui lòng thử lại.',
        });
        return;
      }
      if (!repCheck.canBid) {
        res.status(403).json({
          success: false,
          code: 'REPUTATION_BELOW_THRESHOLD',
          reputationScore: repCheck.reputationScore,
          error:
            repCheck.reason ||
            `Uy tín ${repCheck.reputationScore}/100 chưa đạt ngưỡng tối thiểu 50 để đặt giá.`,
        });
        return;
      }

      const rawAmount = req.body?.bidAmount ?? req.body?.amount;
      if (rawAmount === undefined || rawAmount === null || isNaN(Number(rawAmount))) {
        res
          .status(422)
          .json({ success: false, error: 'Số tiền đặt giá (bidAmount) không hợp lệ.' });
        return;
      }

      const idempotencyKey =
        (typeof req.headers['idempotency-key'] === 'string'
          ? req.headers['idempotency-key']
          : undefined) ||
        (typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined);
      const expectedVersion =
        req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;

      const result = await this.placeBidUseCase.execute({
        auctionId,
        bidderId: authUser.id,
        bidAmount: Number(rawAmount),
        idempotencyKey,
        expectedVersion: Number.isFinite(expectedVersion) ? expectedVersion : undefined,
      });

      if (!result.idempotentReplay) {
        emitAuctionEvent(
          'auction:bid_placed',
          {
            auctionId,
            bidId: result.bidId,
            bidderId: authUser.id,
            displayAlias: maskBidderAlias(authUser.id),
            currentHighestBid: result.currentHighestBid,
            highestBidAmount: result.highestBidAmount,
            nextMinBid: result.nextMinBid,
            bidCount: result.bidCount,
            status: result.status,
            endTime: result.endTime,
            isExtended: result.isExtended,
            extensionCount: result.extensionCount,
            version: result.version,
            serverTime: result.serverTime,
          },
          auctionId,
        );

        // Phát sự kiện bị vượt giá cho đúng người dẫn trước đó (không gửi cho chính mình)
        if (result.previousLeaderId && result.previousLeaderId !== authUser.id) {
          emitAuctionEvent(
            'auction:outbid',
            {
              auctionId,
              outbidUserId: result.previousLeaderId,
              newHighestBid: result.currentHighestBid,
              nextMinBid: result.nextMinBid,
              serverTime: result.serverTime,
            },
            auctionId,
          );
        }
      }

      res.status(200).json({
        success: true,
        message: result.isExtended
          ? 'Đã ghi nhận mức giá! Phiên được tự động gia hạn thêm 5 phút.'
          : `Đã ghi nhận ${result.amount.toLocaleString('vi-VN')} ₫.`,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof BidIdempotencyConflictError) {
        res.status(409).json({ success: false, code: error.code, error: error.message });
        return;
      }
      if (error instanceof BidVersionConflictError || error instanceof BidAmountTooLowError) {
        const meta = auctionRuntimeStore.getMeta(req.params.id as string);
        res.status(409).json({
          success: false,
          code: error.code,
          error: error.message,
          data: {
            nextMinBid: error.nextMinBid,
            highestBidAmount: error.currentHighestBid,
            version:
              error instanceof BidVersionConflictError ? error.version : (meta?.version ?? 1),
            serverTime: new Date().toISOString(),
          },
        });
        return;
      }
      res.status(400).json({ success: false, error: error.message || 'Không thể đặt giá.' });
    }
  }

  // Mua thẳng (Buy It Now) kết thúc phiên ngay lập tức (Mục 11: chỉ trước lượt đầu, kiểm tra uy tín >= 40)
  public async buyNow(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser?.id) {
        res
          .status(401)
          .json({ success: false, error: 'Vui lòng đăng nhập để thực hiện mua ngay.' });
        return;
      }
      if (authUser.role !== 'BUYER') {
        res.status(403).json({
          success: false,
          code: 'AUCTION_BUY_NOW_FORBIDDEN_ROLE',
          error: 'Chỉ tài khoản BUYER mới có quyền Mua ngay trong phiên đấu giá.',
        });
        return;
      }

      const repCheck = await this.reputationClient.checkBuyerEligibility(
        authUser.id,
        req.headers.authorization,
      );
      if (!repCheck.available) {
        res.status(503).json({
          success: false,
          code: 'REPUTATION_SERVICE_UNAVAILABLE',
          error: repCheck.reason || 'Không thể xác minh uy tín lúc này.',
        });
        return;
      }
      if (!repCheck.canBid) {
        res.status(403).json({
          success: false,
          code: 'REPUTATION_BELOW_THRESHOLD',
          reputationScore: repCheck.reputationScore,
          error: repCheck.reason || 'Uy tín chưa đạt tối thiểu 50 điểm để mua ngay trong phiên.',
        });
        return;
      }

      const auctionId = req.params.id as string;
      const result = await this.buyNowUseCase.execute({
        auctionId,
        buyerId: authUser.id,
      });

      emitAuctionEvent(
        'auction:buy_now',
        {
          auctionId,
          winnerId: result.winnerId,
          purchasePrice: result.purchasePrice,
          status: result.status,
          paymentDueAt: result.paymentDueAt,
          version: result.version,
        },
        auctionId,
      );

      res.status(200).json({
        success: true,
        message:
          'Mua ngay thành công! Phiên đã kết thúc, bạn có thể mở đơn trúng đấu giá để thanh toán.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof BuyNowUnavailableError) {
        res.status(409).json({ success: false, code: error.code, error: error.message });
        return;
      }
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể thực hiện mua ngay.' });
    }
  }

  public async cancel(req: Request, res: Response): Promise<void> {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.' });
      return;
    }

    if (!['ADMIN', 'SELLER', 'SUPPORT_STAFF'].includes(authUser.role)) {
      res.status(403).json({
        success: false,
        code: 'AUCTION_CANCEL_FORBIDDEN',
        error: 'Chỉ Quản trị viên hoặc Người bán sở hữu phiên mới có quyền hủy phiên đấu giá.',
      });
      return;
    }

    const rawReason = req.body?.reason;
    const rawPublicReason = req.body?.publicReason;
    const rawInternalNote = req.body?.internalNote;
    const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
    const isAdmin = authUser.role === 'ADMIN' || authUser.role === 'SUPPORT_STAFF';
    const defaultReason = isAdmin
      ? 'Hủy theo quyết định của quản trị viên'
      : 'Hủy theo yêu cầu của người bán';

    if (
      (rawReason != null && typeof rawReason !== 'string') ||
      reason.length > 500 ||
      (!reason && req.method !== 'DELETE')
    ) {
      res.status(400).json({
        success: false,
        error: 'Lý do hủy phải là chuỗi từ 1 đến 500 ký tự.',
      });
      return;
    }

    try {
      const result = await this.cancelAuctionUseCase.execute({
        auctionId: req.params.id as string,
        sellerId: authUser.id,
        isAdmin,
        cancelledBy: authUser.id,
        cancelledRole: authUser.role,
        reason: reason || defaultReason,
        publicReason: typeof rawPublicReason === 'string' ? rawPublicReason : undefined,
        internalNote: typeof rawInternalNote === 'string' ? rawInternalNote : undefined,
      });
      emitAuctionEvent(
        'auction:cancelled',
        {
          auctionId: result.auctionId,
          status: result.status,
          publicReason: result.publicReason,
          cancelledAt: result.cancelledAt,
        },
        result.auctionId,
      );
      res.status(200).json({ success: true, message: result.message, data: result });
    } catch (error) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
      } else if (error instanceof AuctionCancellationForbidden) {
        res.status(403).json({ success: false, error: error.message });
      } else if (error instanceof AuctionCancellationConflict) {
        res.status(409).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: 'Không thể lưu trạng thái hủy phiên đấu giá.' });
      }
    }
  }

  // Lấy lịch sử các lượt đặt giá của phiên (kiểm tra visibility & che danh tính)
  public async getBidHistory(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const auctionId = req.params.id as string;
      const auction = await this.auctionRepository.findById(auctionId);
      if (!auction || !canViewerAccessAuction(auction.id, auction.sellerId, authUser)) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy phiên đấu giá "${auctionId}".` });
        return;
      }

      const history = await this.getBidHistoryUseCase.execute(auctionId);
      const canViewIdentity =
        authUser?.role === 'ADMIN' ||
        authUser?.role === 'SUPPORT_STAFF' ||
        authUser?.id === auction.sellerId;

      const items = history.map((b, idx) => ({
        id: b.id || `bid_${idx}`,
        seq: history.length - idx,
        bidderId:
          canViewIdentity || (authUser?.id && b.bidderId === authUser.id)
            ? b.bidderId
            : maskBidderAlias(b.bidderId),
        displayAlias:
          authUser?.id && b.bidderId === authUser.id
            ? 'Bạn'
            : canViewIdentity
              ? b.bidderId
              : maskBidderAlias(b.bidderId),
        isMine: Boolean(authUser?.id && b.bidderId === authUser.id),
        amount: b.bidAmount,
        bidAmount: b.bidAmount,
        bidTime: b.bidTime,
        acceptedAt: new Date(b.bidTime).toISOString(),
        isWinning: b.isWinning,
      }));

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: error.message || 'Lỗi máy chủ nội bộ.' });
    }
  }

  // Chỉnh sửa thông tin phòng đấu giá (chỉ khi phiên chưa bắt đầu - SCHEDULED)
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const auctionId = req.params.id as string;
      const { title, bidIncrement, buyNowPrice, startTime, endTime, imageUrl, expectedVersion } =
        req.body;

      const sellerId = authUser?.id || 'usr_seller_default';
      const isAdmin = authUser?.role === 'ADMIN';

      const updatedAuction = await this.updateAuctionUseCase.execute({
        auctionId,
        sellerId,
        isAdmin,
        title,
        bidIncrement: bidIncrement ? Number(bidIncrement) : undefined,
        buyNowPrice: buyNowPrice !== undefined ? Number(buyNowPrice) : undefined,
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        expectedVersion: expectedVersion !== undefined ? Number(expectedVersion) : undefined,
      });

      const meta = auctionRuntimeStore.getMeta(updatedAuction.id);

      emitAuctionEvent(
        'auction:updated',
        {
          auctionId: updatedAuction.id,
          status: updatedAuction.status,
          endTime: updatedAuction.endTime,
          version: meta?.version ?? 1,
        },
        updatedAuction.id,
      );

      res.status(200).json({
        success: true,
        message: 'Cập nhật phòng đấu giá thành công.',
        data: {
          id: updatedAuction.id,
          title: updatedAuction.title,
          currentHighestBid: updatedAuction.currentHighestBid,
          bidIncrement: updatedAuction.bidIncrement,
          buyNowPrice: updatedAuction.buyNowPrice,
          imageUrl: updatedAuction.imageUrl,
          status: updatedAuction.status,
          startTime: updatedAuction.startTime,
          endTime: updatedAuction.endTime,
          version: meta?.version ?? 1,
          updatedAt: updatedAuction.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể chỉnh sửa phiên đấu giá.' });
    }
  }

  // Chốt đơn thanh toán cho người thắng đấu giá (khóa 1 đơn/phiên, idempotent)
  public async checkout(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser || !authUser.id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Bạn cần đăng nhập để chốt đơn thanh toán.',
        });
        return;
      }

      if (!this.auctionCheckoutUseCase) {
        res.status(500).json({
          success: false,
          error: 'AuctionCheckoutUseCase is not configured.',
        });
        return;
      }

      const auctionId = req.params.id as string;
      const { shippingAddress } = req.body;
      const authHeader = req.headers.authorization;

      const result = await this.auctionCheckoutUseCase.execute({
        auctionId,
        buyerId: authUser.id,
        buyerToken: authHeader,
        shippingAddress,
      });

      res.status(200).json({
        success: true,
        message: 'Đã tạo đơn trúng đấu giá. Vui lòng hoàn tất thanh toán trong 24 giờ.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error?.message?.startsWith('FORBIDDEN')) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể chốt đơn thanh toán đấu giá.',
      });
    }
  }

  // Chốt phiên đấu giá khi có người thắng và phát event sang RabbitMQ (TASK-AUC-01)
  public async settle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.settleAuctionUseCase) {
        res.status(500).json({ success: false, error: 'SettleAuctionUseCase is not configured.' });
        return;
      }
      const auctionId = req.params.id as string;
      const authUser = (req as AuthenticatedRequest).user;

      const result = await this.settleAuctionUseCase.execute({
        auctionId,
        triggeredBy: authUser?.id,
      });

      // Bắn sự kiện Realtime xuống client để màn hình phòng đấu giá cập nhật kết quả kết thúc ngay lập tức
      const io = getSocketServer();
      if (io) {
        io.to(`auction:${auctionId}`).emit('auction:bid_placed', {
          auctionId,
          currentHighestBid: result.finalPrice,
          status: 'ENDED',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(200).json({
        success: true,
        message:
          'Chốt phiên đấu giá thành công! Đã gửi thông tin đơn hàng tới hệ thống thanh toán.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể chốt phiên đấu giá.',
      });
    }
  }
}
