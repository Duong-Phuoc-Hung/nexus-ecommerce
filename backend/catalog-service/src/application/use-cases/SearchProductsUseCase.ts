import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product } from '../../domain/entities/Product';
import { SearchProductsQueryDto } from '../dtos/SearchProductsQueryDto';

export interface SearchProductsResult {
  products: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class SearchProductsUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  public async execute(query: SearchProductsQueryDto): Promise<SearchProductsResult> {
    const offset = (query.page - 1) * query.limit;
    const result = await this.productRepository.search({
      q: query.q,
      categoryId: query.categoryId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      condition: query.condition,
      status: query.status,
      visibility: query.visibility,
      sort: query.sort,
      offset,
      limit: query.limit,
    });

    return {
      products: result.products,
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  }
}
