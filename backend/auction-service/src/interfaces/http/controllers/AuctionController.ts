import { Request, Response } from 'express';
import { GetAuctionDetailUseCase } from '../../../application/use-cases/GetAuctionDetailUseCase';
import { CreateAuctionRoomUseCase } from '../../../application/use-cases/CreateAuctionRoomUseCase';
import { AuctionNotFoundException } from '../../../domain/exceptions/AuctionNotFoundException';
import { IAuctionRepository } from '../../../domain/repositories/IAuctionRepository';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';
import { PlaceBidUseCase } from '../../../application/use-cases/PlaceBidUseCase';
import { GetBidHistoryUseCase } from '../../../application/use-cases/GetBidHistoryUseCase';
import { UpdateAuctionUseCase } from '../../../application/use-cases/UpdateAuctionUseCase';
import { BuyNowUseCase } from '../../../application/use-cases/BuyNowUseCase';
import { CancelAuctionUseCase } from '../../../application/use-cases/CancelAuctionUseCase';

export class AuctionController {
  constructor(
    private readonly getAuctionDetailUseCase: GetAuctionDetailUseCase,
    private readonly createAuctionRoomUseCase: CreateAuctionRoomUseCase,
    private readonly placeBidUseCase: PlaceBidUseCase,
    private readonly getBidHistoryUseCase: GetBidHistoryUseCase,
    private readonly updateAuctionUseCase: UpdateAuctionUseCase,
    private readonly buyNowUseCase: BuyNowUseCase,
    private readonly cancelAuctionUseCase: CancelAuctionUseCase,
    private readonly auctionRepository: IAuctionRepository,
  ) {}

  // Lấy danh sách các phiên đấu giá (hỗ trợ lọc theo status, sellerId hoặc mặc định là active)
  public async getActive(req: Request, res: Response): Promise<void> {
    try {
      const { status, sellerId } = req.query;
      const auctions =
        status || sellerId
          ? await this.auctionRepository.findAll({
              status: status as string,
              sellerId: sellerId as string,
            })
          : await this.auctionRepository.findActiveAuctions();

      res.status(200).json({
        success: true,
        data: auctions.map((a) => ({
          id: a.id,
          productId: a.productId,
          sellerId: a.sellerId,
          title: a.title,
          startingPrice: a.startingPrice,
          currentHighestBid: a.currentHighestBid,
          highestBidderId: a.highestBidderId,
          bidIncrement: a.bidIncrement,
          buyNowPrice: a.buyNowPrice,
          status: a.status,
          startTime: a.startTime,
          endTime: a.endTime,
          actualEndTime: a.actualEndTime,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Lỗi máy chủ nội bộ.' });
    }
  }

  // Lấy chi tiết phiên đấu giá theo ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const auctionId = (req.params.id || 'auc_01hqz777live') as string;
      const auction = await this.getAuctionDetailUseCase.execute(auctionId);
      res.status(200).json({
        success: true,
        data: auction,
      });
    } catch (error) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Lỗi máy chủ nội bộ.',
      });
    }
  }

  // Tạo mới phòng đấu giá (dành cho Seller và Admin)
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const {
        productId,
        sellerId,
        title,
        startPrice,
        bidStep,
        buyNowPrice,
        startTime,
        endTime,
        antiSnipingExtensionSeconds,
      } = req.body;

      if (!productId) {
        res.status(400).json({ success: false, error: 'Mã sản phẩm (productId) là bắt buộc.' });
        return;
      }
      if (startPrice === undefined || startPrice === null) {
        res.status(400).json({ success: false, error: 'Giá khởi điểm (startPrice) là bắt buộc.' });
        return;
      }
      if (!startTime || !endTime) {
        res
          .status(400)
          .json({ success: false, error: 'Thời gian bắt đầu và kết thúc là bắt buộc.' });
        return;
      }

      // Nếu là admin thì có thể chỉ định sellerId trong body, ngược lại dùng ID của user đăng nhập
      const effectiveSellerId =
        authUser?.role === 'ADMIN' && sellerId
          ? sellerId
          : authUser?.id || sellerId || 'usr_seller_default';

