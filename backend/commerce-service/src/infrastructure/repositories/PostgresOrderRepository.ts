import { Pool, PoolClient } from 'pg';
import {
  IOrderRepository,
  OrderSearchCriteria,
  OrderSearchPage,
} from '../../domain/repositories/IOrderRepository';
import { Order, OrderItem, OrderStatus, OrderTimelineItem } from '../../domain/entities/Order';
import { loadSeedOrders } from '../seeds/orderSeedLoader';

interface OrderRow {
  id: string | number;
  order_code: string;
  buyer_id: string;
  seller_id: string;
  total_amount: string | number;
  shipping_fee: string | number;
  discount_amount: string | number;
  status: string;
  shipping_address: any;
  checkout_session_expires_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  seller_name?: string | null;
  tracking_code?: string | null;
  timeline?: any;
}

interface OrderItemRow {
  id: string | number;
  order_id: string | number;
  product_id: string | number;
  product_title: string;
  unit_price: string | number;
  quantity: number;
  subtotal: string | number;
  created_at: Date | string;
}

export class PostgresOrderRepository implements IOrderRepository {
  private isInitialized = false;

  constructor(private readonly pool: Pool) {}

  /**
   * Nạp dữ liệu mẫu ban đầu nếu bảng rỗng.
   */
  public async seedIfEmpty(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const countRes = await this.pool.query('SELECT COUNT(*)::int AS count FROM commerce_orders');
      const orderCount = countRes.rows[0]?.count ?? 0;

      if (orderCount === 0) {
        await this.seedInitialOrders();
      }
    } catch (err) {
      console.warn('[PostgresOrderRepository] Seed check warning:', (err as Error).message);
    }
  }

  public async findById(id: string): Promise<Order | null> {
    const cleanId = id.trim();

    const { rows } = await this.pool.query<OrderRow>(
      `SELECT * FROM commerce_orders 
       WHERE order_code = $1 OR id::text = $1 
       LIMIT 1`,
      [cleanId],
    );

    if (rows.length === 0) {
      return null;
    }

    const orderRow = rows[0];
    const itemsRes = await this.pool.query<OrderItemRow>(
      `SELECT * FROM commerce_order_items 
       WHERE order_id = $1 
       ORDER BY id ASC`,
      [orderRow.id],
    );

    return this.mapToDomain(orderRow, itemsRes.rows);
  }

  public async findByBuyerId(buyerId: string): Promise<Order[]> {
    const cleanBuyerId = buyerId.trim();

    const { rows } = await this.pool.query<OrderRow>(
      `SELECT * FROM commerce_orders 
       WHERE buyer_id = $1 
       ORDER BY created_at DESC`,
      [cleanBuyerId],
    );

    if (rows.length === 0) {
      return [];
    }

    const orderDbIds = rows.map((r) => r.id);
    const itemsRes = await this.pool.query<OrderItemRow>(
      `SELECT * FROM commerce_order_items 
       WHERE order_id = ANY($1::bigint[]) 
       ORDER BY id ASC`,
      [orderDbIds],
    );

    const itemsByOrderId = new Map<string, OrderItemRow[]>();
    for (const item of itemsRes.rows) {
      const key = String(item.order_id);
      const existing = itemsByOrderId.get(key) || [];
      existing.push(item);
      itemsByOrderId.set(key, existing);
    }

    return rows.map((orderRow) =>
      this.mapToDomain(orderRow, itemsByOrderId.get(String(orderRow.id)) || []),
    );
  }

  public async search(criteria: OrderSearchCriteria): Promise<OrderSearchPage> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    // 1. Lọc từ khóa tìm kiếm toàn diện (Mã đơn, người mua, email, shop, vận đơn, tên sản phẩm)
    if (criteria.q && criteria.q.trim().length > 0) {
      const searchTerm = `%${criteria.q.trim()}%`;
      conditions.push(`(
        o.order_code ILIKE $${paramIdx} OR
        COALESCE(o.buyer_name, '') ILIKE $${paramIdx} OR
        COALESCE(o.buyer_email, '') ILIKE $${paramIdx} OR
        COALESCE(o.seller_name, '') ILIKE $${paramIdx} OR
        COALESCE(o.tracking_code, '') ILIKE $${paramIdx} OR
        EXISTS (
          SELECT 1 FROM commerce_order_items oi 
          WHERE oi.order_id = o.id AND oi.product_title ILIKE $${paramIdx}
        )
      )`);
      params.push(searchTerm);
      paramIdx++;
    }

    // 2. Lọc theo Buyer ID (IDOR-safe)
    if (criteria.buyerId && criteria.buyerId.trim().length > 0) {
      conditions.push(`o.buyer_id = $${paramIdx}`);
      params.push(criteria.buyerId.trim());
      paramIdx++;
    }

    // 3. Lọc theo Seller ID (IDOR-safe)
    if (criteria.sellerId && criteria.sellerId.trim().length > 0) {
      conditions.push(`o.seller_id = $${paramIdx}`);
      params.push(criteria.sellerId.trim());
      paramIdx++;
    }

    // 4. Lọc theo Status
    if (criteria.status && criteria.status.trim().length > 0) {
      conditions.push(`UPPER(o.status) = UPPER($${paramIdx})`);
      params.push(criteria.status.trim());
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 5. Sắp xếp với Whitelist chống SQL Injection
    let sortColumn = 'o.created_at';
    if (criteria.sortBy === 'totalAmount') {
      sortColumn = 'o.total_amount';
    } else if (criteria.sortBy === 'status') {
      sortColumn = 'o.status';
    }

    const sortDirection = criteria.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // 6. Phân trang
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const offset = (page - 1) * limit;

    // Đếm tổng số bản ghi
    const countSql = `SELECT COUNT(*)::int AS total FROM commerce_orders o ${whereClause}`;
    const countRes = await this.pool.query(countSql, params);
    const total = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Truy vấn trang dữ liệu
    const selectSql = `
      SELECT o.* 
      FROM commerce_orders o 
      ${whereClause} 
      ORDER BY ${sortColumn} ${sortDirection} 
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const rowsRes = await this.pool.query<OrderRow>(selectSql, [...params, limit, offset]);

    if (rowsRes.rows.length === 0) {
      return {
        orders: [],
        total,
        page,
        limit,
        totalPages,
      };
    }

    // Nạp chi tiết Order Items cho các đơn trên trang này
    const orderDbIds = rowsRes.rows.map((r) => r.id);
    const itemsRes = await this.pool.query<OrderItemRow>(
      `SELECT * FROM commerce_order_items 
       WHERE order_id = ANY($1::bigint[]) 
       ORDER BY id ASC`,
      [orderDbIds],
    );

    const itemsByOrderId = new Map<string, OrderItemRow[]>();
    for (const item of itemsRes.rows) {
      const key = String(item.order_id);
      const existing = itemsByOrderId.get(key) || [];
      existing.push(item);
      itemsByOrderId.set(key, existing);
    }

    const orders = rowsRes.rows.map((orderRow) =>
      this.mapToDomain(orderRow, itemsByOrderId.get(String(orderRow.id)) || []),
    );

    return {
      orders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(order: Order): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const upsertOrderSql = `
        INSERT INTO commerce_orders (
          order_code, buyer_id, buyer_name, buyer_email, seller_id, seller_name,
          total_amount, shipping_fee, status, shipping_address, tracking_code,
          timeline, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (order_code) DO UPDATE SET
          buyer_id = EXCLUDED.buyer_id,
          buyer_name = EXCLUDED.buyer_name,
          buyer_email = EXCLUDED.buyer_email,
          seller_id = EXCLUDED.seller_id,
          seller_name = EXCLUDED.seller_name,
          total_amount = EXCLUDED.total_amount,
          status = EXCLUDED.status,
          tracking_code = EXCLUDED.tracking_code,
          timeline = EXCLUDED.timeline,
          updated_at = EXCLUDED.updated_at
        RETURNING id
      `;

      const shippingAddressJson = JSON.stringify({
        name: order.buyerName,
        email: order.buyerEmail,
      });

      const res = await client.query(upsertOrderSql, [
        order.id,
        order.buyerId,
        order.buyerName,
        order.buyerEmail,
        order.sellerId,
        order.sellerName,
        order.totalAmount,
        0,
        order.status,
        shippingAddressJson,
        order.trackingCode || null,
        JSON.stringify(order.timeline),
        order.createdAt,
        order.updatedAt,
      ]);

      const dbOrderId = res.rows[0].id;

      // Xóa và ghi lại danh sách Order Items
      await client.query('DELETE FROM commerce_order_items WHERE order_id = $1', [dbOrderId]);

      for (const item of order.items) {
        await client.query(
          `INSERT INTO commerce_order_items (
            order_id, product_id, product_title, unit_price, quantity, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            dbOrderId,
            String(item.productId),
            item.productName || 'Sản phẩm Nexus',
            item.unitPrice,
            item.quantity,
            item.totalPrice,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  public async update(order: Order): Promise<void> {
    await this.pool.query(
      `UPDATE commerce_orders 
       SET status = $1, tracking_code = $2, timeline = $3, updated_at = $4
       WHERE order_code = $5 OR id::text = $5`,
      [
        order.status,
        order.trackingCode || null,
        JSON.stringify(order.timeline),
        order.updatedAt,
        order.id,
      ],
    );
  }

  /**
   * Ánh xạ dòng PostgreSQL sang Domain Entity Order.
   */
  private mapToDomain(orderRow: OrderRow, itemRows: OrderItemRow[]): Order {
    const rawTimeline = orderRow.timeline;
    let timeline: OrderTimelineItem[] = [];

    if (Array.isArray(rawTimeline)) {
      timeline = rawTimeline.map((t: any) => ({
        status: String(t.status || 'STATUS_UPDATE'),
        title: String(t.title || 'Cập nhật đơn hàng'),
        timestamp: t.timestamp ? new Date(t.timestamp) : new Date(orderRow.updated_at),
        note: t.note ? String(t.note) : undefined,
      }));
    } else {
      timeline = [
        {
          status: 'CREATED',
          title: 'Đơn hàng được tạo thành công',
          timestamp: new Date(orderRow.created_at),
        },
      ];
    }

    const items: OrderItem[] = itemRows.map((i) => ({
      productId: String(i.product_id),
      productName: i.product_title || 'Sản phẩm Nexus',
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.subtotal),
    }));

    // Trích xuất tên và email người mua từ cột hoặc từ JSON shipping_address
    const shippingAddress =
      typeof orderRow.shipping_address === 'string'
        ? JSON.parse(orderRow.shipping_address)
        : orderRow.shipping_address || {};

    const buyerName =
      orderRow.buyer_name || shippingAddress.name || shippingAddress.recipientName || 'Khách hàng';

    const buyerEmail = orderRow.buyer_email || shippingAddress.email || '';

    return new Order({
      id: orderRow.order_code || String(orderRow.id),
      buyerId: orderRow.buyer_id,
      buyerName,
      buyerEmail,
      sellerId: orderRow.seller_id,
      sellerName: orderRow.seller_name || 'Gian hàng đối tác',
      items,
      subtotal:
        Number(orderRow.total_amount) -
        Number(orderRow.shipping_fee || 0) +
        Number(orderRow.discount_amount || 0),
      shippingFee: Number(orderRow.shipping_fee || 0),
      discountAmount: Number(orderRow.discount_amount || 0),
      shippingAddress,
      totalAmount: Number(orderRow.total_amount),
      status: (orderRow.status as OrderStatus) || OrderStatus.PENDING,
      trackingCode: orderRow.tracking_code || undefined,
      timeline,
      createdAt: new Date(orderRow.created_at),
      updatedAt: new Date(orderRow.updated_at),
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
      `[PostgresOrderRepository] Đã khởi tạo ${sampleOrders.length} đơn hàng mẫu từ seed JSON vào PostgreSQL thành công.`,
    );
  }
}
