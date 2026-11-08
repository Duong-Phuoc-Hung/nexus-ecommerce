import { Pool } from 'pg';
import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  IOrderRepository,
  OrderSearchCriteria,
  OrderSearchPage,
} from '../../domain/repositories/IOrderRepository';
import { Order, OrderItem, OrderStatus, OrderTimelineItem } from '../../domain/entities/Order';
import { loadSeedOrders } from '../seeds/orderSeedLoader';

export class PostgresOrderRepository implements IOrderRepository {
  private _prisma?: PrismaClient;
  private isInitialized = false;

  constructor(
    private readonly pool?: Pool,
    prisma?: PrismaClient,
  ) {
    if (prisma) {
      this._prisma = prisma;
    }
  }

  private get prisma(): PrismaClient {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
  }

  /**
   * Nạp dữ liệu mẫu ban đầu nếu bảng rỗng qua Prisma ORM.
   */
  public async seedIfEmpty(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const orderCount = await this.prisma.order.count();
      if (orderCount === 0) {
        await this.seedInitialOrders();
      }
    } catch (err) {
      console.warn('[PostgresOrderRepository] Seed check warning:', (err as Error).message);
    }
  }

  public async findById(id: string): Promise<Order | null> {
    const cleanId = id.trim();

    const orderRow = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: cleanId }, { orderCode: cleanId }],
      },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!orderRow) {
      return null;
    }

    return this.mapPrismaToDomain(orderRow);
  }

  public async findByBuyerId(buyerId: string): Promise<Order[]> {
    const cleanBuyerId = buyerId.trim();

    const rows = await this.prisma.order.findMany({
      where: { buyerId: cleanBuyerId },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => this.mapPrismaToDomain(r));
  }

  public async search(criteria: OrderSearchCriteria): Promise<OrderSearchPage> {
    const where: any = {};

    // 1. Lọc theo Buyer ID (IDOR-safe)
    if (criteria.buyerId && criteria.buyerId.trim().length > 0) {
      where.buyerId = criteria.buyerId.trim();
    }

    // 2. Lọc theo Seller ID (IDOR-safe)
    if (criteria.sellerId && criteria.sellerId.trim().length > 0) {
      where.sellerId = criteria.sellerId.trim();
    }

    // 3. Lọc theo Status
    if (criteria.status && criteria.status.trim().length > 0) {
      where.status = { equals: criteria.status.trim(), mode: 'insensitive' };
    }

    // 4. Lọc từ khóa tìm kiếm toàn diện
    if (criteria.q && criteria.q.trim().length > 0) {
      const q = criteria.q.trim();
      where.OR = [
        { orderCode: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
        { trackingCode: { contains: q, mode: 'insensitive' } },
        { items: { some: { productTitle: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    // 5. Sắp xếp
    let orderBy: any = { createdAt: 'desc' };
    const sortDirection = criteria.sortOrder === 'asc' ? 'asc' : 'desc';
    if (criteria.sortBy === 'totalAmount') {
      orderBy = { totalAmount: sortDirection };
    } else if (criteria.sortBy === 'status') {
      orderBy = { status: sortDirection };
    } else {
      orderBy = { createdAt: sortDirection };
    }

    // 6. Phân trang
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const offset = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            orderBy: { id: 'asc' },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const orders = rows.map((r) => this.mapPrismaToDomain(r));

    return {
      orders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(order: Order): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const shippingAddressJson = JSON.stringify(order.shippingAddress || {});
      const lookupCode = order.id.startsWith('NX-ORD') ? order.id : `NX-ORD-${order.id}`;

      const upserted = await tx.order.upsert({
        where: { orderCode: lookupCode },
        update: {
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          totalAmount: order.totalAmount,
          status: order.status,
          shippingAddress: shippingAddressJson as any,
          trackingCode: order.trackingCode || null,
          timeline: order.timeline as any,
          updatedAt: order.updatedAt,
        },
        create: {
          id: order.id,
          orderCode: order.id.startsWith('NX-ORD') ? order.id : `NX-ORD-${Date.now()}`,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          totalAmount: order.totalAmount,
          shippingFee: order.shippingFee || 0,
          discountAmount: order.discountAmount || 0,
          status: order.status,
          shippingAddress: shippingAddressJson as any,
          trackingCode: order.trackingCode || null,
          timeline: order.timeline as any,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      });

      // Xóa và ghi lại danh sách Order Items
      await tx.orderItem.deleteMany({
        where: { orderId: upserted.id },
      });

      if (order.items.length > 0) {
        await tx.orderItem.createMany({
          data: order.items.map((item) => {
            const rawId = String(item.productId || '').replace(/\D/g, '');
            const parsedProductId = rawId.length > 0 ? BigInt(rawId) : BigInt(1);
            return {
              orderId: upserted.id,
              productId: parsedProductId,
              productTitle: item.productName || 'Sản phẩm Nexus',
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.totalPrice,
            };
          }),
        });
      }
    });
  }

  public async update(order: Order): Promise<void> {
    const cleanId = order.id.trim();

    await this.prisma.order.updateMany({
      where: {
        OR: [{ id: cleanId }, { orderCode: cleanId }],
      },
      data: {
        status: order.status,
        trackingCode: order.trackingCode || null,
        timeline: order.timeline as any,
        updatedAt: order.updatedAt,
      },
    });
  }

  /**
   * Ánh xạ bản ghi Prisma sang Domain Entity Order.
   */
  private mapPrismaToDomain(orderRow: any): Order {
    const rawTimeline = orderRow.timeline;
    let timeline: OrderTimelineItem[] = [];

    if (Array.isArray(rawTimeline)) {
      timeline = rawTimeline.map((t: any) => ({
        status: String(t.status || 'STATUS_UPDATE'),
        title: String(t.title || 'Cập nhật đơn hàng'),
        timestamp: t.timestamp ? new Date(t.timestamp) : new Date(orderRow.updatedAt),
        note: t.note ? String(t.note) : undefined,
      }));
    } else {
      timeline = [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo thành công',
          timestamp: new Date(orderRow.createdAt),
        },
      ];
    }

    const itemRows = orderRow.items || [];
    const items: OrderItem[] = itemRows.map((i: any) => ({
      productId: String(i.productId),
      productName: i.productTitle || 'Sản phẩm Nexus',
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.subtotal),
    }));

    const shippingAddress =
      typeof orderRow.shippingAddress === 'string'
        ? JSON.parse(orderRow.shippingAddress)
        : orderRow.shippingAddress || {};

    const buyerName =
      shippingAddress.fullName ||
      shippingAddress.name ||
      shippingAddress.recipientName ||
      'Khách hàng';

    const buyerEmail = shippingAddress.email || '';

    return new Order({
      id: orderRow.orderCode || String(orderRow.id),
      buyerId: orderRow.buyerId,
      buyerName,
      buyerEmail,
      sellerId: orderRow.sellerId,
      sellerName: 'Gian hàng đối tác',
      items,
      subtotal:
        Number(orderRow.totalAmount) -
        Number(orderRow.shippingFee || 0) +
        Number(orderRow.discountAmount || 0),
      shippingFee: Number(orderRow.shippingFee || 0),
      discountAmount: Number(orderRow.discountAmount || 0),
      shippingAddress,
      totalAmount: Number(orderRow.totalAmount),
      status: (orderRow.status as OrderStatus) || OrderStatus.PENDING,
      trackingCode: orderRow.trackingCode || undefined,
      timeline,
      createdAt: new Date(orderRow.createdAt),
      updatedAt: new Date(orderRow.updatedAt),
    });
  }

  /**
   * Khởi tạo các đơn hàng mẫu từ file JSON vào PostgreSQL khi khởi động hệ thống lần đầu.
   */
  private async seedInitialOrders(): Promise<void> {
    const sampleOrders = loadSeedOrders();

    for (const order of sampleOrders) {
      await this.save(order);
    }

    console.log(
      `[PostgresOrderRepository] Đã khởi tạo ${sampleOrders.length} đơn hàng mẫu từ seed JSON vào PostgreSQL thành công qua Prisma ORM.`,
    );
  }
}
