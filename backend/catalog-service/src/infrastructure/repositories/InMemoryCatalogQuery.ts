import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductStatus } from '../../domain/entities/Product';
import {
  ICatalogQuery,
  ListCatalogProductsQuery,
  ListCatalogProductsResult,
} from '../../application/use-cases/ListCatalogProductsUseCase';

const FETCH_ALL = 100000;

/** Dùng cho chế độ in-memory/test; môi trường có Postgres dùng PostgresCatalogQuery. */
export class InMemoryCatalogQuery implements ICatalogQuery {
  constructor(private readonly productRepository: IProductRepository) {}

  public async list(query: ListCatalogProductsQuery): Promise<ListCatalogProductsResult> {
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
