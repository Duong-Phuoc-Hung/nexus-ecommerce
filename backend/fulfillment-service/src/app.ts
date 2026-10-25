import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryShipmentRepository } from './infrastructure/repositories/InMemoryShipmentRepository';
import { GetShipmentDetailUseCase } from './application/use-cases/GetShipmentDetailUseCase';
import { SearchShipmentsUseCase } from './application/use-cases/SearchShipmentsUseCase';
import { UpdateShipmentStatusUseCase } from './application/use-cases/UpdateShipmentStatusUseCase';
import { ManualOverrideShipmentUseCase } from './application/use-cases/ManualOverrideShipmentUseCase';
import { GetFulfillmentSummaryUseCase } from './application/use-cases/GetFulfillmentSummaryUseCase';
import { ShipmentController } from './interfaces/http/controllers/ShipmentController';
import { createShipmentRoutes } from './interfaces/http/routes/ShipmentRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'fulfillment-service',
      boundedContext: 'Shipping & Fulfillment (SRS 3.6)',
      port: process.env.PORT || process.env.FULFILLMENT_SERVICE_PORT || 4005,
      timestamp: new Date().toISOString(),
    });
  });

  const shipmentRepository = new InMemoryShipmentRepository();
  const getShipmentDetailUseCase = new GetShipmentDetailUseCase(shipmentRepository);
  const searchShipmentsUseCase = new SearchShipmentsUseCase(shipmentRepository);
  const updateShipmentStatusUseCase = new UpdateShipmentStatusUseCase(shipmentRepository);
  const manualOverrideShipmentUseCase = new ManualOverrideShipmentUseCase(shipmentRepository);
  const getFulfillmentSummaryUseCase = new GetFulfillmentSummaryUseCase(shipmentRepository);

  const shipmentController = new ShipmentController(
    getShipmentDetailUseCase,
    searchShipmentsUseCase,
    updateShipmentStatusUseCase,
    manualOverrideShipmentUseCase,
    getFulfillmentSummaryUseCase,
  );

  const shipmentRoutes = createShipmentRoutes(shipmentController);

  // Mount at /api/v1/fulfillments and /api/v1/support
  app.use('/api/v1/fulfillments', shipmentRoutes);
  app.use('/api/v1/support', shipmentRoutes);

  return app;
}
