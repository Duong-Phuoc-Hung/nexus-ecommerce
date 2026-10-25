import {
  IOrderRepository,
  OrderSearchCriteria,
  OrderSearchPage,
} from '../../domain/repositories/IOrderRepository';
import { Order, OrderStatus } from '../../domain/entities/Order';

export class InMemoryOrderRepository implements IOrderRepository {
  private readonly orders: Map<string, Order> = new Map();

  constructor() {
    const now = new Date();

    const order1 = new Order({
      id: 'NX-ORD-8021',
      buyerId: 'usr_01hqz789abc',
      buyerName: 'Minh Anh',
      buyerEmail: 'minhanh@example.com',
      sellerId: 'usr_seller_001',
      sellerName: 'Nexus Audio',
      items: [
        {
          productId: 'prod_nexus_air',
          productName: 'Tai nghe không dây Nexus Air',
          quantity: 1,
          unitPrice: 1290000,
          totalPrice: 1290000,
        },
      ],
      totalAmount: 1290000,
      status: OrderStatus.PROCESSING,
      paymentTransactionId: 'pi_8021_demo_cod',
      trackingCode: 'GHN8829103VN',
      createdAt: new Date(now.getTime() - 86400000 * 5),
      updatedAt: new Date(now.getTime() - 86400000 * 5),
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 5),
        },
        {
          status: 'PAID',
          title: 'Đã xác nhận thanh toán',
          timestamp: new Date(now.getTime() - 86400000 * 5 + 120000),
        },
        {
          status: 'PROCESSING',
          title: 'Chờ người bán xử lý',
          timestamp: new Date(now.getTime() - 86400000 * 4),
        },
      ],
    });
    this.orders.set(order1.id, order1);

    const order2 = new Order({
      id: 'NX-ORD-8017',
      buyerId: 'usr_01hqz789def',
      buyerName: 'Quốc Bảo',
      buyerEmail: 'quocbao@example.com',
      sellerId: 'usr_seller_002',
      sellerName: 'Retro Lab',
      items: [
        {
          productId: 'prod_retro_35',
          productName: 'Máy ảnh film Retro 35',
          quantity: 1,
          unitPrice: 2450000,
          totalPrice: 2450000,
        },
      ],
      totalAmount: 2450000,
      status: OrderStatus.SHIPPED,
      paymentTransactionId: 'pi_8017_demo_card',
      trackingCode: 'GHTK5908112',
      createdAt: new Date(now.getTime() - 86400000 * 6),
      updatedAt: new Date(now.getTime() - 86400000 * 5),
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 6),
        },
        {
          status: 'PAID',
          title: 'Đã xác nhận thanh toán',
          timestamp: new Date(now.getTime() - 86400000 * 6 + 180000),
        },
        {
          status: 'SHIPPED',
          title: 'Đã bàn giao vận chuyển cho GHTK',
          timestamp: new Date(now.getTime() - 86400000 * 5),
        },
      ],
    });
    this.orders.set(order2.id, order2);

    const order3 = new Order({
      id: 'NX-ORD-8009',
      buyerId: 'usr_01hqz789ghi',
      buyerName: 'Thu Hà',
      buyerEmail: 'thuha@example.com',
      sellerId: 'usr_seller_003',
      sellerName: 'Nexus Sport',
      items: [
        {
          productId: 'prod_sport_s2',
          productName: 'Đồng hồ thể thao S2',
          quantity: 1,
          unitPrice: 890000,
          totalPrice: 890000,
        },
      ],
      totalAmount: 890000,
      status: OrderStatus.DELIVERED,
      paymentTransactionId: 'pi_8009_demo_vnpay',
      trackingCode: 'VTP22100831',
      createdAt: new Date(now.getTime() - 86400000 * 7),
      updatedAt: new Date(now.getTime() - 86400000 * 6),
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 7),
        },
        {
          status: 'PAID',
          title: 'Đã xác nhận thanh toán',
          timestamp: new Date(now.getTime() - 86400000 * 7 + 60000),
        },
        {
          status: 'DELIVERED',
          title: 'Giao hàng hoàn tất thành công',
          timestamp: new Date(now.getTime() - 86400000 * 6),
        },
      ],
    });
    this.orders.set(order3.id, order3);

    const order4 = new Order({
      id: 'NX-ORD-7998',
      buyerId: 'usr_01hqz789jkl',
      buyerName: 'Gia Huy',
      buyerEmail: 'giahuy@example.com',
      sellerId: 'usr_seller_004',
      sellerName: 'Home & Co.',
      items: [
        {
          productId: 'prod_lamp_nordic',
          productName: 'Đèn bàn tối giản',
          quantity: 1,
          unitPrice: 480000,
          totalPrice: 480000,
        },
      ],
      totalAmount: 480000,
      status: OrderStatus.CANCELLED,
      paymentTransactionId: 'pi_7998_cancelled',
      trackingCode: '—',
      createdAt: new Date(now.getTime() - 86400000 * 8),
      updatedAt: new Date(now.getTime() - 86400000 * 7),
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo',
          timestamp: new Date(now.getTime() - 86400000 * 8),
        },
        {
          status: 'CANCELLED',
          title: 'Đã hủy đơn hàng theo yêu cầu khách hàng',
          timestamp: new Date(now.getTime() - 86400000 * 7),
        },
      ],
    });
    this.orders.set(order4.id, order4);

    const sampleOrder = new Order({
      id: 'ord_01hqz555abc',
      buyerId: 'usr_01hqz789abc',
      buyerName: 'Nguyen Van Buyer',
      buyerEmail: 'buyer.test@nexus-ecommerce.com',
      sellerId: 'usr_01hqz333sel',
      sellerName: 'Nexus Official Store',
      items: [
        {
          productId: 'prod_01hqz999xyz',
          productName: 'Nexus Pro Audio Wireless',
          quantity: 1,
          unitPrice: 399.99,
          totalPrice: 399.99,
        },
      ],
      totalAmount: 399.99,
      status: OrderStatus.PAID,
      paymentTransactionId: 'pi_3MtwxAEhyASWD2Re1fA5sample',
      trackingCode: 'GHN112233VN',
      createdAt: now,
      updatedAt: now,
    });
    this.orders.set(sampleOrder.id, sampleOrder);
  }

  public async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  public async findByBuyerId(buyerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.buyerId === buyerId);
  }

  public async search(criteria: OrderSearchCriteria): Promise<OrderSearchPage> {
    let list = Array.from(this.orders.values());

    // 1. Lọc theo từ khóa tìm kiếm q (id, buyerName, buyerEmail, sellerName, productName, trackingCode)
    if (criteria.q && criteria.q.trim().length > 0) {
      const qLower = criteria.q.trim().toLowerCase();
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

    // 4. Lọc theo Status
    if (criteria.status && criteria.status.trim().length > 0) {
      const statusUpper = criteria.status.trim().toUpperCase();
      list = list.filter((o) => o.status.toUpperCase() === statusUpper);
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
