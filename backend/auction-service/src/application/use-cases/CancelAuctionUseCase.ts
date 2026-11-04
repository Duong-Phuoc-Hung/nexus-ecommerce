import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';

export interface CancelAuctionInput {
  auctionId: string;
  sellerId: string;
  isAdmin?: boolean;
  reason?: string;
}

export interface CancelAuctionResult {
  auctionId: string;
  status: string;
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

    // 3. Thực thi nghiệp vụ hủy phiên trong Domain Entity
    auction.cancel(reason);

    // 4. Cập nhật trạng thái CANCELLED vào CSDL
    await this.auctionRepository.update(auction);

    return {
      auctionId: auction.id,
      status: auction.status,
      message: 'Hủy phiên đấu giá thành công.',
    };
  }
}
