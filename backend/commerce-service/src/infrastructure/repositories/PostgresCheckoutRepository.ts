import crypto from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import {
  ApplyPaymentOutcome,
  CheckoutError,
  CreateOrderParams,
  ICheckoutRepository,
  OrderRecord,
  PaymentLink,
  PaymentRecord,
  PaymentWebhook,
  PricedLine,
  QuoteRecord,
  ShippingAddress,
} from '../../application/checkout/ports';

type Row = Record<string, any>;

const ORDER_SELECT = `SELECT id, order_code, buyer_id, seller_id, status, total_amount, shipping_fee,
  shipping_address, checkout_session_expires_at FROM commerce_orders`;

const PAYMENT_SELECT = `SELECT id, order_id, payos_order_code, status, amount, currency, checkout_url,
  payment_link_id, expires_at, paid_at FROM commerce_payments`;

function toPayment(row: Row): PaymentRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    payosOrderCode: Number(row.payos_order_code),
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    checkoutUrl: row.checkout_url || undefined,
    paymentLinkId: row.payment_link_id || undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
  };
}

function toOrder(row: Row, items: Row[]): OrderRecord {
  return {
    id: String(row.id),
    orderCode: row.order_code,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: row.status,
    totalAmount: Number(row.total_amount),
    shippingFee: Number(row.shipping_fee),
    shippingAddress: row.shipping_address as ShippingAddress,
    expiresAt: new Date(row.checkout_session_expires_at),
    items: items.map((item): PricedLine => ({
      productId: String(item.product_id),
      title: item.product_title,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal),
    })),
  };
}

export class PostgresCheckoutRepository implements ICheckoutRepository {
  constructor(private readonly pool: Pool) {}

