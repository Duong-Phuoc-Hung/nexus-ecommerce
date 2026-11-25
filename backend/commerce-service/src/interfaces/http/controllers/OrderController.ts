import { Request, Response } from 'express';
import { buildServiceAuthHeader } from '../../../infrastructure/security/internal-service-auth';
import type { Pool } from 'pg';
import { GetOrderDetailUseCase } from '../../../application/use-cases/GetOrderDetailUseCase';
import { SearchOrdersUseCase } from '../../../application/use-cases/SearchOrdersUseCase';
import { CancelOrderUseCase } from '../../../application/use-cases/CancelOrderUseCase';
import { RefundOrderUseCase } from '../../../application/use-cases/RefundOrderUseCase';
import { RejectRefundUseCase } from '../../../application/use-cases/RejectRefundUseCase';
import { DispatchOrderUseCase } from '../../../application/use-cases/DispatchOrderUseCase';
import { RequestRefundUseCase } from '../../../application/use-cases/RequestRefundUseCase';
import { ExecuteRefundUseCase } from '../../../application/use-cases/ExecuteRefundUseCase';
import { GetRefundStatusUseCase } from '../../../application/use-cases/GetRefundStatusUseCase';
import { UpdateOrderStatusUseCase } from '../../../application/use-cases/UpdateOrderStatusUseCase';
import { ConfirmOrderReceiptUseCase } from '../../../application/use-cases/ConfirmOrderReceiptUseCase';
import { InvoiceService } from '../../../application/services/InvoiceService';
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
    private readonly executeRefundUseCase?: ExecuteRefundUseCase,
    private readonly getRefundStatusUseCase?: GetRefundStatusUseCase,
    private readonly updateOrderStatusUseCase?: UpdateOrderStatusUseCase,
    private readonly confirmOrderReceiptUseCase?: ConfirmOrderReceiptUseCase,
    private readonly adminReads?: {
      search: SearchOrdersUseCase;
      detail: GetOrderDetailUseCase;
    },
    private readonly dbPool?: Pool,
    private readonly invoiceService?: InvoiceService,
  ) {}

  private async enrichAuctionMeta<T extends Record<string, any>>(items: T[]): Promise<T[]> {
    if (!items.length) return items;
    const byId = new Map<
      string,
      {
        internalId: string;
        orderCode: string | null;
        orderSource: string;
        auctionId: string | null;
        auctionWinningBid: number | null;
      }
    >();
    if (this.dbPool && process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        const ids = items
          .flatMap((o) => [
            String(o.internalId || ''),
            String(o.id || ''),
            String(o.orderCode || ''),
          ])
          .filter(Boolean);
        if (ids.length > 0) {
          const res = await this.dbPool.query(
            `SELECT id, order_code, order_source, auction_id, auction_winning_bid
             FROM commerce_orders
             WHERE id = ANY($1::varchar[]) OR order_code = ANY($1::varchar[])`,
            [ids],
          );
          for (const r of res.rows) {
            const meta = {
              internalId: String(r.id),
              orderCode: r.order_code ? String(r.order_code) : null,
              orderSource: String(r.order_source || 'DIRECT').toUpperCase(),
              auctionId: r.auction_id ? String(r.auction_id) : null,
              auctionWinningBid:
                r.auction_winning_bid != null ? Number(r.auction_winning_bid) : null,
            };
            byId.set(String(r.id), meta);
            if (r.order_code) byId.set(String(r.order_code), meta);
          }
        }
      } catch {
        // Non-blocking enrichment
      }
    }
    return items.map((item) => {
      const code = String(item.orderCode || item.id || '');
      const found =
        byId.get(String(item.internalId || '')) ||
        byId.get(String(item.id || '')) ||
        byId.get(code);
      const inferredSource = code.toUpperCase().startsWith('ORD-AUC-') ? 'AUCTION' : 'DIRECT';
      return {
        ...item,
        internalId: found?.internalId || item.internalId || item.id,
        orderCode: found?.orderCode || item.orderCode || item.id,
        orderSource: found?.orderSource || inferredSource,
        auctionId: found?.auctionId ?? null,
        auctionWinningBid: found?.auctionWinningBid ?? null,
      };
    });
  }

  public async listOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!this.searchOrdersUseCase) {
        res.status(500).json({ success: false, error: 'SearchOrdersUseCase not configured.' });
        return;
      }

      // Kiểm tra tham số mảng hoặc lặp lại -> 400 Bad Request
      if (
        Array.isArray(req.query.sellerId) ||
        Array.isArray(req.query.buyerId) ||
        Array.isArray(req.query.status) ||
        Array.isArray(req.query.q) ||
        Array.isArray(req.query.page) ||
        Array.isArray(req.query.limit)
      ) {
        res.status(400).json({
          success: false,
          error: 'Tham số truy vấn không hợp lệ (không hỗ trợ mảng lặp lại).',
        });
        return;
      }

      if (
        req.query.page !== undefined &&
        (!Number.isSafeInteger(Number(req.query.page)) || Number(req.query.page) < 1)
      ) {
        res.status(400).json({
          success: false,
          error: 'Tham số page phải là số nguyên dương lớn hơn hoặc bằng 1.',
        });
        return;
      }

      if (
        req.query.limit !== undefined &&
        (!Number.isSafeInteger(Number(req.query.limit)) || Number(req.query.limit) < 1)
      ) {
        res.status(400).json({
          success: false,
          error: 'Tham số limit phải là số nguyên dương lớn hơn hoặc bằng 1.',
        });
        return;
      }

      const user = (req as AuthenticatedRequest).user;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      let buyerId = typeof req.query.buyerId === 'string' ? req.query.buyerId.trim() : undefined;
      let sellerId = typeof req.query.sellerId === 'string' ? req.query.sellerId.trim() : undefined;

      if (!buyerId || buyerId.toLowerCase() === 'all') {
        buyerId = undefined;
      }
      if (!sellerId || sellerId.toLowerCase() === 'all') {
        sellerId = undefined;
      }

      // BẢO MẬT PHÂN QUYỀN (CHỐNG LỖ HỔNG IDOR - SRS 3.1 & 3.6):
      // - BUYER chỉ được xem đơn hàng của chính mình (buộc buyerId = user.sub, chặn xem trộm đơn khách khác).
      // - SELLER:
      //   + Khi truy vấn lịch sử mua trước đây của chính mình (?buyerId=<user.sub> và không truyền sellerId): cho phép xem lịch sử mua thuộc sở hữu của mình.
      //   + Mặc định hoặc khi quản lý đơn bán của shop: buộc sellerId = user.sub, chặn xem trộm đơn shop khác.
      // - ADMIN và SUPPORT_STAFF giữ nguyên 100% quyền xem/lọc toàn bộ đơn hàng trên sàn.
      if (user?.role === 'BUYER') {
        buyerId = user.sub;
        sellerId = undefined;
      } else if (user?.role === 'SELLER') {
        if (buyerId === user.sub && !sellerId) {
          buyerId = user.sub;
          sellerId = undefined;
        } else {
          buyerId = undefined;
          sellerId = user.sub;
        }
      }

      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const fromDate =
        typeof req.query.fromDate === 'string' ? req.query.fromDate.trim() : undefined;
      const toDate = typeof req.query.toDate === 'string' ? req.query.toDate.trim() : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const sortBy = typeof req.query.sortBy === 'string' ? (req.query.sortBy as any) : undefined;
      const sortOrder =
        typeof req.query.sortOrder === 'string' ? (req.query.sortOrder as any) : undefined;

      const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT_STAFF';
      const search =
        (isAdminOrStaff ? this.adminReads?.search : undefined) ?? this.searchOrdersUseCase;
      const result = await search.execute({
        q,
        buyerId,
        sellerId,
        status,
        fromDate,
        toDate,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      const enrichedItems = await this.enrichAuctionMeta(result.items as any[]);

      res.status(200).json({
        success: true,
        data: enrichedItems,
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
      const isAdminOrStaff =
        authenticatedUser?.role === 'ADMIN' || authenticatedUser?.role === 'SUPPORT_STAFF';
      const detail =
        (isAdminOrStaff ? this.adminReads?.detail : undefined) ?? this.getOrderDetailUseCase;
      const order = await detail.execute(orderId);

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

      const [enrichedOrder] = await this.enrichAuctionMeta([order as any]);

      res.status(200).json({
        success: true,
        data: enrichedOrder,
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
          currentStatus === 'DELIVERED' ||
          currentStatus === 'SHIPPED' ||
          currentStatus === 'CANCELLED' ||
          currentStatus === 'REFUNDED'
        ) {
          res.status(400).json({
            success: false,
            error: `Không thể hủy đơn hàng đang ở trạng thái "${existingOrder.status}". Chỉ có thể hủy đơn khi chưa giao hàng.`,
          });
          return;
        }
      }

      const reason =
        req.body?.reason || (authenticatedUser?.role === 'BUYER' ? 'Người mua tự hủy' : undefined);
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

  /**
   * POST /api/v1/orders/:id/refund/execute
   * Kích hoạt hoàn tiền thật qua Cổng thanh toán (PayOS Refund Integration)
   * Quyền: SUPPORT_STAFF, ADMIN
   */
  public async executeRefund(req: Request, res: Response): Promise<void> {
    try {
      if (!this.executeRefundUseCase) {
        res.status(500).json({ success: false, error: 'ExecuteRefundUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const { refundAmount, reason } = req.body || {};
      const user = (req as AuthenticatedRequest).user;
      const rawIdemp = req.headers['idempotency-key'];
      const idempotencyKey = Array.isArray(rawIdemp) ? rawIdemp[0] : rawIdemp;

      const result = await this.executeRefundUseCase.execute({
        orderId,
        refundAmount: typeof refundAmount === 'number' ? refundAmount : undefined,
        reason,
        operatorId: user?.sub,
        idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
      });

      if (result.status === 'PENDING') {
        res.status(202).json({
          success: false,
          pending: true,
          code: result.errorCode || 'REFUND_PENDING',
          message: result.message,
          data: result,
        });
        return;
      }

      if (result.status === 'FAILED') {
        const statusCode =
          result.errorCode === 'REFUND_PROVIDER_NOT_CONFIGURED' ||
          result.errorCode === 'REFUND_GATEWAY_NOT_CONFIGURED'
            ? 503
            : 502;
        res.status(statusCode).json({
          success: false,
          code: result.errorCode || 'REFUND_FAILED',
          error: result.message,
          data: result,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể thực thi lệnh hoàn tiền qua cổng PayOS.',
      });
    }
  }

  /**
   * GET /api/v1/orders/:id/refund/status
   * Kiểm tra trạng thái hoàn tiền đã về tài khoản khách chưa (PENDING / SUCCESS / FAILED)
   */
  public async getRefundStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!this.getRefundStatusUseCase) {
        res.status(500).json({ success: false, error: 'GetRefundStatusUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const user = (req as AuthenticatedRequest).user;
      const role = (user?.role || '').toUpperCase();
      if (role !== 'ADMIN' && role !== 'SUPPORT_STAFF') {
        const order = await this.getOrderDetailUseCase.execute(orderId);
        if (order.buyerId !== user?.sub && order.sellerId !== user?.sub) {
          res.status(403).json({
            success: false,
            error: 'Bạn không có quyền xem trạng thái hoàn tiền của đơn hàng này.',
          });
          return;
        }
      }

      const result = await this.getRefundStatusUseCase.execute(orderId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tra cứu trạng thái hoàn tiền.',
      });
    }
  }

  /**
   * PATCH /api/v1/orders/:id/status & POST /api/v1/orders/:id/status
   * Cập nhật trạng thái đơn hàng (Đồng bộ từ Fulfillment/3PL hoặc thao tác can thiệp từ Support/Seller/Admin)
   * Tự động kích hoạt trừ kho Catalog khi chuyển sang DELIVERED.
   */
  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!this.updateOrderStatusUseCase) {
        res.status(500).json({ success: false, error: 'UpdateOrderStatusUseCase not configured.' });
        return;
      }

      const orderId = req.params.id as string;
      const { status, note } = req.body || {};
      const user = (req as AuthenticatedRequest).user;

      if (!status) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin trạng thái (status).' });
        return;
      }

      const result = await this.updateOrderStatusUseCase.execute({
        orderId,
        status,
        note,
        operatorId: user?.sub,
        operatorRole: user?.role,
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái đơn hàng thành công.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể cập nhật trạng thái đơn hàng.',
      });
    }
  }

  public async confirmReceipt(req: Request, res: Response): Promise<void> {
    try {
      if (!this.confirmOrderReceiptUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'ConfirmOrderReceiptUseCase not configured.' });
        return;
      }

      const authenticatedUser = (req as AuthenticatedRequest).user;
      if (!authenticatedUser || !authenticatedUser.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const orderId = req.params.id as string;
      const updatedOrder = await this.confirmOrderReceiptUseCase.execute({
        orderId,
        buyerId: authenticatedUser.sub,
      });

      // Tự động xuất hóa đơn điện tử & đẩy thông báo idempotent khi đơn hoàn tất (T19 / SRS B-F325)
      if (this.invoiceService && process.env.USE_IN_MEMORY_DB !== 'true') {
        void this.invoiceService
          .getOrIssueInvoice(orderId, {
            userId: authenticatedUser.sub,
            role: authenticatedUser.role || 'BUYER',
          })
          .catch((err) => {
            console.warn('[commerce-service] Non-blocking invoice issue warning:', err?.message);
          });
      }

      res.status(200).json({
        success: true,
        message: 'Xác nhận đã nhận hàng thành công.',
        data: updatedOrder,
      });
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error.message?.includes('không có quyền')) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể xác nhận nhận hàng.',
      });
    }
  }

  public async getOrderCases(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id as string;
      const authenticatedUser = (req as AuthenticatedRequest).user;
      const existingOrder = await this.getOrderDetailUseCase.execute(orderId);

      // Chống IDOR: Buyer chỉ được xem case của đơn mình
      if (authenticatedUser?.role === 'BUYER' && existingOrder.buyerId !== authenticatedUser.sub) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền truy cập khiếu nại của đơn hàng này.',
        });
        return;
      }

      // Chống IDOR: Seller chỉ được xem case của đơn hàng thuộc gian hàng của mình
      if (
        authenticatedUser?.role === 'SELLER' &&
        existingOrder.sellerId !== authenticatedUser.sub
      ) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền truy cập khiếu nại của đơn hàng thuộc người bán khác.',
        });
        return;
      }

      const fulfillmentUrl = (
        process.env.FULFILLMENT_SERVICE_URL ||
        `http://127.0.0.1:${process.env.FULFILLMENT_SERVICE_PORT || 4005}`
      ).replace(/\/$/, '');

      const response = await fetch(
        `${fulfillmentUrl}/api/v1/support/cases?orderId=${encodeURIComponent(orderId)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers.authorization
              ? { Authorization: String(req.headers.authorization) }
              : {}),
            ...buildServiceAuthHeader({
              issuer: 'commerce-service',
              audience: 'fulfillment-service',
              scope: 'fulfillment:case:read',
              resource: orderId,
              actor: authenticatedUser
                ? { sub: authenticatedUser.sub, role: authenticatedUser.role }
                : undefined,
            }),
          },
        },
      );

      if (!response.ok) {
        res.status(response.status).json(
          await response.json().catch(() => ({
            success: false,
            data: [],
          })),
        );
        return;
      }

      const json = await response.json();
      res.status(200).json(json);
    } catch (error: any) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(502).json({
        success: false,
        error: 'Không thể kết nối đến dịch vụ khiếu nại (Fulfillment Service).',
      });
    }
  }

  /**
   * GET /api/v1/orders/admin/reports
   * Tổng hợp báo cáo doanh thu, đơn hàng, tỷ lệ hủy/hoàn cho Admin Dashboard & Reports
   */
  public async getAdminReports(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Chỉ Quản trị viên (ADMIN) mới có quyền xem báo cáo tổng hợp toàn sàn.',
        });
        return;
      }

      const fromDate = typeof req.query.from === 'string' ? req.query.from.trim() : undefined;
      const toDate = typeof req.query.to === 'string' ? req.query.to.trim() : undefined;
      const granularity =
        req.query.granularity === 'month' || req.query.granularity === 'week'
          ? req.query.granularity
          : 'day';

      const searchUseCase = this.adminReads?.search ?? this.searchOrdersUseCase;
      if (!searchUseCase) {
        res.status(500).json({ success: false, error: 'SearchOrdersUseCase not configured.' });
        return;
      }

      const result = await searchUseCase.execute({
        fromDate,
        toDate,
        page: 1,
        limit: 100,
      });

      const byPeriod = new Map<
        string,
        {
          period: string;
          orders: number;
          cancelledOrRefunded: number;
          revenue: number;
          completedAuctions: number;
        }
      >();
      let totalOrders = 0;
      let completedOrders = 0;
      let cancelledOrRefundedOrders = 0;
      let netRevenue = 0;

      const bucketKey = (isoStr: string) => {
        const d = new Date(isoStr);
        if (Number.isNaN(d.getTime())) return isoStr.slice(0, 10);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        if (granularity === 'month') return `${yyyy}-${mm}`;
        return `${yyyy}-${mm}-${dd}`;
      };

      for (const o of result.items) {
        const key = bucketKey(o.createdAt);
        const cur = byPeriod.get(key) ?? {
          period: key,
          orders: 0,
          cancelledOrRefunded: 0,
          revenue: 0,
          completedAuctions: 0,
        };
        cur.orders += 1;
        totalOrders += 1;
        const st = String(o.status || '').toUpperCase();
        if (st === 'CANCELLED' || st === 'REFUNDED') {
          cur.cancelledOrRefunded += 1;
          cancelledOrRefundedOrders += 1;
        } else {
          cur.revenue += Number(o.totalAmount || 0);
          netRevenue += Number(o.totalAmount || 0);
          if (['PAID', 'DELIVERED', 'COMPLETED'].includes(st)) {
            completedOrders += 1;
          }
        }
        byPeriod.set(key, cur);
      }

      const rows = Array.from(byPeriod.values()).sort((a, b) => b.period.localeCompare(a.period));

      res.status(200).json({
        success: true,
        data: {
          summary: {
            netRevenue,
            totalOrders,
            completedOrders,
            cancelledOrRefundedOrders,
            cancelRefundRate: totalOrders > 0 ? (cancelledOrRefundedOrders / totalOrders) * 100 : 0,
            completedAuctions: 0,
          },
          rows,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tổng hợp báo cáo vận hành.',
      });
    }
  }
}
