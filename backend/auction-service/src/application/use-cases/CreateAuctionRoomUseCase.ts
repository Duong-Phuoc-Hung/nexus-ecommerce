import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import {
  Auction,
  AuctionStatus,
  MAX_AUCTION_AMOUNT_VND,
  MAX_AUCTION_DURATION_MS,
  MIN_AUCTION_DURATION_MS,
  START_TIME_PAST_GRACE_MS,
} from '../../domain/entities/Auction';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';
import {
  auctionRuntimeStore,
  AuctionVisibility,
} from '../../infrastructure/state/AuctionRuntimeStore';

export const MAX_ACTIVE_AUCTIONS_PER_SELLER = 5;

// DTO DÙNG RIÊNG: Định nghĩa ngay trên đầu file Use Case
export interface CreateAuctionRoomInput {
  productId: string;
  sellerId: string;
  title?: string;
  imageUrl?: string;
  startPrice: number;
  bidStep?: number;
  buyNowPrice?: number;
  startTime: string | Date;
  endTime: string | Date;
  antiSnipingExtensionSeconds?: number;
  antiSnipingExtendSeconds?: number;
  maxExtensions?: number;
  visibility?: AuctionVisibility;
  invitedUserIds?: string[];
  demoMode?: boolean;
  demoMultiplier?: number;
  createdByAdminId?: string;
}

