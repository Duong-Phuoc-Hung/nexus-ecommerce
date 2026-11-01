import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryShipmentRepository } from './infrastructure/repositories/InMemoryShipmentRepository';
import { InMemoryInventoryRepository } from './infrastructure/repositories/InMemoryInventoryRepository';
import { InMemorySupportCaseRepository } from './infrastructure/repositories/InMemorySupportCaseRepository';

import { GetShipmentDetailUseCase } from './application/use-cases/GetShipmentDetailUseCase';
import { SearchShipmentsUseCase } from './application/use-cases/SearchShipmentsUseCase';
import { UpdateShipmentStatusUseCase } from './application/use-cases/UpdateShipmentStatusUseCase';
import { ManualOverrideShipmentUseCase } from './application/use-cases/ManualOverrideShipmentUseCase';
import { GetFulfillmentSummaryUseCase } from './application/use-cases/GetFulfillmentSummaryUseCase';

import { GetSkuInventoryUseCase } from './application/use-cases/GetSkuInventoryUseCase';
import { AdjustInventoryUseCase } from './application/use-cases/AdjustInventoryUseCase';
import { ListSupportCasesUseCase } from './application/use-cases/ListSupportCasesUseCase';
import { ResolveSupportCaseUseCase } from './application/use-cases/ResolveSupportCaseUseCase';

import { ShipmentController } from './interfaces/http/controllers/ShipmentController';
import { InventoryController } from './interfaces/http/controllers/InventoryController';
import { SupportCaseController } from './interfaces/http/controllers/SupportCaseController';

import { createShipmentRoutes } from './interfaces/http/routes/ShipmentRoutes';
import { createInventoryRoutes } from './interfaces/http/routes/InventoryRoutes';
import { createSupportCaseRoutes } from './interfaces/http/routes/SupportCaseRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'fulfillment-service',
      boundedContext: 'Shipping, Inventory & Support (SRS 2.3, 2.6, 3.6)',
      port: process.env.PORT || process.env.FULFILLMENT_SERVICE_PORT || 4005,
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Repositories
  const shipmentRepository = new InMemoryShipmentRepository();
  const inventoryRepository = new InMemoryInventoryRepository();
  const supportCaseRepository = new InMemorySupportCaseRepository();

  // 2. Use Cases - Vận đơn (Shipments)
  const getShipmentDetailUseCase = new GetShipmentDetailUseCase(shipmentRepository);
  const searchShipmentsUseCase = new SearchShipmentsUseCase(shipmentRepository);
  const updateShipmentStatusUseCase = new UpdateShipmentStatusUseCase(shipmentRepository);
  const manualOverrideShipmentUseCase = new ManualOverrideShipmentUseCase(shipmentRepository);
  const getFulfillmentSummaryUseCase = new GetFulfillmentSummaryUseCase(shipmentRepository);

  // 3. Use Cases - Tồn kho (Inventory)
  const getSkuInventoryUseCase = new GetSkuInventoryUseCase(inventoryRepository);
  const adjustInventoryUseCase = new AdjustInventoryUseCase(inventoryRepository);

  // 4. Use Cases - Hồ sơ khiếu nại (Support Cases)
  const listSupportCasesUseCase = new ListSupportCasesUseCase(supportCaseRepository);
  const resolveSupportCaseUseCase = new ResolveSupportCaseUseCase(supportCaseRepository);

  // 5. Controllers
  const shipmentController = new ShipmentController(
    getShipmentDetailUseCase,
    searchShipmentsUseCase,
    updateShipmentStatusUseCase,
    manualOverrideShipmentUseCase,
    getFulfillmentSummaryUseCase,
  );
  const inventoryController = new InventoryController(
    getSkuInventoryUseCase,
    adjustInventoryUseCase,
  );
  const supportCaseController = new SupportCaseController(
    listSupportCasesUseCase,
    resolveSupportCaseUseCase,
  );

  // 6. Routes
  const shipmentRoutes = createShipmentRoutes(shipmentController);
  const inventoryRoutes = createInventoryRoutes(inventoryController);
  const supportCaseRoutes = createSupportCaseRoutes(supportCaseController);

  // Mount routes
  app.use('/api/v1/fulfillments/inventory', inventoryRoutes);
  app.use('/api/v1/fulfillments', shipmentRoutes);

  // Support Portal routes (Cases + Dashboard)
  app.use('/api/v1/support', supportCaseRoutes);
  app.use('/api/v1/support', shipmentRoutes);

  return app;
}
