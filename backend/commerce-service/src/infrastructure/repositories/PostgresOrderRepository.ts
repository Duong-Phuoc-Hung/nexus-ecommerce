import { Pool } from 'pg';
import { Order, OrderItem, OrderProps, OrderStatus } from '../../domain/entities/Order';
import {
  IOrderRepository,
  OrderSearchCriteria,
  OrderSearchPage,
} from '../../domain/repositories/IOrderRepository';

function mapDbStatusToOrderStatus(dbStatus: string): OrderStatus {
  const s = (dbStatus || '').toUpperCase();
  if (s === 'PENDING_PAYMENT' || s === 'PENDING') return OrderStatus.PENDING;
  if (s === 'PAID') return OrderStatus.PAID;
  if (s === 'PROCESSING') return OrderStatus.PROCESSING;
  if (s === 'SHIPPED') return OrderStatus.SHIPPED;
  if (s === 'DELIVERED') return OrderStatus.DELIVERED;
  if (s === 'CANCELLED') return OrderStatus.CANCELLED;
  if (s === 'REFUNDED') return OrderStatus.REFUNDED;
  return OrderStatus.PENDING;
}

function mapOrderStatusToDbStatus(status: OrderStatus): string {
  if (status === OrderStatus.PENDING) return 'PENDING_PAYMENT';
  return String(status);
}

export class PostgresOrderRepository implements IOrderRepository {
  constructor(private readonly pool: Pool) {}

  public async findById(id: string): Promise<Order | null> {
    const isNumeric = /^\d+$/.test(id);
    const orderQuery = isNumeric
      ? 'SELECT * FROM commerce_orders WHERE id = $1 LIMIT 1'
      : 'SELECT * FROM commerce_orders WHERE order_code = $1 LIMIT 1';

    const { rows: orderRows } = await this.pool.query(orderQuery, [id]);
    if (orderRows.length === 0) return null;

    const row = orderRows[0];
    const numericOrderId = row.id;

    const { rows: itemRows } = await this.pool.query(
      'SELECT * FROM commerce_order_items WHERE order_id = $1 ORDER BY id ASC',
      [numericOrderId],
    );

    const { rows: paymentRows } = await this.pool.query(
      'SELECT * FROM commerce_payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1',
      [numericOrderId],
    );

    return this.mapToDomain(row, itemRows, paymentRows[0]);
  }

  public async findByBuyerId(buyerId: string): Promise<Order[]> {
    const page = await this.search({ buyerId, limit: 100 });
    return page.orders;
  }

