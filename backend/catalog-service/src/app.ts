import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { PostgresProductRepository } from './infrastructure/repositories/PostgresProductRepository';
import { InMemoryProductRepository } from './infrastructure/repositories/InMemoryProductRepository';
import { PostgresCategoryRepository } from './infrastructure/repositories/PostgresCategoryRepository';
import { InMemoryCategoryRepository } from './infrastructure/repositories/InMemoryCategoryRepository';
import { IProductRepository } from './domain/repositories/IProductRepository';
import { ICategoryRepository } from './domain/repositories/ICategoryRepository';
import { GetProductDetailUseCase } from './application/use-cases/GetProductDetailUseCase';
import { SearchProductsUseCase } from './application/use-cases/SearchProductsUseCase';
import { CreateProductUseCase } from './application/use-cases/CreateProductUseCase';
import { UpdateProductUseCase } from './application/use-cases/UpdateProductUseCase';
import { GetCategoriesUseCase } from './application/use-cases/GetCategoriesUseCase';
import { ProductController } from './interfaces/http/controllers/ProductController';
import { CategoryController } from './interfaces/http/controllers/CategoryController';
import { createProductRoutes } from './interfaces/http/routes/ProductRoutes';
import { createCategoryRoutes } from './interfaces/http/routes/CategoryRoutes';

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
      boundedContext: 'Product Catalog & Categories (SRS 3.3)',
      port: process.env.PORT || process.env.CATALOG_SERVICE_PORT || 4002,
      timestamp: new Date().toISOString(),
    });
  });

  const isTest = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY === 'true';

  const productRepository =
    options.productRepository ||
    (isTest ? new InMemoryProductRepository() : new PostgresProductRepository());

  const categoryRepository =
    options.categoryRepository ||
    (isTest ? new InMemoryCategoryRepository() : new PostgresCategoryRepository());

  // Use Cases
  const getProductDetailUseCase = new GetProductDetailUseCase(productRepository);
  const searchProductsUseCase = new SearchProductsUseCase(productRepository);
  const createProductUseCase = new CreateProductUseCase(productRepository, categoryRepository);
  const updateProductUseCase = new UpdateProductUseCase(productRepository, categoryRepository);
  const getCategoriesUseCase = new GetCategoriesUseCase(categoryRepository);

  // Controllers
  const productController = new ProductController(
    getProductDetailUseCase,
    productRepository,
    searchProductsUseCase,
    createProductUseCase,
    updateProductUseCase,
  );

  const categoryController = new CategoryController(getCategoriesUseCase, categoryRepository);

  // Mount Routes
  app.use('/api/v1/products', createProductRoutes(productController));
  app.use('/api/v1/categories', createCategoryRoutes(categoryController));

  return app;
}
