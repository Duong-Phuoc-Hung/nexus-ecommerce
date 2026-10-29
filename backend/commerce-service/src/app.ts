import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryOrderRepository } from './infrastructure/repositories/InMemoryOrderRepository';
import { GetOrderDetailUseCase } from './application/use-cases/GetOrderDetailUseCase';
import { SearchOrdersUseCase } from './application/use-cases/SearchOrdersUseCase';
import { CancelOrderUseCase } from './application/use-cases/CancelOrderUseCase';
import { RefundOrderUseCase } from './application/use-cases/RefundOrderUseCase';
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

  const orderRepository = new InMemoryOrderRepository();
  const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepository);
  const searchOrdersUseCase = new SearchOrdersUseCase(orderRepository);
  const cancelOrderUseCase = new CancelOrderUseCase(orderRepository, getOrderDetailUseCase);
  const refundOrderUseCase = new RefundOrderUseCase(orderRepository, getOrderDetailUseCase);

  const orderController = new OrderController(
    getOrderDetailUseCase,
    searchOrdersUseCase,
    cancelOrderUseCase,
    refundOrderUseCase,
  );

  app.use('/api/v1', createCheckoutRoutes());
  app.use('/api/v1/orders', createOrderRoutes(orderController));

  return app;
}
