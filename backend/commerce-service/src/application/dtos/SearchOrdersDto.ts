export interface SearchOrdersQueryDto {
  q?: string;
  buyerId?: string;
  sellerId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderSearchItemDto {
  id: string;
  buyer: string; // Tương thích FE: order.buyer
  email: string; // Tương thích FE: order.email
  seller: string; // Tương thích FE: order.seller
  product: string; // Tương thích FE: order.product
  date: string; // Tương thích FE: order.date
  total: number; // Tương thích FE: order.total
  totalAmount: number; // Chuẩn DDD
  status: string;
  tracking: string; // Tương thích FE: order.tracking
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchOrdersPaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchOrdersResultDto {
  items: OrderSearchItemDto[];
  pagination: SearchOrdersPaginationDto;
}
