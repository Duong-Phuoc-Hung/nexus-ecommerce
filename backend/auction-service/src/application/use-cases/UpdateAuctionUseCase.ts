import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import { AuctionNotFoundException } from '../../domain/exceptions/AuctionNotFoundException';
import { Auction } from '../../domain/entities/Auction';
import { auctionRuntimeStore } from '../../infrastructure/state/AuctionRuntimeStore';

export interface UpdateAuctionInput {
  auctionId: string;
  sellerId: string;
  isAdmin?: boolean;
  title?: string;
  bidIncrement?: number;
  buyNowPrice?: number;
  imageUrl?: string;
  startTime?: Date;
  endTime?: Date;
  expectedVersion?: number;
}

export class UpdateAuctionUseCase {
  constructor(private readonly auctionRepository: IAuctionRepository) {}

  public async execute(input: UpdateAuctionInput): Promise<Auction> {
    const { auctionId, sellerId, isAdmin, expectedVersion, ...updateParams } = input;

    // 1. Kiem tra phong dau gia ton tai
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    // 2. Kiem tra quyen chu so huu hoac admin
    if (auction.sellerId !== sellerId && !isAdmin) {
      throw new Error('Chỉ người tạo phiên đấu giá hoặc Quản trị viên mới có quyền chỉnh sửa.');
    }

    const meta = auctionRuntimeStore.ensureMeta(auctionId, {
      endTime: auction.endTime,
      startingPrice: auction.startingPrice,
      bidIncrement: auction.bidIncrement,
    });
    if (expectedVersion !== undefined && expectedVersion !== meta.version) {
      throw new Error(
        `Phiên đấu giá đã được cập nhật bởi thao tác khác (phiên bản hiện tại: ${meta.version}). Vui lòng tải lại.`,
      );
    }

    // 3. Cap nhat chi tiet trong domain entity (chỉ cho phép khi SCHEDULED)
    auction.updateDetails(updateParams);

    // 4. Luu xuong co so du lieu
    await this.auctionRepository.update(auction);

    auctionRuntimeStore.bumpVersion(auctionId);
    if (updateParams.endTime) {
      auctionRuntimeStore.updateMeta(auctionId, {
        originalEndTime: new Date(updateParams.endTime).toISOString(),
      });
    }
    auctionRuntimeStore.appendTimeline(auctionId, {
      type: 'UPDATED',
      actorId: sellerId,
      actorRole: isAdmin ? 'ADMIN' : 'SELLER',
      summary: 'Cập nhật cấu hình phiên đấu giá trước giờ mở.',
      metadata: {
        title: updateParams.title,
        bidIncrement: updateParams.bidIncrement,
        buyNowPrice: updateParams.buyNowPrice,
      },
    });

    return auction;
  }
}
