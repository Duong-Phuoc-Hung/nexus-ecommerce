import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus } from '../../domain/entities/Auction';
import { auctionRuntimeStore } from '../../infrastructure/state/AuctionRuntimeStore';
import { generateUuidV7 } from '../../infrastructure/utils/uuid';

export interface CancelAuctionInput {
  auctionId: string;
  sellerId: string;
  isAdmin?: boolean;
  cancelledBy?: string;
  cancelledRole?: string;
  reason?: string;
  publicReason?: string;
  internalNote?: string;
}

export interface CancelAuctionResult {
  auctionId: string;
  status: string;
  cancelReason?: string;
  publicReason?: string;
  internalNote?: string;
  cancelledBy?: string;
  cancelledAt: string;
  auditRef: string;
  affectedBidCount: number;
  message: string;
}

export class AuctionCancellationConflict extends Error {}
export class AuctionCancellationForbidden extends Error {}

export class CancelAuctionUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(input: CancelAuctionInput): Promise<CancelAuctionResult> {
    const {
      auctionId,
      sellerId,
      isAdmin,
      cancelledBy,
      cancelledRole,
      reason,
      publicReason,
      internalNote,
    } = input;

    // 1. Kiểm tra phòng đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Kiểm tra quyền: Chỉ chủ phiên hoặc ADMIN (Support không được kế thừa AUCTION.ADMIN_CANCEL)
    if (auction.sellerId !== sellerId && !isAdmin) {
      throw new AuctionCancellationForbidden(
        'Chỉ người tạo phiên đấu giá hoặc Quản trị viên mới có quyền hủy.',
      );
    }

    // 3. Đồng bộ trạng thái theo thời gian thực & kiểm tra điều kiện hủy
    const now = new Date();
    auction.syncLifecycle(now);
    if (auction.status === AuctionStatus.CANCELLED) {
      throw new AuctionCancellationConflict('Phiên đấu giá đã bị hủy trước đó.');
    }
    const cancellable = [AuctionStatus.SCHEDULED, AuctionStatus.ACTIVE, AuctionStatus.EXTENDED];
    if (!cancellable.includes(auction.status)) {
      throw new AuctionCancellationConflict('Không thể hủy phiên đấu giá đã kết thúc.');
    }

    // 4. Bắt buộc phải có lý do hủy/dừng khẩn cấp phiên đấu giá
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new Error('Vui lòng cung cấp lý do hủy/dừng phiên đấu giá.');
    }
    if (reason.trim().length > 500) {
      throw new Error('Lý do hủy phiên không được vượt quá 500 ký tự.');
    }

    const existingBids = this.auctionRepository.findBidsByAuctionId
      ? await this.auctionRepository.findBidsByAuctionId(auctionId).catch(() => [])
      : [];

    // 5. Thực thi nghiệp vụ hủy phiên trong Domain Entity
    const cleanReason = reason.trim();
    const cleanPublicReason =
      typeof publicReason === 'string' && publicReason.trim() ? publicReason.trim() : undefined;
    const cleanInternalNote =
      typeof internalNote === 'string' && internalNote.trim() ? internalNote.trim() : undefined;
    const effectiveCancelledBy = cancelledBy || sellerId;
    const auditRef = `AUD-${generateUuidV7().slice(0, 8).toUpperCase()}`;

    auction.cancel(cleanReason, effectiveCancelledBy, now);

    // 6. Cập nhật trạng thái CANCELLED vào CSDL
    await this.auctionRepository.update(auction);

    auctionRuntimeStore.ensureMeta(auctionId, {
      endTime: auction.endTime,
      startingPrice: auction.startingPrice,
      bidIncrement: auction.bidIncrement,
    });
    auctionRuntimeStore.updateMeta(auctionId, {
      publicCancelReason: cleanPublicReason,
      internalCancelNote: cleanInternalNote,
      auditRef,
    });
    auctionRuntimeStore.bumpVersion(auctionId);
    auctionRuntimeStore.setSettlement({
      auctionId,
      outcome: 'CANCELLED',
      settledAt: now.toISOString(),
      paymentStatus: 'NONE',
    });
    auctionRuntimeStore.appendTimeline(auctionId, {
      type: 'CANCELLED',
      actorId: effectiveCancelledBy,
      actorRole: cancelledRole || (isAdmin ? 'ADMIN' : 'SELLER'),
      summary: isAdmin
        ? `Quản trị viên đã cưỡng chế hủy phiên (${existingBids.length} lượt đặt bị ảnh hưởng).`
        : `Người bán đã hủy phiên (${existingBids.length} lượt đặt bị ảnh hưởng).`,
      publicReason: cleanReason,
      internalNote: cleanInternalNote,
      occurredAt: now.toISOString(),
      metadata: { auditRef, affectedBidCount: existingBids.length },
    });

    const message = isAdmin
      ? 'Quản trị viên đã hủy phiên đấu giá thành công.'
      : 'Hủy phiên đấu giá thành công.';

    return {
      auctionId: auction.id,
      status: auction.status,
      cancelReason: cleanReason,
      publicReason: cleanReason,
      internalNote: cleanInternalNote,
      cancelledBy: effectiveCancelledBy,
      cancelledAt: now.toISOString(),
      auditRef,
      affectedBidCount: existingBids.length,
      message,
    };
  }
}
