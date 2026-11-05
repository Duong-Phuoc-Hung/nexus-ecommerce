import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { Auction, AuctionStatus } from '../../domain/entities/Auction';

// DTO DÙNG RIÊNG: Định nghĩa ngay trên đầu file Use Case
export interface CreateAuctionRoomInput {
  productId: string;
  sellerId: string;
  title?: string;
  startPrice: number;
  bidStep?: number;
  buyNowPrice?: number;
  startTime: string | Date;
  endTime: string | Date;
  antiSnipingExtensionSeconds?: number;
}

export class CreateAuctionRoomUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  // Thực thi tạo mới phòng đấu giá và lưu trữ vào cơ sở dữ liệu
  public async execute(input: CreateAuctionRoomInput): Promise<Auction> {
    const startPrice = Number(input.startPrice);
    if (isNaN(startPrice) || startPrice <= 0) {
      throw new Error('Giá khởi điểm (startPrice) phải lớn hơn 0.');
    }

    const bidStep = input.bidStep ? Number(input.bidStep) : 10000;
    if (isNaN(bidStep) || bidStep <= 0) {
      throw new Error('Bước giá (bidStep) phải lớn hơn 0.');
    }

    const buyNowPrice =
      input.buyNowPrice !== undefined && input.buyNowPrice !== null
        ? Number(input.buyNowPrice)
        : undefined;
    if (buyNowPrice !== undefined) {
      if (isNaN(buyNowPrice) || buyNowPrice <= startPrice) {
        throw new Error('Giá mua ngay (buyNowPrice) phải lớn hơn giá khởi điểm.');
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
    if (endTime.getTime() <= now.getTime()) {
      throw new Error('Thời gian kết thúc phiên đấu giá phải ở tương lai.');
    }

    const status =
      startTime.getTime() <= now.getTime() ? AuctionStatus.ACTIVE : AuctionStatus.SCHEDULED;
    const antiSniping = input.antiSnipingExtensionSeconds ?? 120;
    const tempId = `auc_${Date.now()}`;

    const auction = new Auction({
      id: tempId,
      productId: String(input.productId),
      sellerId: input.sellerId,
      title: input.title || `Phiên đấu giá sản phẩm #${input.productId}`,
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

    return await this.auctionRepository.create(auction);
  }
}
