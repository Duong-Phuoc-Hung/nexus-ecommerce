import { Request, Response } from 'express';
import { GetSkuInventoryUseCase } from '../../../application/use-cases/GetSkuInventoryUseCase';
import { AdjustInventoryUseCase } from '../../../application/use-cases/AdjustInventoryUseCase';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class InventoryController {
  constructor(
    private readonly getSkuInventoryUseCase: GetSkuInventoryUseCase,
    private readonly adjustInventoryUseCase: AdjustInventoryUseCase,
  ) {}

  /**
   * GET /api/v1/fulfillments/inventory
   * Tra cứu tồn kho chuẩn SKU: { sku, productName, warehouseId, warehouseName, onHand, reserved, available }
   * trong đó available = onHand - reserved (SRS 2.6, 3.6.1).
   */
  public async listInventory(req: Request, res: Response): Promise<void> {
    try {
      const sku = typeof req.query.sku === 'string' ? req.query.sku : undefined;
      const warehouseId =
        typeof req.query.warehouseId === 'string' ? req.query.warehouseId : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await this.getSkuInventoryUseCase.execute({
        sku,
        warehouseId,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('[InventoryController.listInventory Error]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tra cứu danh sách tồn kho SKU.',
      });
    }
  }

  /**
   * POST /api/v1/fulfillments/inventory/adjust
   * Điều chỉnh số lượng tồn kho onHand (STOCK_IN, STOCK_OUT, DAMAGE) và lưu sổ cái kiểm toán (SRS 3.6.1).
   */
  public async adjustInventory(req: Request, res: Response): Promise<void> {
    try {
      const { sku, warehouseId, adjustmentType, quantity, reason } = req.body || {};
      const operatorId = (req as AuthenticatedRequest).user?.sub;

      const result = await this.adjustInventoryUseCase.execute({
        sku,
        warehouseId,
        adjustmentType,
        quantity: Number(quantity),
        reason,
        operatorId,
      });

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể điều chỉnh số lượng tồn kho.',
      });
    }
  }
}
