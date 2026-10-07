import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryShipmentRepository } from './infrastructure/repositories/InMemoryShipmentRepository';
import { GetShipmentDetailUseCase } from './application/use-cases/GetShipmentDetailUseCase';
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
      port: process.env.FULFILLMENT_SERVICE_PORT || 3005,
      timestamp: new Date().toISOString(),
    });
  });

  const shipmentRepository = new InMemoryShipmentRepository();
  const getShipmentDetailUseCase = new GetShipmentDetailUseCase(shipmentRepository);
  const shipmentController = new ShipmentController(getShipmentDetailUseCase);

  app.use('/api/v1/fulfillments', createShipmentRoutes(shipmentController));

  return app;
}
