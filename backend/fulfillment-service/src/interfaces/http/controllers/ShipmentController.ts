import { Request, Response } from 'express';
import { GetShipmentDetailUseCase } from '../../../application/use-cases/GetShipmentDetailUseCase';
import { ShipmentNotFoundException } from '../../../domain/exceptions/ShipmentNotFoundException';

export class ShipmentController {
  constructor(private readonly getShipmentDetailUseCase: GetShipmentDetailUseCase) {}

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
        error: 'Internal Server Error',
      });
    }
  }

  public async updateStatus(req: Request, res: Response): Promise<void> {
    const { status, trackingCode } = req.body;
    res.status(200).json({
      success: true,
      message: 'Shipment status updated (Skeleton mode)',
      data: {
        shipmentId: req.params.id || 'shp_01hqz222trk',
        newStatus: status || 'DELIVERED',
        trackingCode: trackingCode || 'GHN8829103VN',
      },
    });
  }
}
