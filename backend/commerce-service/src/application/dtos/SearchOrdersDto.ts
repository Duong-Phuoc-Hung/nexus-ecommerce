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

export interface OrderItemSummaryDto {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderTimelineItemDto {
  status: string;
  title: string;
  description?: string;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface OrderSearchItemDto {
  id: string;
  orderCode?: string;
  buyer: string; // Tương thích FE: order.buyer
  buyerId?: string;
  email: string; // Tương thích FE: order.email
  seller: string; // Tương thích FE: order.seller
  sellerId?: string;
  product: string; // Tương thích FE: order.product
  date: string; // Tương thích FE: order.date
  total: number; // Tương thích FE: order.total
  totalAmount: number; // Chuẩn DDD
  status: string;
  tracking: string; // Tương thích FE: order.tracking
  trackingCode?: string;
  itemsCount: number;
  items?: OrderItemSummaryDto[];
  timeline?: OrderTimelineItemDto[];
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
