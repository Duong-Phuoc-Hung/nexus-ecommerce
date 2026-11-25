import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus, BidAmountTooLowError } from '../../domain/entities/Auction';
import { auctionRuntimeStore } from '../../infrastructure/state/AuctionRuntimeStore';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';

export class BidIdempotencyConflictError extends Error {
  public readonly code = 'IDEMPOTENCY_CONFLICT';
  constructor(message = 'Khóa yêu cầu (Idempotency-Key) đã được dùng với mức giá khác.') {
    super(message);
    this.name = 'BidIdempotencyConflictError';
  }
}

export class BidVersionConflictError extends Error {
  public readonly code = 'PRICE_OR_VERSION_CHANGED';
  constructor(
    public readonly nextMinBid: number,
    public readonly currentHighestBid: number | null,
    public readonly version: number,
    message?: string,
  ) {
    super(
      message ||
        `Phiên đã có lượt mới. Mức tối thiểu hiện là ${nextMinBid.toLocaleString('vi-VN')} ₫.`,
    );
    this.name = 'BidVersionConflictError';
  }
}

export interface PlaceBidInput {
  auctionId: string;
  bidderId: string;
  bidAmount: number;
  idempotencyKey?: string;
  expectedVersion?: number;
}

export interface PlaceBidResult {
  bidId: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  currentHighestBid: number;
  highestBidAmount: number;
  nextMinBid: number;
  bidCount: number;
  status: string;
  endTime: Date;
  isExtended: boolean;
  extensionCount: number;
  maxExtensions: number;
  previousLeaderId?: string;
  version: number;
  acceptedAt: string;
  serverTime: string;
  idempotentReplay?: boolean;
}

export class PlaceBidUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(input: PlaceBidInput): Promise<PlaceBidResult> {
    const { auctionId, bidderId, bidAmount, idempotencyKey, expectedVersion } = input;

    // 1. Chống xử lý lặp theo Idempotency-Key (G04)
    const cleanKey = idempotencyKey?.trim();
    if (cleanKey) {
      const cached = auctionRuntimeStore.getBidIdempotency(auctionId, bidderId, cleanKey);
      if (cached) {
        if (cached.amount !== bidAmount) {
          throw new BidIdempotencyConflictError();
        }
        return {
          ...(cached.result as PlaceBidResult),
          idempotentReplay: true,
        };
      }
    }

    // 2. Kiểm tra phòng đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 3. Đồng bộ metadata runtime & số lượt thực từ DB để nhận biết chính xác phiên chưa có lượt (G03)
    const meta = auctionRuntimeStore.ensureMeta(auctionId, {
      endTime: auction.endTime,
      startingPrice: auction.startingPrice,
      bidIncrement: auction.bidIncrement,
    });
    auction.setExtensionCount(meta.extensionCount);

    const existingBids = this.auctionRepository.findBidsByAuctionId
      ? await this.auctionRepository.findBidsByAuctionId(auctionId)
      : [];
    auction.setBidCount(existingBids.length || (auction.highestBidderId ? 1 : 0));

    // 4. Chống tự bid: Người bán không được tự trả giá cho món hàng của chính mình
    if (auction.sellerId === bidderId) {
      throw new Error('Người bán không được phép tự đặt giá cho sản phẩm của chính mình.');
    }

    // 5. Đồng bộ trạng thái hiệu lực theo giờ hiện tại
    const now = new Date();
    auction.syncLifecycle(now);

    // 6. Kiểm tra trạng thái: Phải đang ACTIVE hoặc EXTENDED
    if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.EXTENDED) {
      throw new Error(
        `Phiên đấu giá #${auctionId} hiện không mở để đặt giá (Trạng thái: ${auction.status}).`,
      );
    }

    // 7. Kiểm tra thời gian: Không được bid khi đã quá giờ kết thúc
    if (now.getTime() >= auction.endTime.getTime()) {
      throw new Error(`Phiên đấu giá #${auctionId} đã hết thời gian đặt giá.`);
    }

    // 8. Kiểm tra số nguyên VND dương hợp lệ trước
    if (!Number.isSafeInteger(bidAmount) || bidAmount <= 0) {
      throw new Error('Số tiền đặt giá phải là số nguyên VND dương hợp lệ.');
    }

    // 9. Kiểm tra mức tối thiểu (G03: lượt đầu >= startPrice; lượt sau >= highest + bidIncrement)
    const minRequiredBid = auction.nextMinBid;
    if (bidAmount < minRequiredBid) {
      if (expectedVersion !== undefined && expectedVersion < meta.version) {
        throw new BidVersionConflictError(minRequiredBid, auction.highestBidAmount, meta.version);
      }
      throw new BidAmountTooLowError(minRequiredBid, auction.highestBidAmount);
    }

    // 10. Thực thi nghiệp vụ Đặt giá và Anti-sniping trong Domain Entity
    const outcome = auction.placeBid(bidderId, bidAmount, now);

    // 11. Cập nhật phòng đấu giá trong cơ sở dữ liệu
    await this.auctionRepository.update(auction);

    // 12. Lưu lịch sử lượt trả giá vào bảng auction_bids
    const bidId = generateUuidV7();
    if (this.auctionRepository.saveBid) {
      await this.auctionRepository.saveBid({
        id: bidId,
        auctionId,
        bidderId,
        amount: bidAmount,
        bidTime: now,
        isWinning: true,
      });
    }

    // 13. Cập nhật runtime version, extensionCount & audit timeline
    const nextVersion = auctionRuntimeStore.bumpVersion(auctionId);
    if (outcome.isExtended) {
      auctionRuntimeStore.updateMeta(auctionId, {
        extensionCount: outcome.extensionCount,
      });
      auctionRuntimeStore.appendTimeline(auctionId, {
        type: 'EXTENDED',
        actorId: bidderId,
        actorRole: 'BUYER',
        summary: `Phiên tự động gia hạn lần ${outcome.extensionCount}/${auction.maxExtensions} thêm 5 phút do lượt đặt sát giờ.`,
        occurredAt: now.toISOString(),
        metadata: {
          bidId,
          oldEndTime: outcome.oldEndTime.toISOString(),
          newEndTime: outcome.newEndTime.toISOString(),
          extensionCount: outcome.extensionCount,
        },
      });
    }

    const result: PlaceBidResult = {
      bidId,
      auctionId: auction.id,
      bidderId,
      amount: bidAmount,
      currentHighestBid: auction.currentHighestBid,
      highestBidAmount: auction.currentHighestBid,
      nextMinBid: auction.nextMinBid,
      bidCount: auction.bidCount,
      status: auction.status,
      endTime: auction.endTime,
      isExtended: outcome.isExtended,
      extensionCount: outcome.extensionCount,
      maxExtensions: auction.maxExtensions,
      previousLeaderId: outcome.previousLeaderId,
      version: nextVersion,
      acceptedAt: now.toISOString(),
      serverTime: now.toISOString(),
    };

    if (cleanKey) {
      auctionRuntimeStore.saveBidIdempotency({
        key: cleanKey,
        auctionId,
        bidderId,
        amount: bidAmount,
        result,
        createdAt: now.getTime(),
      });
    }

    return result;
  }
}
