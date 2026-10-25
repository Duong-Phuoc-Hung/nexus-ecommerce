import { Order } from '../entities/Order';

export interface OrderSearchCriteria {
  q?: string;
  buyerId?: string;
  sellerId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderSearchPage {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByBuyerId(buyerId: string): Promise<Order[]>;
  search(criteria: OrderSearchCriteria): Promise<OrderSearchPage>;
  save(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
}
