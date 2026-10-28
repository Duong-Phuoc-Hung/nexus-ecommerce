import { Product, ProductStatus } from '../../domain/entities/Product';

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

/** Nguồn dữ liệu đã lọc, sắp xếp và phân trang (bản Postgres làm việc này bằng SQL). */
export interface ICatalogQuery {
  list(query: ListCatalogProductsQuery): Promise<ListCatalogProductsResult>;
}

/**
 * Danh sách sản phẩm cho Buyer (chỉ ACTIVE còn hàng) và Admin (mọi trạng thái).
 * Không thay đổi luồng của Seller.
 */
export class ListCatalogProductsUseCase {
  constructor(private readonly catalogQuery: ICatalogQuery) {}

  public execute(query: ListCatalogProductsQuery): Promise<ListCatalogProductsResult> {
    return this.catalogQuery.list(query);
  }
}
