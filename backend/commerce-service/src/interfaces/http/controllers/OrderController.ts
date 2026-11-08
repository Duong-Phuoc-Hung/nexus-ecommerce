import { Request, Response } from 'express';
import { GetOrderDetailUseCase } from '../../../application/use-cases/GetOrderDetailUseCase';
import { SearchOrdersUseCase } from '../../../application/use-cases/SearchOrdersUseCase';
import { CancelOrderUseCase } from '../../../application/use-cases/CancelOrderUseCase';
import { RefundOrderUseCase } from '../../../application/use-cases/RefundOrderUseCase';
import { RejectRefundUseCase } from '../../../application/use-cases/RejectRefundUseCase';
import { DispatchOrderUseCase } from '../../../application/use-cases/DispatchOrderUseCase';
import { RequestRefundUseCase } from '../../../application/use-cases/RequestRefundUseCase';
import { OrderNotFoundException } from '../../../domain/exceptions/OrderNotFoundException';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class OrderController {
  constructor(
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly searchOrdersUseCase?: SearchOrdersUseCase,
    private readonly cancelOrderUseCase?: CancelOrderUseCase,
    private readonly refundOrderUseCase?: RefundOrderUseCase,
    private readonly rejectRefundUseCase?: RejectRefundUseCase,
    private readonly dispatchOrderUseCase?: DispatchOrderUseCase,
    private readonly requestRefundUseCase?: RequestRefundUseCase,
  ) {}

  public async listOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!this.searchOrdersUseCase) {
        res.status(500).json({ success: false, error: 'SearchOrdersUseCase not configured.' });
        return;
      }

      const authenticatedUser = (req as AuthenticatedRequest).user;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      let buyerId = typeof req.query.buyerId === 'string' ? req.query.buyerId : undefined;
      let sellerId = typeof req.query.sellerId === 'string' ? req.query.sellerId : undefined;

      // BẢO MẬT PHÂN QUYỀN (CHỐNG LỖ HỔNG IDOR - SRS 3.1 & 3.6):
      // - BUYER chỉ được xem đơn hàng của chính mình (buộc buyerId = user.sub, chặn xem trộm đơn khách khác).
      // - SELLER:
      //   + Khi truy vấn lịch sử mua trước đây của chính mình (?buyerId=<user.sub> và không truyền sellerId): cho phép xem lịch sử mua thuộc sở hữu của mình.
      //   + Mặc định hoặc khi quản lý đơn bán của shop: buộc sellerId = user.sub, chặn xem trộm đơn shop khác.
      // - ADMIN và SUPPORT_STAFF giữ nguyên 100% quyền xem/lọc toàn bộ đơn hàng trên sàn.
      if (authenticatedUser?.role === 'BUYER') {
        buyerId = authenticatedUser.sub;
        sellerId = undefined;
      } else if (authenticatedUser?.role === 'SELLER') {
        if (buyerId === authenticatedUser.sub && !sellerId) {
          buyerId = authenticatedUser.sub;
          sellerId = undefined;
        } else {
          buyerId = undefined;
          sellerId = authenticatedUser.sub;
        }
      }
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const sortBy = typeof req.query.sortBy === 'string' ? (req.query.sortBy as any) : undefined;
      const sortOrder =
        typeof req.query.sortOrder === 'string' ? (req.query.sortOrder as any) : undefined;

      const result = await this.searchOrdersUseCase.execute({
        q,
        buyerId,
        sellerId,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
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
      const authenticatedUser = (req as AuthenticatedRequest).user;
      const orderId = (req.params.id || 'ord_01hqz555abc') as string;
      const order = await this.getOrderDetailUseCase.execute(orderId);

      // Kiểm tra quyền sở hữu đơn hàng (chống lỗ hổng IDOR)
      if (
        authenticatedUser &&
        authenticatedUser.role === 'BUYER' &&
        order.buyerId !== authenticatedUser.sub
      ) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền truy cập đơn hàng này.',
        });
        return;
      }
      if (
        authenticatedUser &&
        authenticatedUser.role === 'SELLER' &&
        order.sellerId !== authenticatedUser.sub &&
        order.buyerId !== authenticatedUser.sub
      ) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền truy cập đơn hàng này.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }

  public async cancel(req: Request, res: Response): Promise<void> {
    try {
      if (!this.cancelOrderUseCase) {
        res.status(500).json({ success: false, error: 'CancelOrderUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const reason = req.body?.reason;
      const result = await this.cancelOrderUseCase.execute(orderId, reason);

      res.status(200).json({
        success: true,
        message: 'Đơn hàng đã được hủy thành công.',
        data: result,
      });
    } catch (error) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Không thể hủy đơn hàng.',
      });
    }
  }

  public async refund(req: Request, res: Response): Promise<void> {
    try {
      if (!this.refundOrderUseCase) {
        res.status(500).json({ success: false, error: 'RefundOrderUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const reason = req.body?.reason;
      const result = await this.refundOrderUseCase.execute(orderId, reason);

      res.status(200).json({
        success: true,
        message: 'Đã kích hoạt hoàn tiền đơn hàng thành công.',
        data: result,
      });
    } catch (error) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Không thể hoàn tiền đơn hàng.',
      });
    }
  }

  /**
   * POST /api/v1/orders/:id/refund/cancel (hoặc /api/v1/orders/:id/reject-refund)
   * Từ chối yêu cầu hoàn tiền cho đơn hàng (SRS 2.3, 3.1.2)
   * Quyền: SUPPORT_STAFF, ADMIN
   */
  public async rejectRefund(req: Request, res: Response): Promise<void> {
    try {
      if (!this.rejectRefundUseCase) {
        res.status(500).json({ success: false, error: 'RejectRefundUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const { reason } = req.body || {};
      const result = await this.rejectRefundUseCase.execute(orderId, reason);

      res.status(200).json({
        success: true,
        message: 'Đã từ chối yêu cầu hoàn tiền thành công.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể từ chối yêu cầu hoàn tiền.',
      });
    }
  }

  /**
   * POST /api/v1/orders/:id/dispatch
   * Người bán xác nhận đóng gói và bàn giao cho ĐVVC
   * Quyền: SELLER (chính chủ), ADMIN, SUPPORT_STAFF
   */
  public async dispatch(req: Request, res: Response): Promise<void> {
    try {
      if (!this.dispatchOrderUseCase) {
        res.status(500).json({ success: false, error: 'DispatchOrderUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const { carrierCode, trackingCode } = req.body || {};
      const user = (req as AuthenticatedRequest).user;

      const result = await this.dispatchOrderUseCase.execute({
        orderId,
        operatorId: user?.sub,
        operatorRole: user?.role,
        carrierCode,
        trackingCode,
      });

      res.status(200).json({
        success: true,
        message: 'Đơn hàng đã được bàn giao vận chuyển thành công.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể bàn giao đơn hàng cho đơn vị vận chuyển.',
      });
    }
  }

  /**
   * POST /api/v1/orders/:id/refund/request
   * Người mua gửi yêu cầu trả hàng / hoàn tiền kèm lý do
   * Quyền: BUYER (chính chủ), ADMIN, SUPPORT_STAFF
   */
  public async requestRefund(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requestRefundUseCase) {
        res.status(500).json({ success: false, error: 'RequestRefundUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const { reason, evidenceUrls } = req.body || {};
      const user = (req as AuthenticatedRequest).user;

      const result = await this.requestRefundUseCase.execute({
        orderId,
        requesterId: user?.sub,
        requesterRole: user?.role,
        reason,
        evidenceUrls,
      });

      res.status(200).json({
        success: true,
        message: 'Yêu cầu trả hàng / hoàn tiền đã được gửi tới bộ phận hỗ trợ.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể gửi yêu cầu hoàn tiền cho đơn hàng.',
      });
    }
  }

  public async checkout(req: Request, res: Response): Promise<void> {
    const { items, shippingAddress } = req.body;
    res.status(201).json({
      success: true,
      message: 'Checkout intent created (Skeleton mode)',
      data: {
        orderId: 'ord_' + Date.now(),
        items: items || [],
        shippingAddress: shippingAddress || 'Default Address',
        clientSecret: 'pi_skeleton_secret_test_123',
      },
    });
  }
}
