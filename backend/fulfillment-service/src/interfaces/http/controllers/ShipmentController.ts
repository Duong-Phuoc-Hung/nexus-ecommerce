import { Request, Response } from 'express';
import { GetShipmentDetailUseCase } from '../../../application/use-cases/GetShipmentDetailUseCase';
import { SearchShipmentsUseCase } from '../../../application/use-cases/SearchShipmentsUseCase';
import { UpdateShipmentStatusUseCase } from '../../../application/use-cases/UpdateShipmentStatusUseCase';
import { ManualOverrideShipmentUseCase } from '../../../application/use-cases/ManualOverrideShipmentUseCase';
import { GetFulfillmentSummaryUseCase } from '../../../application/use-cases/GetFulfillmentSummaryUseCase';
import { ShipmentNotFoundException } from '../../../domain/exceptions/ShipmentNotFoundException';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class ShipmentController {
  constructor(
    private readonly getShipmentDetailUseCase: GetShipmentDetailUseCase,
    private readonly searchShipmentsUseCase: SearchShipmentsUseCase,
    private readonly updateShipmentStatusUseCase: UpdateShipmentStatusUseCase,
    private readonly manualOverrideShipmentUseCase: ManualOverrideShipmentUseCase,
    private readonly getFulfillmentSummaryUseCase: GetFulfillmentSummaryUseCase,
  ) {}

  public async listShipments(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const query = (req.query.query || req.query.q) as string | undefined;
      const carrier = req.query.carrier as string | undefined;
      const status = req.query.status as string | undefined;
      const orderId = req.query.orderId as string | undefined;
      const trackingCode = req.query.trackingCode as string | undefined;

      const result = await this.searchShipmentsUseCase.execute({
        query,
        carrier,
        status,
        orderId,
        trackingCode,
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
    } catch (error) {
      console.error('[ShipmentController.listShipments Error]:', error);
      res.status(500).json({
        success: false,
        error: 'Không thể tra cứu danh sách vận đơn.',
      });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const shipmentId = (req.params.id || 'shp_01hqz222trk') as string;
      const shipment = await this.getShipmentDetailUseCase.execute(shipmentId);
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (error) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Lỗi máy chủ khi lấy chi tiết vận đơn.',
      });
    }
  }

  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const shipmentId = req.params.id as string;
      const { status, location, note } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Thiếu thông tin trường "status" cập nhật vận đơn.',
        });
        return;
      }

      const updated = await this.updateShipmentStatusUseCase.execute({
        shipmentId,
        status,
        location,
        note,
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái vận đơn thành công.',
        data: updated,
      });
    } catch (error: any) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể cập nhật trạng thái vận đơn.',
      });
    }
  }

  public async manualOverride(req: Request, res: Response): Promise<void> {
    try {
      const shipmentId = req.params.id as string;
      const { carrier, trackingCode, shippingAddress, city, status, reason } = req.body;
      const user = (req as AuthenticatedRequest).user;

      const overridden = await this.manualOverrideShipmentUseCase.execute({
        shipmentId,
        carrier,
        trackingCode,
        shippingAddress,
        city,
        status,
        reason,
        operatorId: user?.sub,
      });

      res.status(200).json({
        success: true,
        message: 'Điều chỉnh thông tin vận đơn thủ công thành công.',
        data: overridden,
      });
    } catch (error: any) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể điều chỉnh thủ công vận đơn.',
      });
    }
  }

  public async getDashboardSummary(_req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.getFulfillmentSummaryUseCase.execute();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[ShipmentController.getDashboardSummary Error]:', error);
      res.status(500).json({
        success: false,
        error: 'Không thể tổng hợp báo cáo tổng quan ca trực.',
      });
    }
  }
}
