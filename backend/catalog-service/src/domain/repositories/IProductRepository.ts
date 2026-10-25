import { Product } from '../entities/Product';

export interface ProductSearchCriteria {
  q: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  offset: number;
  limit: number;
}

export interface ProductSearchPage {
  products: Product[];
  total: number;
}

/**
 * Domain Port: IProductRepository
 * Cổng truy xuất dữ liệu sản phẩm của Catalog Service.
 */
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(limit?: number, offset?: number): Promise<Product[]>;
  findByCategory(categoryId: string): Promise<Product[]>;
  findBySellerId(sellerId: string, status?: string): Promise<Product[]>;
  search(criteria: ProductSearchCriteria): Promise<ProductSearchPage>;
  save(product: Product): Promise<string>;
  update(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
