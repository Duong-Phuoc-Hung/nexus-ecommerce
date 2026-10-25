import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { IProductRepository } from './domain/repositories/IProductRepository';
import { PostgresProductRepository } from './infrastructure/repositories/PostgresProductRepository';
import { InMemoryProductRepository } from './infrastructure/repositories/InMemoryProductRepository';
import { GetProductDetailUseCase } from './application/use-cases/GetProductDetailUseCase';
import { ProductController } from './interfaces/http/controllers/ProductController';
import { createProductRoutes } from './interfaces/http/routes/ProductRoutes';
import { SearchProductsUseCase } from './application/use-cases/SearchProductsUseCase';
import { CreateProductUseCase } from './application/use-cases/CreateProductUseCase';
import { UpdateProductUseCase } from './application/use-cases/UpdateProductUseCase';
import { DeleteProductUseCase } from './application/use-cases/DeleteProductUseCase';
import { GetSellerProductsUseCase } from './application/use-cases/GetSellerProductsUseCase';
import { CategoryController } from './interfaces/http/controllers/CategoryController';
import { createCategoryRoutes } from './interfaces/http/routes/CategoryRoutes';
import { ICategoryRepository } from './domain/repositories/ICategoryRepository';
import { PostgresCategoryRepository } from './infrastructure/repositories/PostgresCategoryRepository';
import { InMemoryCategoryRepository } from './infrastructure/repositories/InMemoryCategoryRepository';

export interface CatalogAppOptions {
  productRepository?: IProductRepository;
  categoryRepository?: Partial<ICategoryRepository>;
}

export function createApplication(options: CatalogAppOptions = {}): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check endpoint
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

  // DANH MỤC (CATEGORY):
  const defaultCategoryRepo = isTest
    ? new InMemoryCategoryRepository()
    : new PostgresCategoryRepository();

  const categoryRepository: ICategoryRepository = options.categoryRepository
    ? {
        findActive: () =>
          options.categoryRepository!.findActive
            ? options.categoryRepository!.findActive()
            : defaultCategoryRepo.findActive(),
        findAllActive: () =>
          options.categoryRepository!.findAllActive
            ? options.categoryRepository!.findAllActive()
            : defaultCategoryRepo.findAllActive(),
        findById: (id: string) =>
          options.categoryRepository!.findById
            ? options.categoryRepository!.findById(id)
            : defaultCategoryRepo.findById(id),
      }
    : defaultCategoryRepo;

  const categoryController = new CategoryController(categoryRepository);

  // SẢN PHẨM (PRODUCT):
  const productRepository =
    options.productRepository ||
    (isTest ? new InMemoryProductRepository() : new PostgresProductRepository());

  const getProductDetailUseCase = new GetProductDetailUseCase(productRepository);
  const searchProductsUseCase = new SearchProductsUseCase(productRepository);
  const createProductUseCase = new CreateProductUseCase(productRepository, categoryRepository);
  const updateProductUseCase = new UpdateProductUseCase(productRepository, categoryRepository);
  const deleteProductUseCase = new DeleteProductUseCase(productRepository);
  const getSellerProductsUseCase = new GetSellerProductsUseCase(productRepository);

  const productController = new ProductController(
    getProductDetailUseCase,
    productRepository,
    searchProductsUseCase,
    createProductUseCase,
    updateProductUseCase,
    deleteProductUseCase,
    getSellerProductsUseCase,
  );

  app.use('/api/v1/categories', createCategoryRoutes(categoryController));
  app.use('/api/v1/products', createProductRoutes(productController));

  return app;
}
