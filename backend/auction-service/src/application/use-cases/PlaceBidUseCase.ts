import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { AuctionStatus } from '../../domain/entities/Auction';
import { IUserReputationClient } from '../ports/IUserReputationClient';

// Định nghĩa dữ liệu đầu vào ngay trong Use Case giống catalog-service
export interface PlaceBidInput {
  auctionId: string;
  bidderId: string;
  bidAmount: number;
}

export interface PlaceBidResult {
  auctionId: string;
  bidderId: string;
  currentHighestBid: number;
  status: string;
  endTime: Date;
  isExtended: boolean;
}

export class PlaceBidUseCase {
  constructor(
    private readonly auctionRepository: IAuctionRepository,
    private readonly userReputationClient?: IUserReputationClient,
  ) {}

  public async execute(input: PlaceBidInput): Promise<PlaceBidResult> {
    const { auctionId, bidderId, bidAmount } = input;

    // 1. Kiểm tra phòng đấu giá có tồn tại không
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Chống tự bid: Người bán không được tự trả giá cho món hàng của chính mình
    if (auction.sellerId === bidderId) {
      throw new Error('Người bán không được phép tự đặt giá cho sản phẩm của chính mình.');
    }

    // 2.1. TASK-AUC-03: Kiểm tra điều kiện điểm uy tín tối thiểu và chế tài hạn chế (MIN_REPUTATION_TO_BID >= 50)
    if (this.userReputationClient) {
      const rep = await this.userReputationClient.getUserReputation(bidderId);
      if (!rep.biddingEligible) {
        throw new Error(
          rep.reason ||
            'Tài khoản không đủ điều kiện tham gia đấu giá: Điểm uy tín tối thiểu phải từ 50 điểm trở lên và không có án phạt hạn chế.',
        );
      }
    }

    // 3. Kiểm tra trạng thái: Phải đang ACTIVE hoặc EXTENDED
    if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.EXTENDED) {
      throw new Error(
        `Phiên đấu giá #${auctionId} hiện không mở để đặt giá (Trạng thái: ${auction.status}).`,
      );
    }

    // 4. Kiểm tra thời gian: Không được bid khi đã quá giờ kết thúc
    const now = new Date();
    if (now.getTime() >= auction.endTime.getTime()) {
      throw new Error(`Phiên đấu giá #${auctionId} đã hết thời gian đặt giá.`);
    }

    // 5. Kiểm tra mức giá tối thiểu: Ít nhất phải bằng Giá hiện tại + Bước giá
    const minRequiredBid = auction.currentHighestBid + auction.bidIncrement;
    if (bidAmount < minRequiredBid) {
      throw new Error(
        `Mức giá đặt tối thiểu hợp lệ phải là ${minRequiredBid.toLocaleString('vi-VN')} VND.`,
      );
    }

    const previousEndTime = auction.endTime.getTime();

    // 6. Thực thi nghiệp vụ Đặt giá và Anti-sniping trong Domain Entity
    auction.placeBid(bidderId, bidAmount, now);

    const isExtended = auction.endTime.getTime() > previousEndTime;

    // 7. Cập nhật phòng đấu giá trong cơ sở dữ liệu
    await this.auctionRepository.update(auction);

    // 8. Lưu lịch sử lượt trả giá vào bảng auction_bids
    if (this.auctionRepository.saveBid) {
      await this.auctionRepository.saveBid({
        auctionId,
        bidderId,
        amount: bidAmount,
        bidTime: now,
        isWinning: true,
      });
    }

    return {
      auctionId: auction.id,
      bidderId,
      currentHighestBid: auction.currentHighestBid,
      status: auction.status,
      endTime: auction.endTime,
      isExtended,
    };
  }
}
