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
import {
  AuctionCancellationConflict,
  AuctionCancellationForbidden,
  CancelAuctionUseCase,
} from '../../../application/use-cases/CancelAuctionUseCase';
import { AuctionCheckoutUseCase } from '../../../application/use-cases/AuctionCheckoutUseCase';
import { SettleAuctionUseCase } from '../../../application/use-cases/SettleAuctionUseCase';

export class AuctionController {
  constructor(
    private readonly getAuctionDetailUseCase: GetAuctionDetailUseCase,
    private readonly createAuctionRoomUseCase: CreateAuctionRoomUseCase,
    private readonly placeBidUseCase: Pick<PlaceBidUseCase, 'execute'>,
    private readonly getBidHistoryUseCase: GetBidHistoryUseCase,
    private readonly updateAuctionUseCase: Pick<UpdateAuctionUseCase, 'execute'>,
    private readonly buyNowUseCase: Pick<BuyNowUseCase, 'execute'>,
    private readonly cancelAuctionUseCase: Pick<CancelAuctionUseCase, 'execute'>,
    private readonly auctionRepository: IAuctionRepository,
    private readonly auctionCheckoutUseCase?: AuctionCheckoutUseCase,
    private readonly settleAuctionUseCase?: SettleAuctionUseCase,
  ) {}

