import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryProductRepository } from './infrastructure/repositories/InMemoryProductRepository';
import { GetProductDetailUseCase } from './application/use-cases/GetProductDetailUseCase';
import { ProductController } from './interfaces/http/controllers/ProductController';
import { createProductRoutes } from './interfaces/http/routes/ProductRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'catalog-service',
      boundedContext: 'Product Catalog (SRS 3.3)',
      port: process.env.PORT || process.env.CATALOG_SERVICE_PORT || 4002,
      timestamp: new Date().toISOString(),
    });
  });

  const productRepository = new InMemoryProductRepository();
  const getProductDetailUseCase = new GetProductDetailUseCase(productRepository);
  const productController = new ProductController(getProductDetailUseCase, productRepository);

  app.use('/api/v1/products', createProductRoutes(productController));

  return app;
}
