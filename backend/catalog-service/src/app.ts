import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { PostgresProductRepository } from './infrastructure/repositories/PostgresProductRepository';
import { InMemoryProductRepository } from './infrastructure/repositories/InMemoryProductRepository';
import { IProductRepository } from './domain/repositories/IProductRepository';
import { GetProductDetailUseCase } from './application/use-cases/GetProductDetailUseCase';
import { ProductController } from './interfaces/http/controllers/ProductController';
import { createProductRoutes } from './interfaces/http/routes/ProductRoutes';
import { SearchProductsUseCase } from './application/use-cases/SearchProductsUseCase';
import { CategoryController } from './interfaces/http/controllers/CategoryController';
import { createCategoryRoutes } from './interfaces/http/routes/CategoryRoutes';
import { ICategoryRepository } from './domain/repositories/ICategoryRepository';
import { PostgresCategoryRepository } from './infrastructure/repositories/PostgresCategoryRepository';

export interface CatalogAppOptions {
  productRepository?: IProductRepository;
  categoryRepository?: ICategoryRepository;
}

export function createApplication(options: CatalogAppOptions = {}): Application {
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

  const isTest = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY === 'true';

  const productRepository =
    options.productRepository ||
    (isTest ? new InMemoryProductRepository() : new PostgresProductRepository());
  const getProductDetailUseCase = new GetProductDetailUseCase(productRepository);
  const searchProductsUseCase = new SearchProductsUseCase(productRepository);
  const productController = new ProductController(
    getProductDetailUseCase,
    productRepository,
    searchProductsUseCase,
  );
  const categoryController = new CategoryController(
    options.categoryRepository || new PostgresCategoryRepository(),
  );

  app.use('/api/v1/products', createProductRoutes(productController));
  app.use('/api/v1/categories', createCategoryRoutes(categoryController));

  return app;
}
