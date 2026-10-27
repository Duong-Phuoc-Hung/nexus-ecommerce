export interface SearchProductsQueryDto {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  status?: string;
  visibility: 'PUBLIC' | 'ADMIN';
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
  page: number;
  limit: number;
}
