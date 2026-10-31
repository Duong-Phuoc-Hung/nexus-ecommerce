import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { PostgresOrderRepository } from './infrastructure/repositories/PostgresOrderRepository';
import { PostgresCartRepository } from './infrastructure/repositories/PostgresCartRepository';
import { CartService } from './application/cart/CartService';
import { CartController } from './interfaces/http/controllers/CartController';
import { createCartRoutes } from './interfaces/http/routes/CartRoutes';
import { HttpCatalogClient } from './infrastructure/clients/HttpCatalogClient';
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

  const pool = new Pool({
    host: process.env.COMMERCE_DB_HOST || 'localhost',
    port: Number(process.env.COMMERCE_DB_PORT) || 5434,
    user: process.env.COMMERCE_DB_USER || 'nexus_commerce',
    password: process.env.COMMERCE_DB_PASSWORD || 'nexus_password',
    database: process.env.COMMERCE_DB_NAME || 'nexus_commerce_db',
  });

  // [LƯU Ý DÙNG CHUNG CHO TOÀN BỘ SERVICE]:
  // Đã chuyển sang PostgresOrderRepository để lưu trữ đơn hàng bền vững trong PostgreSQL
  // cho cả Buyer và Support Staff/Seller (thay vì mock RAM). Chi tiết xem docs/be-commerce-shared-changes-note.md
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

  const catalogClient = new HttpCatalogClient();
  const cartRepository = new PostgresCartRepository(pool);
  const cartService = new CartService(cartRepository, catalogClient);
  const cartController = new CartController(cartService);

  app.use('/api/v1', createCheckoutRoutes(pool));
  app.use('/api/v1/cart', createCartRoutes(cartController));
  app.use('/api/v1/orders', createOrderRoutes(orderController));

  return app;
}
