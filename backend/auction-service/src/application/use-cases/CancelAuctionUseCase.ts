import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus } from '../../domain/entities/Auction';

export interface CancelAuctionInput {
  auctionId: string;
  sellerId: string;
  isAdmin?: boolean;
  reason?: string;
}

export interface CancelAuctionResult {
  auctionId: string;
  status: string;
  cancelReason?: string;
  cancelledAt: string;
  message: string;
}

export class CancelAuctionUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(input: CancelAuctionInput): Promise<CancelAuctionResult> {
    const { auctionId, sellerId, isAdmin, reason } = input;

    // 1. Kiểm tra phòng đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Kiểm tra quyền: Chỉ chủ phiên hoặc Admin mới có quyền hủy
    if (auction.sellerId !== sellerId && !isAdmin) {
      throw new Error('Chỉ người tạo phiên đấu giá hoặc Quản trị viên mới có quyền hủy.');
    }

    // 3. Kiểm tra trạng thái: Không thể hủy phiên đã kết thúc hoặc đã hủy trước đó
    if (auction.status === AuctionStatus.ENDED) {
      throw new Error('Không thể hủy phiên đấu giá đã kết thúc.');
    }
    if (auction.status === AuctionStatus.CANCELLED) {
      throw new Error('Phiên đấu giá đã bị hủy trước đó.');
    }

    // 4. Bắt buộc phải có lý do hủy/dừng khẩn cấp phiên đấu giá
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new Error('Vui lòng cung cấp lý do hủy/dừng phiên đấu giá.');
    }
    if (reason.trim().length > 500) {
      throw new Error('Lý do hủy phiên không được vượt quá 500 ký tự.');
    }

    // 5. Thực thi nghiệp vụ hủy phiên trong Domain Entity
    const cleanReason = reason.trim();
    auction.cancel(cleanReason);

    // 6. Cập nhật trạng thái CANCELLED vào CSDL
    await this.auctionRepository.update(auction);

    const message = isAdmin
      ? 'Quản trị viên đã hủy/dừng khẩn cấp phiên đấu giá thành công.'
      : 'Hủy phiên đấu giá thành công.';

    return {
      auctionId: auction.id,
      status: auction.status,
      cancelReason: cleanReason,
      cancelledAt: new Date().toISOString(),
      message,
    };
  }
}
