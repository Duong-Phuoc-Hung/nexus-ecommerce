import { IProductRepository } from '../../domain/repositories/IProductRepository';
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

const FETCH_ALL = 100000;

/**
 * Danh sách sản phẩm cho Buyer (chỉ ACTIVE còn hàng) và Admin (mọi trạng thái).
 * Chỉ đọc qua IProductRepository.findAll, không thay đổi luồng của Seller.
 */
export class ListCatalogProductsUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(query: ListCatalogProductsQuery): Promise<ListCatalogProductsResult> {
    const all = await this.productRepository.findAll(FETCH_ALL, 0);
    const keyword = query.q?.trim().toLowerCase();

    const filtered = all.filter((product) => {
      if (query.scope === 'buyer') {
        if (product.status !== ProductStatus.ACTIVE || product.stockQuantity <= 0) return false;
      } else if (query.status && product.status !== query.status) {
        return false;
      }
      if (query.categoryId && product.categoryId !== query.categoryId) return false;
      if (query.minPrice !== undefined && product.price < query.minPrice) return false;
      if (query.maxPrice !== undefined && product.price > query.maxPrice) return false;
      if (query.condition && product.condition !== query.condition) return false;
      if (query.saleType && product.saleType !== query.saleType) return false;
      if (
        keyword &&
        !product.title.toLowerCase().includes(keyword) &&
        !(product.description || '').toLowerCase().includes(keyword)
      ) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (query.sort) {
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    const offset = (query.page - 1) * query.limit;
    return {
      products: filtered.slice(offset, offset + query.limit),
      meta: {
        page: query.page,
        limit: query.limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / query.limit),
      },
    };
  }
}
