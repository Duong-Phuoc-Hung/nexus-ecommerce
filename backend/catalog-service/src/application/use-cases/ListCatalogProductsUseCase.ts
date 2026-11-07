import { Product, ProductStatus } from '../../domain/entities/Product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';

export type CatalogScope = 'buyer' | 'admin';
export type CatalogSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc';

export interface ListCatalogProductsQuery {
  scope: CatalogScope;
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  status?: ProductStatus;
  saleType?: 'FIXED_PRICE' | 'AUCTION';
  sort: CatalogSort;
  page: number;
  limit: number;
}

export interface ListCatalogProductsResult {
  products: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Use Case: Danh sách sản phẩm cho Buyer (chỉ ACTIVE còn hàng) và Admin (mọi trạng thái).
 * Sử dụng trực tiếp IProductRepository chuẩn Clean Architecture.
 */
export class ListCatalogProductsUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(query: ListCatalogProductsQuery): Promise<ListCatalogProductsResult> {
    if (!this.productRepository.list) {
      throw new Error('ProductRepository chưa cấu hình phương thức list.');
    }
    return this.productRepository.list(query);
  }
}