      const auction = await this.createAuctionRoomUseCase.execute({
        productId: String(productId),
        sellerId: effectiveSellerId,
        title,
        startPrice: Number(startPrice),
        bidStep: bidStep ? Number(bidStep) : undefined,
        buyNowPrice: buyNowPrice ? Number(buyNowPrice) : undefined,
        startTime,
        endTime,
        antiSnipingExtensionSeconds: antiSnipingExtensionSeconds
          ? Number(antiSnipingExtensionSeconds)
          : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo phòng đấu giá thành công.',
        data: {
          id: auction.id,
          productId: auction.productId,
          sellerId: auction.sellerId,
          title: auction.title,
          startingPrice: auction.startingPrice,
          currentHighestBid: auction.currentHighestBid,
          bidIncrement: auction.bidIncrement,
          buyNowPrice: auction.buyNowPrice,
          status: auction.status,
          startTime: auction.startTime,
          endTime: auction.endTime,
          createdAt: auction.createdAt,
        },
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Dữ liệu yêu cầu không hợp lệ.' });
    }
  }

  // Đặt giá cho phiên đấu giá
  public async placeBid(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const auctionId = req.params.id as string;
      const { bidAmount, bidderId } = req.body;

      // Lấy ID người đặt từ token JWT đăng nhập
      const effectiveBidderId = authUser?.id || bidderId;
      if (!effectiveBidderId) {
        res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để tham gia trả giá.' });
        return;
      }

      if (bidAmount === undefined || bidAmount === null || isNaN(Number(bidAmount))) {
        res
          .status(400)
          .json({ success: false, error: 'Số tiền đặt giá (bidAmount) không hợp lệ.' });
        return;
      }

      const result = await this.placeBidUseCase.execute({
        auctionId,
        bidderId: effectiveBidderId,
        bidAmount: Number(bidAmount),
      });

      res.status(200).json({
        success: true,
        message: result.isExtended
          ? 'Đặt giá thành công! Phiên đấu giá đã được tự động gia hạn thêm thời gian (Anti-sniping).'
          : 'Đặt giá thành công!',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({ success: false, error: error.message || 'Không thể đặt giá.' });
    }
  }

  // Mua thẳng (Buy It Now) kết thúc phiên ngay lập tức
  public async buyNow(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const auctionId = req.params.id as string;
      const effectiveBuyerId = authUser?.id || req.body.buyerId;

      if (!effectiveBuyerId) {
        res
          .status(401)
          .json({ success: false, error: 'Vui lòng đăng nhập để thực hiện mua ngay.' });
        return;
      }

      const result = await this.buyNowUseCase.execute({
        auctionId,
        buyerId: effectiveBuyerId,
      });

      res.status(200).json({
        success: true,
        message: 'Mua ngay thành công! Bạn đã giành chiến thắng phiên đấu giá.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể thực hiện mua ngay.' });
    }
  }

  // Hủy phiên đấu giá (dành cho chủ phiên hoặc Quản trị viên)
  public async cancel(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const auctionId = req.params.id as string;
      const sellerId = authUser?.id || 'usr_seller_default';
      const isAdmin = authUser?.role === 'ADMIN';
      const { reason } = req.body;

      const result = await this.cancelAuctionUseCase.execute({
        auctionId,
        sellerId,
        isAdmin,
        reason,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể hủy phiên đấu giá.' });
    }
  }

  // Lấy lịch sử các lượt đặt giá của phiên
  public async getBidHistory(req: Request, res: Response): Promise<void> {
    try {
      const auctionId = req.params.id as string;
      const history = await this.getBidHistoryUseCase.execute(auctionId);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: error.message || 'Lỗi máy chủ nội bộ.' });
    }
  }

  // Chỉnh sửa thông tin phòng đấu giá (chỉ khi phiên chưa bắt đầu - SCHEDULED)
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const auctionId = req.params.id as string;
      const { title, bidIncrement, buyNowPrice, startTime, endTime } = req.body;

      const sellerId = authUser?.id || 'usr_seller_default';
      const isAdmin = authUser?.role === 'ADMIN';

      const updatedAuction = await this.updateAuctionUseCase.execute({
        auctionId,
        sellerId,
        isAdmin,
        title,
        bidIncrement: bidIncrement ? Number(bidIncrement) : undefined,
        buyNowPrice: buyNowPrice !== undefined ? Number(buyNowPrice) : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật phòng đấu giá thành công.',
        data: {
          id: updatedAuction.id,
          title: updatedAuction.title,
          currentHighestBid: updatedAuction.currentHighestBid,
          bidIncrement: updatedAuction.bidIncrement,
          buyNowPrice: updatedAuction.buyNowPrice,
          status: updatedAuction.status,
          startTime: updatedAuction.startTime,
          endTime: updatedAuction.endTime,
          updatedAt: updatedAuction.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể chỉnh sửa phiên đấu giá.' });
    }
  }
}
