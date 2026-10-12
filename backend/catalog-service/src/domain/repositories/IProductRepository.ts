import { Product } from '../entities/Product';

/**
 * Domain Port: IProductRepository
 * Cổng truy xuất dữ liệu sản phẩm của Catalog Service.
 */
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(limit?: number, offset?: number): Promise<Product[]>;
  findByCategory(categoryId: string): Promise<Product[]>;
  save(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
