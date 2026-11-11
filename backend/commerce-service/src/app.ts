import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { IOrderRepository } from './domain/repositories/IOrderRepository';
import { InMemoryOrderRepository } from './infrastructure/repositories/InMemoryOrderRepository';
import { PostgresOrderRepository } from './infrastructure/repositories/PostgresOrderRepository';
import { PostgresCartRepository } from './infrastructure/repositories/PostgresCartRepository';
import { CartService } from './application/cart/CartService';
import { CartController } from './interfaces/http/controllers/CartController';
import { createCartRoutes } from './interfaces/http/routes/CartRoutes';
import { HttpCatalogClient } from './infrastructure/clients/HttpCatalogClient';
import { getCommerceDbPool } from './infrastructure/database/pgPool';
import { PrismaClientWrapper } from './infrastructure/database/PrismaClient';
import { GetOrderDetailUseCase } from './application/use-cases/GetOrderDetailUseCase';
import { SearchOrdersUseCase } from './application/use-cases/SearchOrdersUseCase';
import { CancelOrderUseCase } from './application/use-cases/CancelOrderUseCase';
import { RefundOrderUseCase } from './application/use-cases/RefundOrderUseCase';
import { RejectRefundUseCase } from './application/use-cases/RejectRefundUseCase';
import { DispatchOrderUseCase } from './application/use-cases/DispatchOrderUseCase';
import { RequestRefundUseCase } from './application/use-cases/RequestRefundUseCase';
import { ExecuteRefundUseCase } from './application/use-cases/ExecuteRefundUseCase';
import { GetRefundStatusUseCase } from './application/use-cases/GetRefundStatusUseCase';
import { OrderController } from './interfaces/http/controllers/OrderController';
import { createOrderRoutes } from './interfaces/http/routes/OrderRoutes';
import { createCheckoutRoutes } from './interfaces/http/routes/CheckoutRoutes';
import { GhnCarrierClient } from './infrastructure/clients/GhnCarrierClient';
import { PayOsGateway } from './infrastructure/clients/PayOsGateway';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Probes theo chuẩn DevOps Nexus
  app.get('/health', (_req: Request, res: Response) => {
    const autoSeed =
      process.env.ENABLE_AUTO_SEED === 'true' ||
      (process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test' &&
        process.env.ENABLE_AUTO_SEED !== 'false');

    res.status(200).json({
      status: 'UP',
      service: 'commerce-service',
      boundedContext: 'Cart, Orders & Payments (SRS 3.4)',
      persistence: process.env.USE_IN_MEMORY_DB === 'true' ? 'in-memory' : 'postgresql',
      autoSeed,
      port: process.env.PORT || process.env.COMMERCE_SERVICE_PORT || 4003,
      timestamp: new Date().toISOString(),
    });
  });

  // Dependency Injection: Chuyển đổi linh hoạt giữa PostgreSQL và InMemory (dành cho test/CI)
  let orderRepository: IOrderRepository;
  const pool = getCommerceDbPool();

  if (process.env.USE_IN_MEMORY_DB === 'true') {
    orderRepository = new InMemoryOrderRepository();
  } else {
    const prisma = PrismaClientWrapper.getInstance();
    const pgOrderRepo = new PostgresOrderRepository(pool, prisma);

    // Kiểm soát nạp dữ liệu mẫu (Auto-Seeding):
    // - Vô hiệu hóa hoàn toàn khi chạy Production hoặc khi đặt ENABLE_AUTO_SEED=false.
    // - Chỉ tự động nạp mồi trong môi trường Development khi chưa tắt cờ.
    const shouldAutoSeed =
      process.env.ENABLE_AUTO_SEED === 'true' ||
      (process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test' &&
        process.env.ENABLE_AUTO_SEED !== 'false');

    if (shouldAutoSeed) {
      pgOrderRepo.seedIfEmpty().catch((err: Error) => {
        console.warn('[CommerceService] Async seed check warning:', err.message);
      });
    }
    orderRepository = pgOrderRepo;
  }

  const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepository);
  const searchOrdersUseCase = new SearchOrdersUseCase(orderRepository);
  const cancelOrderUseCase = new CancelOrderUseCase(orderRepository, getOrderDetailUseCase);
  const refundOrderUseCase = new RefundOrderUseCase(orderRepository, getOrderDetailUseCase);
  const rejectRefundUseCase = new RejectRefundUseCase(orderRepository, getOrderDetailUseCase);
  const ghnCarrierClient = new GhnCarrierClient();
  const dispatchOrderUseCase = new DispatchOrderUseCase(
    orderRepository,
    getOrderDetailUseCase,
    ghnCarrierClient,
  );
  const requestRefundUseCase = new RequestRefundUseCase(orderRepository, getOrderDetailUseCase);
  const payOsGateway = new PayOsGateway();
  const executeRefundUseCase = new ExecuteRefundUseCase(orderRepository, payOsGateway);
  const getRefundStatusUseCase = new GetRefundStatusUseCase(orderRepository);

  const orderController = new OrderController(
    getOrderDetailUseCase,
    searchOrdersUseCase,
    cancelOrderUseCase,
    refundOrderUseCase,
    rejectRefundUseCase,
    dispatchOrderUseCase,
    requestRefundUseCase,
    executeRefundUseCase,
    getRefundStatusUseCase,
  );

  const catalogClient = new HttpCatalogClient();
  const cartRepository = new PostgresCartRepository(pool);
  const cartService = new CartService(cartRepository, catalogClient);
  const cartController = new CartController(cartService);

  app.use('/api/v1', createCheckoutRoutes(pool));
  app.use('/api/v1/cart', createCartRoutes(cartController));
  app.use('/api/v1/orders', createOrderRoutes(orderController));

  return app;
}
