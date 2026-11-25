import { Order, OrderProps, OrderStatus } from '../../domain/entities/Order';
import { OrderSearchCriteria, OrderSearchPage } from '../../domain/repositories/IOrderRepository';
import { Prisma, PrismaClient } from '../database/generated/client';

type ItemRow = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

type OrderRow = {
  id: string;
  order_code: string;
  buyer_id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  seller_id: string;
  seller_name: string | null;
  total_amount: Prisma.Decimal;
  shipping_fee: Prisma.Decimal;
  discount_amount: Prisma.Decimal;
  shipping_address: unknown;
  tracking_code: string | null;
  status: OrderStatus;
  created_at: Date;
  updated_at: Date;
  timeline: Array<{ status: string; title: string; timestamp?: string; note?: string }> | null;
  items: ItemRow[];
};

const orderWithItems = Prisma.sql`
  SELECT o.id, o.order_code, o.buyer_id, o.buyer_name, o.buyer_email, o.seller_id, o.seller_name,
         o.total_amount, o.shipping_fee, o.discount_amount, o.shipping_address, o.tracking_code,
         o.status, o.created_at, o.updated_at, o.timeline,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'productId', i.product_id::text, 'productName', i.product_title,
             'quantity', i.quantity, 'unitPrice', i.unit_price::text, 'totalPrice', i.subtotal::text
           ) ORDER BY i.id)
           FROM commerce_order_items i WHERE i.order_id = o.id
         ), '[]'::jsonb) AS items
  FROM commerce_orders o
`;

// Admin reads follow the database migrations independently of the shared order writer.
export class PostgresAdminOrderReader {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<Order | null> {
    const key = id.trim();
    const rows = await this.prisma.$queryRaw<OrderRow[]>`
      ${orderWithItems} WHERE o.id = ${key} OR o.order_code = ${key}
      ORDER BY (o.id = ${key}) DESC LIMIT 1
    `;
    return rows.length ? this.toOrder(rows[0]) : null;
  }