  private async tx<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  public async saveQuote(quote: QuoteRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO commerce_checkout_quotes
        (id, buyer_id, seller_id, items, shipping_address, subtotal, shipping_fee, total_amount, currency, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        quote.id,
        quote.buyerId,
        quote.sellerId,
        JSON.stringify(quote.items),
        JSON.stringify(quote.shippingAddress),
        quote.subtotal,
        quote.shippingFee,
        quote.totalAmount,
        quote.currency,
        quote.expiresAt,
      ],
    );
  }

  public async findQuote(id: string): Promise<QuoteRecord | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const { rows } = await this.pool.query('SELECT * FROM commerce_checkout_quotes WHERE id = $1', [
      id,
    ]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      items: row.items,
      shippingAddress: row.shipping_address,
      subtotal: Number(row.subtotal),
      shippingFee: Number(row.shipping_fee),
      totalAmount: Number(row.total_amount),
      currency: row.currency,
      expiresAt: new Date(row.expires_at),
    };
  }

  public async createOrder(params: CreateOrderParams) {
    return this.tx(async (client) => {
      if (params.idempotencyKey) {
        const claim = await client.query(
          `INSERT INTO commerce_checkout_idempotency (buyer_id, idempotency_key, request_hash)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING idempotency_key`,
          [params.buyerId, params.idempotencyKey, params.requestHash],
        );
        if (claim.rowCount === 0) {
          // Khóa dòng để chờ giao dịch đầu tiên commit xong order_id
          const existing = await client.query(
            `SELECT request_hash, order_id FROM commerce_checkout_idempotency
             WHERE buyer_id = $1 AND idempotency_key = $2 FOR SHARE`,
            [params.buyerId, params.idempotencyKey],
          );
          const row = existing.rows[0];
          if (row.request_hash !== params.requestHash) {
            return {
              order: null as unknown as OrderRecord,
              payment: null as unknown as PaymentRecord,
              replay: true,
              requestHash: row.request_hash as string,
            };
          }
          const order = await this.loadOrder(client, String(row.order_id));
          const payment = await this.loadLatestPayment(client, String(row.order_id));
          return {
            order: order!,
            payment: payment!,
            replay: true,
            requestHash: params.requestHash,
          };
        }
      }

      // Tuần tự hóa việc giữ hàng theo từng sản phẩm (sắp xếp để tránh deadlock)
      const productIds = params.items.map((item) => Number(item.productId)).sort((a, b) => a - b);
      for (const productId of productIds) {
        await client.query('SELECT pg_advisory_xact_lock($1)', [productId]);
      }
      for (const item of params.items) {
        const held = await client.query(
          `SELECT COALESCE(SUM(quantity), 0) AS qty FROM commerce_stock_reservations
           WHERE product_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()`,
          [item.productId],
        );
        const stock = params.stockByProduct[item.productId];
        if (stock !== undefined && Number(held.rows[0].qty) + item.quantity > stock) {
          throw new CheckoutError(
            409,
            'INSUFFICIENT_STOCK',
            `Sản phẩm ${item.productId} không đủ hàng.`,
          );
        }
      }

      const orderResult = await client.query(
        `INSERT INTO commerce_orders
          (order_code, buyer_id, seller_id, total_amount, shipping_fee, status, shipping_address,
           checkout_session_expires_at)
         VALUES ('ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('commerce_order_code_seq')::text, 6, '0'),
                 $1,$2,$3,$4,'PENDING_PAYMENT',$5,$6)
         RETURNING id`,
        [
          params.buyerId,
          params.sellerId,
          params.totalAmount,
          params.shippingFee,
          JSON.stringify(params.shippingAddress),
          params.orderExpiresAt,
        ],
      );
      const orderId = String(orderResult.rows[0].id);

      for (const item of params.items) {
        await client.query(
          `INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, item.productId, item.title, item.unitPrice, item.quantity, item.subtotal],
        );
        await client.query(
          `INSERT INTO commerce_stock_reservations (order_id, product_id, quantity, expires_at)
           VALUES ($1,$2,$3,$4)`,
          [orderId, item.productId, item.quantity, params.reservationExpiresAt],
        );
      }

      await this.insertPayment(client, orderId, params.totalAmount, params.orderExpiresAt);
      if (params.idempotencyKey) {
        await client.query(
          `UPDATE commerce_checkout_idempotency SET order_id = $3
           WHERE buyer_id = $1 AND idempotency_key = $2`,
          [params.buyerId, params.idempotencyKey, orderId],
        );
      }

      const order = await this.loadOrder(client, orderId);
      const payment = await this.loadLatestPayment(client, orderId);
      return { order: order!, payment: payment!, replay: false, requestHash: params.requestHash };
    });
  }

  public async findOrder(orderId: string): Promise<OrderRecord | null> {
    const client = await this.pool.connect();
    try {
      return await this.loadOrder(client, orderId);
    } finally {
      client.release();
    }
  }

  public async latestPayment(orderId: string): Promise<PaymentRecord | null> {
    const { rows } = await this.pool.query(
      `${PAYMENT_SELECT} WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
      [orderId],
    );
    return rows.length ? toPayment(rows[0]) : null;
  }

  public async countPayments(orderId: string): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::int AS n FROM commerce_payments WHERE order_id = $1',
      [orderId],
    );
    return rows[0].n;
  }

  public async createPaymentAttempt(orderId: string, amount: number, expiresAt: Date) {
    return this.tx(async (client) => {
      const id = await this.insertPayment(client, orderId, amount, expiresAt);
      const { rows } = await client.query(`${PAYMENT_SELECT} WHERE id = $1`, [id]);
      return toPayment(rows[0]);
    });
  }

  public async markPaymentCancelled(paymentId: string): Promise<void> {
    await this.pool.query(
      `UPDATE commerce_payments SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING'`,
      [paymentId],
    );
  }

  public async setPaymentLink(paymentId: string, link: PaymentLink): Promise<void> {
    await this.pool.query(
      `UPDATE commerce_payments SET checkout_url = $2, payment_link_id = $3, updated_at = NOW()
       WHERE id = $1`,
      [paymentId, link.checkoutUrl, link.paymentLinkId],
    );
  }

  public async applyPaymentResult(webhook: PaymentWebhook): Promise<ApplyPaymentOutcome> {
    return this.tx(async (client) => {
      const found = await client.query(`${PAYMENT_SELECT} WHERE payos_order_code = $1 FOR UPDATE`, [
        webhook.orderCode,
      ]);
      if (found.rowCount === 0) return 'UNKNOWN_ORDER_CODE';

      const payment = toPayment(found.rows[0]);
      if (payment.status === 'SUCCEEDED') return 'DUPLICATE';

      const raw = JSON.stringify(webhook.raw);
      if (webhook.amount !== payment.amount) {
        await client.query(
          `UPDATE commerce_payments SET status = 'FAILED', raw_response = $2, updated_at = NOW() WHERE id = $1`,
          [payment.id, raw],
        );
        return 'AMOUNT_MISMATCH';
      }

      if (!webhook.success) {
        await client.query(
          `UPDATE commerce_payments SET status = 'FAILED', raw_response = $2, updated_at = NOW()
           WHERE id = $1 AND status = 'PENDING'`,
          [payment.id, raw],
        );
        return 'PAYMENT_FAILED';
      }

      await client.query(
        `UPDATE commerce_payments
         SET status = 'SUCCEEDED', paid_at = NOW(), transaction_id = $2, raw_response = $3, updated_at = NOW()
         WHERE id = $1`,
        [payment.id, webhook.reference ?? null, raw],
      );
      await client.query(
        `UPDATE commerce_orders SET status = 'PAID', updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING_PAYMENT'`,
        [payment.orderId],
      );
      await client.query(
        `UPDATE commerce_stock_reservations SET status = 'COMMITTED'
         WHERE order_id = $1 AND status = 'ACTIVE'`,
        [payment.orderId],
      );
      return 'PAID';
    });
  }

  private async insertPayment(
    client: PoolClient,
    orderId: string,
    amount: number,
    expiresAt: Date,
  ): Promise<string> {
    const { rows } = await client.query(
      `INSERT INTO commerce_payments
        (order_id, payment_method, idempotency_key, amount, currency, status, payos_order_code, expires_at)
       VALUES ($1,'PAYOS',$2,$3,'VND','PENDING', nextval('commerce_payos_order_code_seq'), $4)
       RETURNING id`,
      [orderId, crypto.randomUUID(), amount, expiresAt],
    );
    return String(rows[0].id);
  }

  private async loadOrder(client: PoolClient, orderId: string): Promise<OrderRecord | null> {
    if (!/^\d+$/.test(orderId)) return null;
    const order = await client.query(`${ORDER_SELECT} WHERE id = $1`, [orderId]);
    if (order.rowCount === 0) return null;
    const items = await client.query(
      'SELECT * FROM commerce_order_items WHERE order_id = $1 ORDER BY id',
      [orderId],
    );
    return toOrder(order.rows[0], items.rows);
  }

  private async loadLatestPayment(client: PoolClient, orderId: string) {
    const { rows } = await client.query(
      `${PAYMENT_SELECT} WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
      [orderId],
    );
    return rows.length ? toPayment(rows[0]) : null;
  }
}