export class CreateAuctionRoomUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  // Thực thi tạo mới phòng đấu giá và lưu trữ vào cơ sở dữ liệu
  public async execute(input: CreateAuctionRoomInput): Promise<Auction> {
    const productId = String(input.productId ?? '').trim();
    if (!productId) {
      throw new Error('Mã sản phẩm (productId) là bắt buộc.');
    }

    const startPrice = Number(input.startPrice);
    if (!Number.isFinite(startPrice) || startPrice <= 0) {
      throw new Error('Giá khởi điểm (startPrice) phải lớn hơn 0.');
    }
    if (!Number.isSafeInteger(startPrice) || startPrice > MAX_AUCTION_AMOUNT_VND) {
      throw new Error('Giá khởi điểm phải là số nguyên VND hợp lệ, tối đa 1.000 tỷ VND.');
    }

    const bidStep =
      input.bidStep !== undefined && input.bidStep !== null ? Number(input.bidStep) : 10000;
    if (!Number.isFinite(bidStep) || bidStep <= 0) {
      throw new Error('Bước giá (bidStep) phải lớn hơn 0.');
    }
    if (!Number.isSafeInteger(bidStep) || bidStep > MAX_AUCTION_AMOUNT_VND) {
      throw new Error('Bước giá phải là số nguyên VND hợp lệ, tối đa 1.000 tỷ VND.');
    }

    const buyNowPrice =
      input.buyNowPrice !== undefined &&
      input.buyNowPrice !== null &&
      String(input.buyNowPrice) !== ''
        ? Number(input.buyNowPrice)
        : undefined;
    if (buyNowPrice !== undefined) {
      if (!Number.isFinite(buyNowPrice) || buyNowPrice <= startPrice) {
        throw new Error('Giá mua ngay (buyNowPrice) phải lớn hơn giá khởi điểm.');
      }
      if (!Number.isSafeInteger(buyNowPrice) || buyNowPrice > MAX_AUCTION_AMOUNT_VND) {
        throw new Error('Giá mua ngay phải là số nguyên VND hợp lệ, tối đa 1.000 tỷ VND.');
      }
    }

    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error('Thời gian bắt đầu hoặc kết thúc không đúng định dạng hợp lệ.');
    }

    if (startTime >= endTime) {
      throw new Error('Thời gian bắt đầu (startTime) phải trước thời gian kết thúc (endTime).');
    }

    const now = new Date();
    if (startTime.getTime() < now.getTime() - START_TIME_PAST_GRACE_MS) {
      throw new Error('Thời gian bắt đầu phiên đấu giá (startTime) không thể nằm trong quá khứ.');
    }

    if (endTime.getTime() <= now.getTime()) {
      throw new Error('Thời gian kết thúc phiên đấu giá phải ở tương lai.');
    }

    const durationMs = endTime.getTime() - startTime.getTime();
    if (durationMs < MIN_AUCTION_DURATION_MS || durationMs > MAX_AUCTION_DURATION_MS) {
      throw new Error('Thời lượng phiên đấu giá phải từ 1 giờ đến 7 ngày (168 giờ).');
    }

    const antiSniping =
      input.antiSnipingExtensionSeconds !== undefined
        ? Number(input.antiSnipingExtensionSeconds)
        : 120;
    if (!Number.isSafeInteger(antiSniping) || antiSniping < 0 || antiSniping > 1800) {
      throw new Error('Thời gian gia hạn chống vét giá (anti-sniping) phải từ 0 đến 1800 giây.');
    }

    // Chặn tạo trùng phiên chưa kết thúc cho cùng một sản phẩm
    const existingAuctions = await this.auctionRepository.findAll();
    const conflicting = existingAuctions.find((existing) => {
      if (String(existing.productId) !== productId) return false;
      const effStatus = existing.resolveEffectiveStatus(now);
      return (
        effStatus === AuctionStatus.SCHEDULED ||
        effStatus === AuctionStatus.ACTIVE ||
        effStatus === AuctionStatus.EXTENDED
      );
    });
    if (conflicting) {
      throw new Error('Sản phẩm này đang có một phiên đấu giá khác chưa kết thúc.');
    }

    const cleanTitle = input.title?.trim();
    if (cleanTitle && cleanTitle.length > 200) {
      throw new Error('Tiêu đề phiên đấu giá không được vượt quá 200 ký tự.');
    }

    const status =
      startTime.getTime() <= now.getTime() ? AuctionStatus.ACTIVE : AuctionStatus.SCHEDULED;
    const tempId = generateUuidV7();

    const auction = new Auction({
      id: tempId,
      productId,
      sellerId: input.sellerId,
      title: cleanTitle || `Phiên đấu giá sản phẩm #${productId}`,
      imageUrl: input.imageUrl,
      startingPrice: startPrice,
      currentHighestBid: startPrice,
      bidIncrement: bidStep,
      buyNowPrice,
      status,
      startTime,
      endTime,
      antiSnipingExtensionSeconds: antiSniping,
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.auctionRepository.create(auction);

    const resolvedVisibility = input.visibility === 'RESTRICTED' ? 'RESTRICTED' : 'PUBLIC';
    const resolvedInvited = Array.isArray(input.invitedUserIds) ? input.invitedUserIds : [];

    if (this.auctionRepository.saveRoomAcl) {
      await this.auctionRepository.saveRoomAcl(created.id, resolvedVisibility, resolvedInvited);
    }

    auctionRuntimeStore.ensureMeta(created.id, {
      endTime: created.endTime,
      startingPrice: startPrice,
      bidIncrement: bidStep,
      antiSnipingWindowSeconds: antiSniping,
      antiSnipingExtendSeconds:
        input.antiSnipingExtendSeconds !== undefined
          ? Number(input.antiSnipingExtendSeconds)
          : antiSniping === 0
            ? 0
            : 300,
      maxExtensions: input.maxExtensions ?? 3,
      visibility: resolvedVisibility,
      invitedUserIds: resolvedInvited,
      demoMode: input.demoMode,
      demoMultiplier: input.demoMultiplier,
      createdByAdminId: input.createdByAdminId,
    });

    auctionRuntimeStore.appendTimeline(created.id, {
      type: 'CREATED',
      actorId: input.createdByAdminId || input.sellerId,
      actorRole: input.createdByAdminId ? 'ADMIN' : 'SELLER',
      summary: input.createdByAdminId
        ? `Quản trị viên tạo phiên thay cho Seller ${input.sellerId} (Khởi điểm ${startPrice.toLocaleString('vi-VN')} ₫, bước ${bidStep.toLocaleString('vi-VN')} ₫).`
        : `Tạo phiên đấu giá (Khởi điểm ${startPrice.toLocaleString('vi-VN')} ₫, bước ${bidStep.toLocaleString('vi-VN')} ₫).`,
      occurredAt: now.toISOString(),
      metadata: {
        productId,
        sellerId: input.sellerId,
        startPrice,
        bidStep,
        buyNowPrice,
        visibility: input.visibility || 'PUBLIC',
      },
    });

    return created;
  }
}
