import { Request, Response } from 'express';
import { GetOrderDetailUseCase } from '../../../application/use-cases/GetOrderDetailUseCase';
import { SearchOrdersUseCase } from '../../../application/use-cases/SearchOrdersUseCase';
import { CancelOrderUseCase } from '../../../application/use-cases/CancelOrderUseCase';
import { RefundOrderUseCase } from '../../../application/use-cases/RefundOrderUseCase';
import { OrderNotFoundException } from '../../../domain/exceptions/OrderNotFoundException';

export class OrderController {
  constructor(
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly searchOrdersUseCase?: SearchOrdersUseCase,
    private readonly cancelOrderUseCase?: CancelOrderUseCase,
    private readonly refundOrderUseCase?: RefundOrderUseCase,
  ) {}

  public async listOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!this.searchOrdersUseCase) {
        res.status(500).json({ success: false, error: 'SearchOrdersUseCase not configured.' });
        return;
      }

      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const buyerId = typeof req.query.buyerId === 'string' ? req.query.buyerId : undefined;
      const sellerId = typeof req.query.sellerId === 'string' ? req.query.sellerId : undefined;
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
      const orderId = (req.params.id || 'ord_01hqz555abc') as string;
      const order = await this.getOrderDetailUseCase.execute(orderId);
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
