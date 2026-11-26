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
    const rawClean = id.trim();
    const cleanId = rawClean
      .replace(/^[#]/, '')
      .replace(/^NEX-TRK-/i, '')
      .trim();

    const orderRow = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: cleanId }, { id: rawClean }, { orderCode: cleanId }, { orderCode: rawClean }],
      },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
        payments: {
          orderBy: { id: 'desc' },
          take: 1,
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
        payments: {
          orderBy: { id: 'desc' },
          take: 1,
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

    // 3. Lọc theo Status (hỗ trợ cả 1 trạng thái hoặc danh sách phân cách dấu phẩy cho nhóm tab)
    if (criteria.status && criteria.status.trim().length > 0) {
      const statuses = criteria.status
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (statuses.length === 1) {
        where.status = { equals: statuses[0], mode: 'insensitive' };
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    // 3b. Lọc theo khoảng ngày tạo đơn (server-side trước khi phân trang — SRS B-F319-02)
    if (criteria.fromDate || criteria.toDate) {
      const createdAtRange: { gte?: Date; lte?: Date } = {};
      if (criteria.fromDate) {
        const start = new Date(
          criteria.fromDate.includes('T')
            ? criteria.fromDate
            : `${criteria.fromDate}T00:00:00.000Z`,
        );
        if (!Number.isNaN(start.getTime())) createdAtRange.gte = start;
      }
      if (criteria.toDate) {
        const end = new Date(
          criteria.toDate.includes('T') ? criteria.toDate : `${criteria.toDate}T23:59:59.999Z`,
        );
        if (!Number.isNaN(end.getTime())) createdAtRange.lte = end;
      }
      if (createdAtRange.gte || createdAtRange.lte) {
        where.createdAt = createdAtRange;
      }
    }

    // 4. Lọc từ khóa tìm kiếm toàn diện
    if (criteria.q && criteria.q.trim().length > 0) {
      const q = criteria.q.trim();
      const unhashed = q.replace(/^[#]/, '').trim();
      where.OR = [
        { orderCode: { contains: q, mode: 'insensitive' } },
        { orderCode: { contains: unhashed, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
        { id: { contains: unhashed, mode: 'insensitive' } },
        { buyerName: { contains: q, mode: 'insensitive' } },
        { buyerEmail: { contains: q, mode: 'insensitive' } },
        { sellerName: { contains: q, mode: 'insensitive' } },
        { trackingCode: { contains: q, mode: 'insensitive' } },
        { trackingCode: { contains: unhashed, mode: 'insensitive' } },
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
      const shippingAddressJson = JSON.stringify(
        typeof order.shippingAddress === 'object' &&
          Object.keys(order.shippingAddress || {}).length > 0
          ? order.shippingAddress
          : { name: order.buyerName, email: order.buyerEmail },
      );
      const lookupCode = order.id.startsWith('NX-ORD') ? order.id : `NX-ORD-${order.id}`;

      const upserted = await tx.order.upsert({
        where: { orderCode: lookupCode },
        update: {
          buyerId: order.buyerId,
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          sellerId: order.sellerId,
          sellerName: order.sellerName,
          totalAmount: order.totalAmount,
          status: order.status,
          shippingAddress: shippingAddressJson as any,
          trackingCode: order.trackingCode || null,
          escrowStatus: order.escrowStatus || null,
          escrowAmount: order.escrowAmount ?? null,
          escrowReleasedAt: order.escrowReleasedAt || null,
          timeline: order.timeline as any,
          updatedAt: order.updatedAt,
        },
        create: {
          id: order.id,
          orderCode: lookupCode,
          buyerId: order.buyerId,
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          sellerId: order.sellerId,
          sellerName: order.sellerName,
          totalAmount: order.totalAmount,
          shippingFee: order.shippingFee || 0,
          discountAmount: order.discountAmount || 0,
          status: order.status,
          shippingAddress: shippingAddressJson as any,
          trackingCode: order.trackingCode || null,
          escrowStatus: order.escrowStatus || 'PENDING',
          escrowAmount: order.escrowAmount ?? 0,
          escrowReleasedAt: order.escrowReleasedAt || null,
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
          data: order.items.map((item) => ({
            orderId: upserted.id,
            productId: String(item.productId),
            productTitle: item.productName || 'Sản phẩm Nexus',
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.totalPrice,
          })),
        });
      }
    });
  }

  public async update(order: Order): Promise<void> {
    const cleanId = order.id.trim();

    const runInTx = async (tx: any) => {
      // 1. Kiểm tra trạng thái hiện tại trong DB để chống hoàn voucher lặp khi retry hủy đơn (P1-5)
      const existing = await tx.order.findFirst({
        where: {
          OR: [{ id: cleanId }, { orderCode: cleanId }],
        },
        select: { id: true, status: true },
      });

      const currentStatus = existing?.status;
      const targetOrderId = existing?.id || cleanId;

      // 2. Cập nhật trạng thái và timeline của đơn hàng trong transaction
      await tx.order.updateMany({
        where: {
          OR: [{ id: cleanId }, { orderCode: cleanId }],
        },
        data: {
          status: order.status,
          trackingCode: order.trackingCode || null,
          escrowStatus: order.escrowStatus || null,
          escrowAmount: order.escrowAmount ?? null,
          escrowReleasedAt: order.escrowReleasedAt || null,
          timeline: order.timeline as any,
          updatedAt: order.updatedAt,
        },
      });

      // 2b. Lưu bền vững metadata hoàn tiền nếu bảng có cột V10
      if (
        (order.refundTransactionId !== undefined ||
          order.refundAmount !== undefined ||
          order.refundStatus !== undefined) &&
        typeof tx.$executeRaw === 'function'
      ) {
        try {
          await tx.$executeRaw`
            UPDATE commerce_orders
            SET
              refund_transaction_id = COALESCE(${order.refundTransactionId ?? null}, refund_transaction_id),
              refund_amount = COALESCE(${order.refundAmount ?? null}, refund_amount),
              refund_status = COALESCE(${order.refundStatus ?? null}, refund_status)
            WHERE id = ${targetOrderId}::uuid OR order_code = ${cleanId}
          `;
        } catch {
          // Bỏ qua nếu migration V10 chưa chạy trên môi trường test
        }
      }

      // 3. Hoàn trả voucher, nhả giữ kho & hủy payment PENDING nguyên tử trong cùng transaction khi hủy đơn
      if (order.status === 'CANCELLED' && currentStatus !== 'CANCELLED') {
        if (tx.stockReservation) {
          await tx.stockReservation.updateMany({
            where: { orderId: targetOrderId, status: 'ACTIVE' },
            data: { status: 'RELEASED' },
          });
        }
        if (tx.payment) {
          await tx.payment.updateMany({
            where: { orderId: targetOrderId, status: 'PENDING' },
            data: { status: 'CANCELLED', updatedAt: order.updatedAt },
          });
        }
        if (tx.promotionUsage && tx.promotion) {
          const promoUsages = await tx.promotionUsage.findMany({
            where: { orderId: targetOrderId },
          });

          if (Array.isArray(promoUsages) && promoUsages.length > 0) {
            for (const usage of promoUsages) {
              const deleted = await tx.promotionUsage.delete({
                where: { id: usage.id },
              });
              if (deleted) {
                await tx.promotion.update({
                  where: { id: usage.promotionId },
                  data: { usedCount: { decrement: 1 } },
                });
              }
            }
          }
        }
      }
    };

    if (typeof (this.prisma as any)?.$transaction === 'function') {
      await (this.prisma as any).$transaction(runInTx);
    } else {
      await runInTx(this.prisma);
    }
  }

  /**
   * Ánh xạ bản ghi Prisma sang Domain Entity Order.
   */
  private mapPrismaToDomain(orderRow: any): Order {
    const rawTimeline = orderRow.timeline;
    let timeline: OrderTimelineItem[] = [];

    if (Array.isArray(rawTimeline) && rawTimeline.length > 0) {
      timeline = rawTimeline.map((t: any) => ({
        status: String(t.status || 'STATUS_UPDATE'),
        title: String(t.title || 'Cập nhật đơn hàng'),
        timestamp: t.timestamp ? new Date(t.timestamp) : new Date(orderRow.updatedAt),
        note: t.note ? String(t.note) : undefined,
      }));
    } else {
      timeline = [
        {
          status: String(orderRow.status || 'CREATED'),
          title:
            orderRow.status === 'PROCESSING'
              ? 'Đơn hàng được tạo thành công · Đang xử lý'
              : 'Đơn hàng được tạo thành công',
          timestamp: new Date(orderRow.createdAt),
          note: 'Khởi tạo đơn hàng trên sàn thương mại điện tử Nexus',
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
      orderRow.buyerName ||
      shippingAddress.fullName ||
      shippingAddress.name ||
      shippingAddress.recipientName ||
      'Khách hàng';

    const buyerEmail = orderRow.buyerEmail || shippingAddress.email || '';

    // Đọc metadata hoàn tiền từ cột DB (nếu có) hoặc suy diễn an toàn từ timeline
    let refundTransactionId: string | undefined =
      orderRow.refundTransactionId || orderRow.refund_transaction_id || undefined;
    let refundAmount: number | undefined =
      orderRow.refundAmount !== undefined && orderRow.refundAmount !== null
        ? Number(orderRow.refundAmount)
        : orderRow.refund_amount !== undefined && orderRow.refund_amount !== null
          ? Number(orderRow.refund_amount)
          : undefined;
    let refundStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | undefined = (orderRow.refundStatus ||
      orderRow.refund_status) as 'PENDING' | 'SUCCESS' | 'FAILED' | undefined;

    if (!refundStatus || !refundTransactionId) {
      for (let i = timeline.length - 1; i >= 0; i--) {
        const ev = timeline[i];
        if (!refundStatus) {
          if (ev.status === 'REFUNDED') refundStatus = 'SUCCESS';
          else if (ev.status === 'REFUND_PENDING') refundStatus = 'PENDING';
          else if (ev.status === 'REFUND_FAILED') refundStatus = 'FAILED';
        }
        if (!refundTransactionId && ev.note) {
          const m = ev.note.match(/(?:Refund Txn\)|Mã tham chiếu hoàn tiền):\s*([a-zA-Z0-9_\-:]+)/);
          if (m && m[1] && m[1] !== 'N/A') {
            refundTransactionId = m[1];
          }
        }
        if (refundStatus && refundTransactionId) break;
      }
    }

    const latestPayment = Array.isArray(orderRow.payments) ? orderRow.payments[0] : undefined;
    const resolvedPaymentMethod: string =
      orderRow.paymentMethod ||
      latestPayment?.paymentMethod ||
      shippingAddress.paymentMethod ||
      (timeline.some((t) =>
        String(t.note || '')
          .toUpperCase()
          .includes('PAYOS'),
      )
        ? 'PAYOS'
        : 'COD');
    const resolvedPaymentTxnId: string | undefined =
      orderRow.paymentTransactionId ||
      latestPayment?.transactionId ||
      latestPayment?.transactionReference ||
      undefined;

    return new Order({
      id: orderRow.orderCode || String(orderRow.id),
      buyerId: orderRow.buyerId,
      buyerName,
      buyerEmail,
      sellerId: orderRow.sellerId,
      sellerName: orderRow.sellerName || 'Gian hàng đối tác',
      items,
      subtotal:
        Number(orderRow.totalAmount) -
        Number(orderRow.shippingFee || 0) +
        Number(orderRow.discountAmount || 0),
      shippingFee: Number(orderRow.shippingFee || 0),
      discountAmount: Number(orderRow.discountAmount || 0),
      promoCode: orderRow.promoCode || orderRow.promo_code || null,
      taxAmount: Number(orderRow.taxAmount || orderRow.tax_amount || 0),
      shippingCarrier: orderRow.shippingCarrier || orderRow.shipping_carrier || null,
      shippingServiceName: orderRow.shippingServiceName || orderRow.shipping_service_name || null,
      estimatedDeliveryAt:
        orderRow.estimatedDeliveryAt || orderRow.estimated_delivery_at
          ? new Date(orderRow.estimatedDeliveryAt || orderRow.estimated_delivery_at)
          : null,
      shippingAddress,
      paymentMethod: resolvedPaymentMethod,
      paymentTransactionId: resolvedPaymentTxnId,
      totalAmount: Number(orderRow.totalAmount),
      status: (orderRow.status as OrderStatus) || OrderStatus.PENDING,
      trackingCode: orderRow.trackingCode || undefined,
      escrowStatus: (orderRow.escrowStatus as any) || (orderRow.escrow_status as any) || undefined,
      escrowAmount:
        orderRow.escrowAmount !== null && orderRow.escrowAmount !== undefined
          ? Number(orderRow.escrowAmount)
          : orderRow.escrow_amount !== null && orderRow.escrow_amount !== undefined
            ? Number(orderRow.escrow_amount)
            : undefined,
      escrowReleasedAt:
        orderRow.escrowReleasedAt || orderRow.escrow_released_at
          ? new Date(orderRow.escrowReleasedAt || orderRow.escrow_released_at)
          : null,
      refundTransactionId,
      refundAmount,
      refundStatus,
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
