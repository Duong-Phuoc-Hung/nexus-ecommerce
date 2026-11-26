import {
  IOrderRepository,
  OrderSearchCriteria,
  OrderSearchPage,
} from '../../domain/repositories/IOrderRepository';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { loadSeedOrders } from '../seeds/orderSeedLoader';

export class InMemoryOrderRepository implements IOrderRepository {
  private readonly orders: Map<string, Order> = new Map();

  constructor() {
    const seedOrders = loadSeedOrders();
    for (const order of seedOrders) {
      this.orders.set(order.id, order);
    }
  }

  public async findById(id: string): Promise<Order | null> {
    const rawClean = (id || '').trim();
    const cleanId = rawClean.replace(/^[#]/, '').trim();
    if (this.orders.has(cleanId)) {
      return this.orders.get(cleanId) || null;
    }
    if (this.orders.has(rawClean)) {
      return this.orders.get(rawClean) || null;
    }
    for (const order of this.orders.values()) {
      if (order.id.toLowerCase() === cleanId.toLowerCase()) {
        return order;
      }
    }
    return null;
  }

  public async findByBuyerId(buyerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.buyerId === buyerId);
  }

  public async search(criteria: OrderSearchCriteria): Promise<OrderSearchPage> {
    let list = Array.from(this.orders.values());

    // 1. Lọc theo từ khóa tìm kiếm q (id, buyerName, buyerEmail, sellerName, productName, trackingCode)
    if (criteria.q && criteria.q.trim().length > 0) {
      const qLower = criteria.q.replace(/^[#]/, '').trim().toLowerCase();
      list = list.filter((order) => {
        const productNames = order.items.map((i) => i.productName || '').join(' ');
        const searchTarget =
          `${order.id} ${order.buyerName} ${order.buyerEmail} ${order.sellerName} ${productNames} ${order.trackingCode || ''}`.toLowerCase();
        return searchTarget.includes(qLower);
      });
    }

    // 2. Lọc theo Buyer ID
    if (criteria.buyerId) {
      list = list.filter((o) => o.buyerId === criteria.buyerId);
    }

    // 3. Lọc theo Seller ID
    if (criteria.sellerId) {
      list = list.filter((o) => o.sellerId === criteria.sellerId);
    }

    // 4. Lọc theo Status (hỗ trợ cả 1 trạng thái hoặc nhóm trạng thái phân cách dấu phẩy)
    if (criteria.status && criteria.status.trim().length > 0) {
      const statuses = new Set(
        criteria.status
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      );
      if (statuses.size > 0) {
        list = list.filter((o) => statuses.has(o.status.toUpperCase()));
      }
    }

    // 4b. Lọc theo khoảng ngày tạo đơn (server-side trước khi phân trang)
    if (criteria.fromDate) {
      const start = new Date(
        criteria.fromDate.includes('T') ? criteria.fromDate : `${criteria.fromDate}T00:00:00.000Z`,
      );
      if (!Number.isNaN(start.getTime())) {
        list = list.filter((o) => o.createdAt.getTime() >= start.getTime());
      }
    }
    if (criteria.toDate) {
      const end = new Date(
        criteria.toDate.includes('T') ? criteria.toDate : `${criteria.toDate}T23:59:59.999Z`,
      );
      if (!Number.isNaN(end.getTime())) {
        list = list.filter((o) => o.createdAt.getTime() <= end.getTime());
      }
    }

    // 5. Sắp xếp (Sorting)
    const sortBy = criteria.sortBy || 'createdAt';
    const sortOrder = criteria.sortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return comparison * sortOrder;
    });

    // 6. Phân trang (Pagination)
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedOrders = list.slice(startIndex, startIndex + limit);

    return {
      orders: paginatedOrders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  public async update(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }
}
