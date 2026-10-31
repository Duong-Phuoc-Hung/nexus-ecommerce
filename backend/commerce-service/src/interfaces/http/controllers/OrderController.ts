import { Request, Response } from 'express';
import { GetOrderDetailUseCase } from '../../../application/use-cases/GetOrderDetailUseCase';
import { SearchOrdersUseCase } from '../../../application/use-cases/SearchOrdersUseCase';
import { CancelOrderUseCase } from '../../../application/use-cases/CancelOrderUseCase';
import { RefundOrderUseCase } from '../../../application/use-cases/RefundOrderUseCase';
import { RejectRefundUseCase } from '../../../application/use-cases/RejectRefundUseCase';
import { OrderNotFoundException } from '../../../domain/exceptions/OrderNotFoundException';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class OrderController {
  constructor(
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly searchOrdersUseCase?: SearchOrdersUseCase,
    private readonly cancelOrderUseCase?: CancelOrderUseCase,
    private readonly refundOrderUseCase?: RefundOrderUseCase,
    private readonly rejectRefundUseCase?: RejectRefundUseCase,
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

      // BẢO MẬT PHÂN QUYỀN (CHỐNG LỖ HỔNG IDOR):
      // - Khi người gọi có vai trò là SELLER: Bắt buộc trích xuất sellerId trực tiếp từ JWT Payload đã qua xác thực (req.user.sub),
      //   ngăn chặn hoàn toàn việc người bán này tự ý truyền sellerId của shop khác để xem trộm đơn hàng.
      // - Khi người gọi có vai trò là BUYER: Bắt buộc chỉ xem đơn của chính mình (buyerId = authenticatedUser.sub).
      // - Quyền của ADMIN và SUPPORT_STAFF giữ nguyên 100% (xem toàn bộ sàn).
      if (authenticatedUser?.role === 'BUYER') {
        buyerId = authenticatedUser.sub;
      } else if (authenticatedUser?.role === 'SELLER') {
        sellerId = authenticatedUser.sub;
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
      if (authenticatedUser && authenticatedUser.role === 'BUYER' && order.buyerId !== authenticatedUser.sub) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền truy cập đơn hàng này.',
        });
        return;
      }
      if (authenticatedUser && authenticatedUser.role === 'SELLER' && order.sellerId !== authenticatedUser.sub) {
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

      const authenticatedUser = (req as AuthenticatedRequest).user;
      const orderId = req.params.id as string;
      const existingOrder = await this.getOrderDetailUseCase.execute(orderId);

      // Nếu là BUYER, kiểm tra đơn có phải của mình không và trạng thái có cho phép hủy không
      if (authenticatedUser && authenticatedUser.role === 'BUYER') {
        if (existingOrder.buyerId !== authenticatedUser.sub) {
          res.status(403).json({
            success: false,
            error: 'Bạn không có quyền hủy đơn hàng của người khác.',
          });
          return;
        }
        const currentStatus = (existingOrder.status || '').toUpperCase();
        if (
          currentStatus !== 'PENDING' &&
          currentStatus !== 'PENDING_PAYMENT' &&
          currentStatus !== 'PROCESSING'
        ) {
          res.status(400).json({
            success: false,
            error: `Không thể hủy đơn hàng đang ở trạng thái "${existingOrder.status}". Chỉ có thể hủy đơn khi chưa đóng gói/giao hàng.`,
          });
          return;
        }
      }

      const reason = req.body?.reason || (authenticatedUser?.role === 'BUYER' ? 'Người mua tự hủy' : undefined);
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
