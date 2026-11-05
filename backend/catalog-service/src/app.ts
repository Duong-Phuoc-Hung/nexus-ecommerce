import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { PostgresProductRepository } from './infrastructure/repositories/PostgresProductRepository';
import { InMemoryProductRepository } from './infrastructure/repositories/InMemoryProductRepository';
import { GetProductDetailUseCase } from './application/use-cases/GetProductDetailUseCase';
import { ProductController } from './interfaces/http/controllers/ProductController';
import { createProductRoutes } from './interfaces/http/routes/ProductRoutes';
import { HttpSellerDirectory } from './infrastructure/clients/HttpSellerDirectory';
import { SearchProductsUseCase } from './application/use-cases/SearchProductsUseCase';
import { CreateProductUseCase } from './application/use-cases/CreateProductUseCase';
import { UpdateProductUseCase } from './application/use-cases/UpdateProductUseCase';
import { DeleteProductUseCase } from './application/use-cases/DeleteProductUseCase';
import { GetSellerProductsUseCase } from './application/use-cases/GetSellerProductsUseCase';
import { RecoverProductUseCase } from './application/use-cases/RecoverProductUseCase';
import { ListCatalogProductsUseCase } from './application/use-cases/ListCatalogProductsUseCase';

import { PostgresCategoryRepository } from './infrastructure/repositories/PostgresCategoryRepository';
import { InMemoryCategoryRepository } from './infrastructure/repositories/InMemoryCategoryRepository';
import { GetCategoriesUseCase } from './application/use-cases/GetCategoriesUseCase';
import { CategoryController } from './interfaces/http/controllers/CategoryController';
import { createCategoryRoutes } from './interfaces/http/routes/CategoryRoutes';

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

  const isTest = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY === 'true';

  // DANH MỤC (CATEGORY):
  const categoryRepository = isTest
    ? new InMemoryCategoryRepository()
    : new PostgresCategoryRepository();
  const getCategoriesUseCase = new GetCategoriesUseCase(categoryRepository);
  const categoryController = new CategoryController(getCategoriesUseCase);

  app.use('/api/v1/categories', createCategoryRoutes(categoryController));

  // SẢN PHẨM (PRODUCT):
  const productRepository = isTest
    ? new InMemoryProductRepository()
    : new PostgresProductRepository();
  const getProductDetailUseCase = new GetProductDetailUseCase(productRepository);
  const searchProductsUseCase = new SearchProductsUseCase(productRepository);
  const createProductUseCase = new CreateProductUseCase(productRepository, categoryRepository);
  const updateProductUseCase = new UpdateProductUseCase(productRepository, categoryRepository);
  const deleteProductUseCase = new DeleteProductUseCase(productRepository);
  const getSellerProductsUseCase = new GetSellerProductsUseCase(productRepository);
  const recoverProductUseCase = new RecoverProductUseCase(productRepository);
  const listCatalogProductsUseCase = new ListCatalogProductsUseCase(productRepository);
  const sellerDirectory = new HttpSellerDirectory();

  const productController = new ProductController(
    getProductDetailUseCase,
    productRepository,
    searchProductsUseCase,
    createProductUseCase,
    updateProductUseCase,
    deleteProductUseCase,
    getSellerProductsUseCase,
    recoverProductUseCase,
    sellerDirectory,
    listCatalogProductsUseCase,
  );

  app.use('/api/v1/products', createProductRoutes(productController));

  return app;
}