  public async search(criteria: OrderSearchCriteria): Promise<OrderSearchPage> {
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (criteria.buyerId) {
      whereClauses.push(`buyer_id = $${paramIndex++}`);
      values.push(criteria.buyerId);
    }

    if (criteria.sellerId) {
      whereClauses.push(`seller_id = $${paramIndex++}`);
      values.push(criteria.sellerId);
    }

    if (criteria.status) {
      const normalized = criteria.status.toUpperCase();
      if (normalized === 'PENDING' || normalized === 'PENDING_PAYMENT') {
        whereClauses.push(`status IN ('PENDING', 'PENDING_PAYMENT')`);
      } else {
        whereClauses.push(`status = $${paramIndex++}`);
        values.push(normalized);
      }
    }

    if (criteria.q) {
      whereClauses.push(
        `(order_code ILIKE $${paramIndex} OR id::text = $${paramIndex} OR shipping_address->>'fullName' ILIKE $${paramIndex})`,
      );
      values.push(`%${criteria.q}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Đếm tổng số bản ghi
    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM commerce_orders ${whereSql}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total || 0);

    // Xác định sắp xếp
    let orderCol = 'created_at';
    if (criteria.sortBy === 'totalAmount') orderCol = 'total_amount';
    else if (criteria.sortBy === 'status') orderCol = 'status';

    const sortDir = criteria.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const dataQuery = `
      SELECT * FROM commerce_orders
      ${whereSql}
      ORDER BY ${orderCol} ${sortDir}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    values.push(limit, offset);

    const { rows: orderRows } = await this.pool.query(dataQuery, values);
    if (orderRows.length === 0) {
      return {
        orders: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    const orderIds = orderRows.map((r) => r.id);
    const { rows: itemRows } = await this.pool.query(
      `SELECT * FROM commerce_order_items WHERE order_id = ANY($1) ORDER BY id ASC`,
      [orderIds],
    );

    const itemsByOrderId = new Map<number, any[]>();
    for (const item of itemRows) {
      const arr = itemsByOrderId.get(Number(item.order_id)) || [];
      arr.push(item);
      itemsByOrderId.set(Number(item.order_id), arr);
    }

    const orders = orderRows.map((row) =>
      this.mapToDomain(row, itemsByOrderId.get(Number(row.id)) || [], undefined),
    );

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async save(order: Order): Promise<void> {
    await this.pool.query(
      `INSERT INTO commerce_orders (
        id, order_code, buyer_id, seller_id, total_amount, shipping_fee, status, shipping_address
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, '{}')
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()`,
      [
        order.id,
        order.id,
        order.buyerId,
        order.sellerId,
        order.totalAmount,
        mapOrderStatusToDbStatus(order.status),
      ],
    );
  }

  public async update(order: Order): Promise<void> {
    const dbStatus = mapOrderStatusToDbStatus(order.status);
    const isNumeric = /^\d+$/.test(order.id);

    if (isNumeric) {
      await this.pool.query(
        `UPDATE commerce_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
        [dbStatus, order.id],
      );
    } else {
      await this.pool.query(
        `UPDATE commerce_orders SET status = $1, updated_at = NOW() WHERE order_code = $2`,
        [dbStatus, order.id],
      );
    }

    // Nếu đơn bị hủy, giải phóng tồn kho tạm giữ và cập nhật payment
    if (order.status === OrderStatus.CANCELLED) {
      const queryId = isNumeric
        ? order.id
        : `(SELECT id FROM commerce_orders WHERE order_code = '${order.id}')`;
      await this.pool.query(
        `UPDATE commerce_stock_reservations
         SET status = 'RELEASED'
         WHERE order_id = ${queryId} AND status = 'ACTIVE'`,
      );
      await this.pool.query(
        `UPDATE commerce_payments
         SET status = 'CANCELLED', updated_at = NOW()
         WHERE order_id = ${queryId} AND status = 'PENDING'`,
      );
    }
  }

  private mapToDomain(row: any, itemRows: any[], paymentRow?: any): Order {
    let shippingAddress: any = {};
    if (typeof row.shipping_address === 'string') {
      try {
        shippingAddress = JSON.parse(row.shipping_address);
      } catch {
        shippingAddress = {};
      }
    } else if (typeof row.shipping_address === 'object' && row.shipping_address !== null) {
      shippingAddress = row.shipping_address;
    }

    const buyerName = shippingAddress.fullName || `Buyer #${row.buyer_id}`;
    const buyerEmail = shippingAddress.phone || '';

    const items: OrderItem[] = itemRows.map((i) => ({
      productId: String(i.product_id),
      productName: i.product_title || 'Sản phẩm Nexus',
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.subtotal),
    }));

    const status = mapDbStatusToOrderStatus(row.status);
    const createdAt = row.created_at ? new Date(row.created_at) : new Date();
    const updatedAt = row.updated_at ? new Date(row.updated_at) : new Date();

    const props: OrderProps = {
      id: String(row.id),
      buyerId: String(row.buyer_id),
      buyerName,
      buyerEmail,
      sellerId: String(row.seller_id),
      sellerName: `Seller #${row.seller_id}`,
      items,
      totalAmount: Number(row.total_amount),
      status,
      paymentTransactionId: paymentRow?.transaction_id || paymentRow?.idempotency_key,
      trackingCode: row.order_code,
      createdAt,
      updatedAt,
      timeline: [
        {
          status: 'CREATED',
          title: 'Đơn hàng được khởi tạo',
          timestamp: createdAt,
        },
        ...(status !== OrderStatus.PENDING
          ? [
              {
                status: String(status),
                title: `Đơn hàng chuyển trạng thái sang ${status}`,
                timestamp: updatedAt,
              },
            ]
          : []),
      ],
    };

    return new Order(props);
  }
}
