import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryOrderRepository } from './infrastructure/repositories/InMemoryOrderRepository';
import { GetOrderDetailUseCase } from './application/use-cases/GetOrderDetailUseCase';
import { OrderController } from './interfaces/http/controllers/OrderController';
import { createOrderRoutes } from './interfaces/http/routes/OrderRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'commerce-service',
      boundedContext: 'Cart, Orders & Payments (SRS 3.4)',
      port: process.env.COMMERCE_SERVICE_PORT || 3003,
      timestamp: new Date().toISOString(),
    });
  });

  const orderRepository = new InMemoryOrderRepository();
  const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepository);
  const orderController = new OrderController(getOrderDetailUseCase);

  app.use('/api/v1/orders', createOrderRoutes(orderController));

  return app;
}
