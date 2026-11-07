import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { Auction } from '../../domain/entities/Auction';

export interface UpdateAuctionInput {
  auctionId: string;
  sellerId: string;
  isAdmin?: boolean;
  title?: string;
  bidIncrement?: number;
  buyNowPrice?: number;
  startTime?: Date;
  endTime?: Date;
}

export class UpdateAuctionUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(input: UpdateAuctionInput): Promise<Auction> {
    const { auctionId, sellerId, isAdmin, ...updateParams } = input;

    // 1. Kiem tra phong dau gia ton tai
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Kiem tra quyen chu so huu hoac admin
    if (auction.sellerId !== sellerId && !isAdmin) {
      throw new Error('Chỉ người tạo phiên đấu giá hoặc Quản trị viên mới có quyền chỉnh sửa.');
    }

    // 3. Cap nhat chi tiet trong domain entity
    auction.updateDetails(updateParams);

    // 4. Luu xuong co so du lieu
    await this.auctionRepository.update(auction);

    return auction;
  }
}
