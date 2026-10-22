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

export interface ProductFilterCriteria {
  offset?: number;
  limit?: number;
  categoryId?: string;
  sellerId?: string;
  status?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  sort?: string;
}

export interface ProductListPage {
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
  findFiltered?(criteria: ProductFilterCriteria): Promise<ProductListPage>;
  findByCategory(categoryId: string): Promise<Product[]>;
  search(criteria: ProductSearchCriteria): Promise<ProductSearchPage>;
  save(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
