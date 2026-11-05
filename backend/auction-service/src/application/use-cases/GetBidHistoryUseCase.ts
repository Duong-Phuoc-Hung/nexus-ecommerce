import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { BidHistoryDto } from '../dtos/BidHistoryDto';

export class GetBidHistoryUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(auctionId: string): Promise<BidHistoryDto[]> {
    // 1. Kiểm tra phòng đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Lấy danh sách các lượt đặt giá từ CSDL (đã sắp xếp mới nhất lên đầu)
    if (!this.auctionRepository.findBidsByAuctionId) {
      return [];
    }

    const bids = await this.auctionRepository.findBidsByAuctionId(auctionId);

    // 3. Định dạng dữ liệu trả về cho Client
    return bids.map((b) => ({
      id: b.id || b.bidId,
      auctionId: b.auctionId,
      bidderId: b.bidderId,
      bidAmount: b.amount,
      bidTime: b.bidTime.toISOString(),
      isWinning: b.isWinning ?? false,
    }));
  }
}