  public async search(criteria: OrderSearchCriteria): Promise<OrderSearchPage> {
    const conditions = [Prisma.sql`TRUE`];
    if (criteria.sellerId) conditions.push(Prisma.sql`o.seller_id = ${criteria.sellerId}`);
    if (criteria.buyerId) conditions.push(Prisma.sql`o.buyer_id = ${criteria.buyerId}`);
    if (criteria.status) conditions.push(Prisma.sql`upper(o.status) = ${criteria.status}`);
    if (criteria.q) {
      const q = `%${criteria.q.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(Prisma.sql`(
        o.id ILIKE ${q} OR o.order_code ILIKE ${q} OR o.buyer_id ILIKE ${q}
        OR o.buyer_name ILIKE ${q} OR o.buyer_email ILIKE ${q} OR o.seller_id ILIKE ${q}
        OR o.seller_name ILIKE ${q} OR o.tracking_code ILIKE ${q}
        OR EXISTS (
          SELECT 1 FROM commerce_order_items i WHERE i.order_id = o.id
          AND (i.product_title ILIKE ${q} OR i.product_id::text ILIKE ${q})
        )
      )`);
    }

    const where = Prisma.join(conditions, ' AND ');
    const sort = {
      createdAt: Prisma.sql`o.created_at`,
      totalAmount: Prisma.sql`o.total_amount`,
      status: Prisma.sql`o.status`,
    }[criteria.sortBy ?? 'createdAt'];
    const direction = criteria.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const { page = 1, limit = 10 } = criteria;
    const [counts, rows] = await this.prisma.$transaction(
      [
        this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT count(*) AS total FROM commerce_orders o WHERE ${where}
      `,
        this.prisma.$queryRaw<OrderRow[]>`
        ${orderWithItems} WHERE ${where} ORDER BY ${sort} ${direction}, o.id ASC
        LIMIT ${limit} OFFSET ${BigInt(page - 1) * BigInt(limit)}
      `,
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const total = Number(counts[0].total);
    return {
      orders: rows.map((row) => this.toOrder(row)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  public async getDashboardOrderMetrics(): Promise<{
    pendingProcessing: number;
    refundPending: number;
    todayCount: number;
    todayRevenue: number;
    monthRevenue: number;
  }> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        pending_processing: bigint;
        refund_pending: bigint;
        today_count: bigint;
        today_revenue: Prisma.Decimal;
        month_revenue: Prisma.Decimal;
      }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'PENDING_PAYMENT', 'PAID', 'PROCESSING')) AS pending_processing,
        COUNT(*) FILTER (WHERE status IN ('REFUND_PENDING', 'DISPUTED') OR (status = 'PAID' AND timeline::text ILIKE '%REFUND_REQUESTED%')) AS refund_pending,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED') AND created_at >= CURRENT_DATE), 0) AS today_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED') AND created_at >= date_trunc('month', CURRENT_DATE)), 0) AS month_revenue
      FROM commerce_orders
    `;
    const r = rows[0] || {};
    return {
      pendingProcessing: Number(r.pending_processing || 0),
      refundPending: Number(r.refund_pending || 0),
      todayCount: Number(r.today_count || 0),
      todayRevenue: Number(r.today_revenue || 0),
      monthRevenue: Number(r.month_revenue || 0),
    };
  }

  public async getReports(params: {
    from: Date;
    to: Date;
    granularity: 'day' | 'week' | 'month';
  }): Promise<{
    summary: {
      netRevenue: number;
      grossRevenue: number;
      refundedAmount: number;
      totalOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      refundedOrders: number;
      cancelRefundRate: number;
      completedAuctions: number;
    };
    rows: Array<{
      period: string;
      orders: number;
      completedOrders: number;
      cancelledOrRefunded: number;
      revenue: number;
      refundedAmount: number;
      completedAuctions: number;
    }>;
  }> {
    const from = params.from;
    const to = params.to;

    const summaryRows = await this.prisma.$queryRaw<
      Array<{
        total_orders: bigint;
        completed_orders: bigint;
        cancelled_orders: bigint;
        refunded_orders: bigint;
        gross_revenue: Prisma.Decimal;
        refunded_amount: Prisma.Decimal;
      }>
    >`
      SELECT
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'COMPLETED')) AS completed_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
        COUNT(*) FILTER (WHERE status = 'REFUNDED') AS refunded_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED')), 0) AS gross_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'REFUNDED'), 0) AS refunded_amount
      FROM commerce_orders
      WHERE created_at >= ${from} AND created_at <= ${to}
    `;

    const s = summaryRows[0] || {};
    const totalOrders = Number(s.total_orders || 0);
    const completedOrders = Number(s.completed_orders || 0);
    const cancelledOrders = Number(s.cancelled_orders || 0);
    const refundedOrders = Number(s.refunded_orders || 0);
    const grossRevenue = Number(s.gross_revenue || 0);
    const refundedAmount = Number(s.refunded_amount || 0);
    const netRevenue = Math.max(0, grossRevenue - refundedAmount);
    const cancelRefundRate =
      totalOrders > 0
        ? Math.round(((cancelledOrders + refundedOrders) / totalOrders) * 10000) / 100
        : 0;

    let periodFormat = Prisma.sql`to_char(created_at, 'YYYY-MM-DD')`;
    if (params.granularity === 'week') {
      periodFormat = Prisma.sql`to_char(date_trunc('week', created_at), 'YYYY-"W"IW')`;
    } else if (params.granularity === 'month') {
      periodFormat = Prisma.sql`to_char(date_trunc('month', created_at), 'YYYY-MM')`;
    }

    const rowData = await this.prisma.$queryRaw<
      Array<{
        period: string;
        orders: bigint;
        completed_orders: bigint;
        cancelled_or_refunded: bigint;
        revenue: Prisma.Decimal;
        refunded_amount: Prisma.Decimal;
      }>
    >`
      SELECT
        ${periodFormat} AS period,
        COUNT(*) AS orders,
        COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'COMPLETED')) AS completed_orders,
        COUNT(*) FILTER (WHERE status IN ('CANCELLED', 'REFUNDED')) AS cancelled_or_refunded,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED')), 0) AS revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'REFUNDED'), 0) AS refunded_amount
      FROM commerce_orders
      WHERE created_at >= ${from} AND created_at <= ${to}
      GROUP BY period
      ORDER BY period ASC
    `;

    const rows = rowData.map((r) => ({
      period: r.period,
      orders: Number(r.orders || 0),
      completedOrders: Number(r.completed_orders || 0),
      cancelledOrRefunded: Number(r.cancelled_or_refunded || 0),
      revenue: Number(r.revenue || 0),
      refundedAmount: Number(r.refunded_amount || 0),
      completedAuctions: 0,
    }));

    return {
      summary: {
        netRevenue,
        grossRevenue,
        refundedAmount,
        totalOrders,
        completedOrders,
        cancelledOrders,
        refundedOrders,
        cancelRefundRate,
        completedAuctions: 0,
      },
      rows,
    };
  }

  private toOrder(row: OrderRow): Order {
    const rawAddress =
      typeof row.shipping_address === 'string'
        ? JSON.parse(row.shipping_address)
        : row.shipping_address;
    const address = rawAddress as
      | (OrderProps['shippingAddress'] & {
          name?: string;
          recipientName?: string;
          email?: string;
        })
      | null;
    return new Order({
      id: row.order_code || row.id,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name || address?.fullName || address?.name || address?.recipientName,
      buyerEmail: row.buyer_email || address?.email,
      sellerId: row.seller_id,
      sellerName: row.seller_name ?? undefined,
      shippingAddress: address ?? undefined,
      items: row.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      totalAmount: Number(row.total_amount),
      shippingFee: Number(row.shipping_fee),
      discountAmount: Number(row.discount_amount),
      trackingCode: row.tracking_code ?? undefined,
      status: row.status,
      timeline: Array.isArray(row.timeline)
        ? row.timeline.map((event) => ({
            ...event,
            timestamp: event.timestamp ? new Date(event.timestamp) : row.updated_at,
          }))
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
