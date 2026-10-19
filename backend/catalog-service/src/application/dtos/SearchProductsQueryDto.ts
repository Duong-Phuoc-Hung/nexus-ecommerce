export interface SearchProductsQueryDto {
  q: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
}
