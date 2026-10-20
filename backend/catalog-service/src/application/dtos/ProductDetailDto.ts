export interface ProductDetailDto {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stockQuantity: number;
  status: string;
  createdAt: string;
  images?: string[];
  primaryImage?: string;
  attributes?: Record<string, string>;
  condition?: string;
  slug?: string;
  allowAuction?: boolean;
}