  // Lấy danh sách các phiên đấu giá (hỗ trợ lọc theo status, sellerId, từ khóa q hoặc mặc định là active)
  public async getActive(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const isAdminOrStaff = authUser?.role === 'ADMIN' || authUser?.role === 'SUPPORT_STAFF';
      const isSeller = authUser?.role === 'SELLER';
      const { status, sellerId, q } = req.query;

      // Kiểm tra tham số truy vấn lặp lại (Array) -> 400 Bad Request
      if (Array.isArray(sellerId) || Array.isArray(status) || Array.isArray(q)) {
        res.status(400).json({
          success: false,
          error: 'Tham số truy vấn không hợp lệ (không hỗ trợ mảng lặp lại).',
        });
        return;
      }

      // Xác định sellerId: Nếu là Seller đăng nhập thì tự động lấy danh sách của chính họ
      const effectiveSellerId =
        typeof sellerId === 'string' && sellerId.trim()
          ? sellerId.trim()
          : isSeller && authUser?.id
            ? authUser.id
            : undefined;

      // Chuẩn hóa status: Nếu là 'ALL' thì coi như không lọc theo status
      const rawStatus = typeof status === 'string' ? status.trim().toUpperCase() : undefined;
      const filterStatus = rawStatus && rawStatus !== 'ALL' ? rawStatus : undefined;

      // Nếu là Admin, Staff, Seller hoặc có truyền bộ lọc -> Lấy tất cả (kể cả SCHEDULED)
      const shouldFindAll = Boolean(status || effectiveSellerId || isAdminOrStaff || isSeller);
      let auctions = shouldFindAll
        ? await this.auctionRepository.findAll({
            status: filterStatus,
            sellerId: effectiveSellerId,
          })
        : await this.auctionRepository.findActiveAuctions();

      if (q && typeof q === 'string' && q.trim()) {
        const queryTerm = q.trim().toLowerCase();
        auctions = auctions.filter(
          (a) =>
            a.id.toLowerCase().includes(queryTerm) ||
            a.productId.toLowerCase().includes(queryTerm) ||
            (a.title && a.title.toLowerCase().includes(queryTerm)) ||
            a.sellerId.toLowerCase().includes(queryTerm),
        );
      }

      res.status(200).json({
        success: true,
        data: auctions.map((a) => {
          // Kiểm soát quyền xem lý do hủy: chỉ Admin, Staff hoặc chính Seller sở hữu phòng mới được xem chi tiết
          const canViewFullReason =
            isAdminOrStaff || (authUser?.role === 'SELLER' && authUser?.id === a.sellerId);
          const effectiveCancelReason = canViewFullReason
            ? a.cancelReason
            : a.cancelReason
              ? 'Phiên đấu giá đã bị dừng hoặc hủy'
              : undefined;

          return {
            id: a.id,
            productId: a.productId,
            sellerId: a.sellerId,
            title: a.title,
            startingPrice: a.startingPrice,
            currentHighestBid: a.currentHighestBid,
            highestBidderId: a.highestBidderId,
            bidIncrement: a.bidIncrement,
            buyNowPrice: a.buyNowPrice,
            imageUrl: a.imageUrl,
            status: a.status,
            startTime: a.startTime,
            endTime: a.endTime,
            actualEndTime: a.actualEndTime,
            cancelReason: effectiveCancelReason,
            cancelledBy: canViewFullReason ? a.cancelledBy : undefined,
            cancelledAt: canViewFullReason ? a.cancelledAt : undefined,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          };
        }),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Lỗi máy chủ nội bộ.' });
    }
  }

  public async getUserObligations(req: Request, res: Response): Promise<void> {
    try {
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : String(req.params.userId || '');
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required.' });
        return;
      }

      const activeAuctions = await this.auctionRepository.findActiveAuctions();
      const obligations: Array<{
        auctionId: string;
        title?: string;
        bidderId: string;
        type: 'LEADING_ACTIVE_AUCTION' | 'PARTICIPATING_ACTIVE_AUCTION' | 'UNSETTLED_WON_AUCTION';
      }> = [];

      for (const auction of activeAuctions) {
        if (auction.highestBidderId === userId) {
          obligations.push({
            auctionId: auction.id,
            title: `Phiên đấu giá #${auction.id}`,
            bidderId: userId,
            type: 'LEADING_ACTIVE_AUCTION',
          });
          continue;
        }

        const bids = this.auctionRepository.findBidsByAuctionId
          ? await this.auctionRepository.findBidsByAuctionId(auction.id)
          : [];
        const participated = bids.some((b) => b.bidderId === userId);
        if (participated) {
          obligations.push({
            auctionId: auction.id,
            title: `Phiên đấu giá #${auction.id}`,
            bidderId: userId,
            type: 'PARTICIPATING_ACTIVE_AUCTION',
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          userId,
          obligations,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const isAdminOrStaff = authUser?.role === 'ADMIN' || authUser?.role === 'SUPPORT_STAFF';
      const auctionId = req.params.id as string;
      const auction = await this.getAuctionDetailUseCase.execute(auctionId);

      // Kiểm soát quyền xem lý do hủy phiên:
      // Admin, Support Staff hoặc chính Seller chủ phòng được xem lý do chi tiết; Buyer/Khách xem thông báo chung
      const canViewFullReason =
        isAdminOrStaff || (authUser?.role === 'SELLER' && authUser?.id === auction.sellerId);
      const effectiveCancelReason = canViewFullReason
        ? auction.cancelReason
        : auction.cancelReason
          ? 'Phiên đấu giá đã bị dừng hoặc hủy'
          : undefined;

      res.status(200).json({
        success: true,
        data: {
          ...auction,
          cancelReason: effectiveCancelReason,
          cancelledBy: canViewFullReason ? auction.cancelledBy : undefined,
          cancelledAt: canViewFullReason ? auction.cancelledAt : undefined,
        },
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
        imageUrl,
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
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : undefined,
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
          imageUrl: auction.imageUrl,
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
      if (authUser && authUser.role !== 'BUYER') {
        res.status(403).json({
          success: false,
          code: 'AUCTION_BID_FORBIDDEN_ROLE',
          error: 'Chỉ tài khoản BUYER mới có quyền đặt giá đấu giá (AUCTION.BID).',
        });
        return;
      }
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

  public async cancel(req: Request, res: Response): Promise<void> {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.' });
      return;
    }

    const rawReason = req.body?.reason;
    const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
    const isAdminOrStaff = authUser.role === 'ADMIN' || authUser.role === 'SUPPORT_STAFF';
    const defaultReason = isAdminOrStaff
      ? 'Hủy theo yêu cầu của quản trị viên'
      : 'Hủy theo yêu cầu của người bán';

    if (
      (rawReason != null && typeof rawReason !== 'string') ||
      reason.length > 500 ||
      (!reason && req.method !== 'DELETE')
    ) {
      res.status(400).json({
        success: false,
        error: 'Lý do hủy phải là chuỗi từ 1 đến 500 ký tự.',
      });
      return;
    }

    try {
      const result = await this.cancelAuctionUseCase.execute({
        auctionId: req.params.id as string,
        sellerId: authUser.id,
        isAdmin: isAdminOrStaff,
        cancelledBy: authUser.id,
        reason: reason || defaultReason,
      });
      res.status(200).json({ success: true, message: result.message, data: result });
    } catch (error) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
      } else if (error instanceof AuctionCancellationForbidden) {
        res.status(403).json({ success: false, error: error.message });
      } else if (error instanceof AuctionCancellationConflict) {
        res.status(409).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: 'Không thể lưu trạng thái hủy phiên đấu giá.' });
      }
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
      const { title, bidIncrement, buyNowPrice, imageUrl, startTime, endTime } = req.body;

      const sellerId = authUser?.id || 'usr_seller_default';
      const isAdmin = authUser?.role === 'ADMIN';

      const updatedAuction = await this.updateAuctionUseCase.execute({
        auctionId,
        sellerId,
        isAdmin,
        title,
        bidIncrement: bidIncrement ? Number(bidIncrement) : undefined,
        buyNowPrice: buyNowPrice !== undefined ? Number(buyNowPrice) : undefined,
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : undefined,
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
          imageUrl: updatedAuction.imageUrl,
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

  // Chốt đơn thanh toán cho người thắng đấu giá (gọi sang Commerce Service để sinh VietQR PayOS)
  public async checkout(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser || !authUser.id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Bạn cần đăng nhập để chốt đơn thanh toán.',
        });
        return;
      }

      if (!this.auctionCheckoutUseCase) {
        res.status(500).json({
          success: false,
          error: 'AuctionCheckoutUseCase is not configured.',
        });
        return;
      }

      const auctionId = req.params.id as string;
      const { shippingAddress } = req.body;
      const authHeader = req.headers.authorization;

      const result = await this.auctionCheckoutUseCase.execute({
        auctionId,
        buyerId: authUser.id,
        buyerToken: authHeader,
        shippingAddress,
      });

      res.status(200).json({
        success: true,
        message: 'Tạo đơn hàng thành công! Vui lòng quét mã VietQR PayOS để thanh toán.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error?.message?.startsWith('FORBIDDEN')) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể chốt đơn thanh toán đấu giá.',
      });
    }
  }

  // Chốt phiên đấu giá khi có người thắng và phát event sang RabbitMQ (TASK-AUC-01)
  public async settle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.settleAuctionUseCase) {
        res.status(500).json({ success: false, error: 'SettleAuctionUseCase is not configured.' });
        return;
      }
      const auctionId = req.params.id as string;
      const authUser = (req as AuthenticatedRequest).user;

      const result = await this.settleAuctionUseCase.execute({
        auctionId,
        triggeredBy: authUser?.id,
      });

      res.status(200).json({
        success: true,
        message:
          'Chốt phiên đấu giá thành công! Đã gửi thông tin đơn hàng tới hệ thống thanh toán.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể chốt phiên đấu giá.',
      });
    }
  }
}
