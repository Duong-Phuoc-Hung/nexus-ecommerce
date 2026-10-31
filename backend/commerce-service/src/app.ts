import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { PostgresOrderRepository } from './infrastructure/repositories/PostgresOrderRepository';
import { GetOrderDetailUseCase } from './application/use-cases/GetOrderDetailUseCase';
import { SearchOrdersUseCase } from './application/use-cases/SearchOrdersUseCase';
import { CancelOrderUseCase } from './application/use-cases/CancelOrderUseCase';
import { RefundOrderUseCase } from './application/use-cases/RefundOrderUseCase';
import { RejectRefundUseCase } from './application/use-cases/RejectRefundUseCase';
import { OrderController } from './interfaces/http/controllers/OrderController';
import { createOrderRoutes } from './interfaces/http/routes/OrderRoutes';
import { createCheckoutRoutes } from './interfaces/http/routes/CheckoutRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'commerce-service',
      boundedContext: 'Cart, Orders & Payments (SRS 3.4)',
      port: process.env.PORT || process.env.COMMERCE_SERVICE_PORT || 4003,
      timestamp: new Date().toISOString(),
    });
  });

  // Khởi tạo PostgreSQL connection pool cho Commerce Bounded Context (Port 5434)
  const pool = new Pool({
    host: process.env.COMMERCE_DB_HOST || '127.0.0.1',
    port: Number(process.env.COMMERCE_DB_PORT) || 5434,
    user: process.env.COMMERCE_DB_USER || 'nexus_commerce',
    password: process.env.COMMERCE_DB_PASSWORD || 'nexus_password',
    database: process.env.COMMERCE_DB_NAME || 'nexus_commerce_db',
  });

  const orderRepository = new PostgresOrderRepository(pool);
  const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepository);
  const searchOrdersUseCase = new SearchOrdersUseCase(orderRepository);
  const cancelOrderUseCase = new CancelOrderUseCase(orderRepository, getOrderDetailUseCase);
  const refundOrderUseCase = new RefundOrderUseCase(orderRepository, getOrderDetailUseCase);
  const rejectRefundUseCase = new RejectRefundUseCase(orderRepository, getOrderDetailUseCase);

  const orderController = new OrderController(
    getOrderDetailUseCase,
    searchOrdersUseCase,
    cancelOrderUseCase,
    refundOrderUseCase,
    rejectRefundUseCase,
  );

  app.use('/api/v1', createCheckoutRoutes());
  app.use('/api/v1/orders', createOrderRoutes(orderController));

  return app;
}
