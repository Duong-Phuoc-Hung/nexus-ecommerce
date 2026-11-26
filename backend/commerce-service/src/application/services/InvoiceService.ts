import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { buildServiceAuthHeader } from '../../infrastructure/security/internal-service-auth';

export interface InvoiceRecordDto {
  id: string;
  orderId: string;
  orderCode: string;
  invoiceCode: string;
  issuedAt: string;
  pdfUrl: string | null;
  notificationDispatched: boolean;
  snapshot: {
    buyerId: string;
    buyerName: string;
    buyerEmail: string;
    sellerId: string;
    sellerName: string;
    status: string;
    subtotal: number;
    shippingFee: number;
    discountAmount: number;
    totalAmount: number;
    currency: string;
    paymentMethod: string | null;
    transactionId: string | null;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
}

export class InvoiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const ELIGIBLE_INVOICE_STATUSES = new Set([
  'PAID',
  'CONFIRMED',
  'PROCESSING',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
]);

function generateInvoiceCode(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${y}${m}${d}-${suffix}`;
}

export class InvoiceService {
  private readonly memoryInvoices = new Map<string, InvoiceRecordDto>();

  constructor(private readonly pool?: Pool) {}

  public async getOrIssueInvoice(
    orderIdOrCode: string,
    actor: { userId: string; role: string },
  ): Promise<InvoiceRecordDto> {
    const cleanId = String(orderIdOrCode || '').trim();
    if (!cleanId) {
      throw new InvoiceError(400, 'INVALID_ORDER_ID', 'Mã đơn hàng không hợp lệ.');
    }

    if (!this.pool || process.env.USE_IN_MEMORY_DB === 'true') {
      const existingMem = this.memoryInvoices.get(cleanId);
      if (existingMem) return existingMem;
      throw new InvoiceError(404, 'ORDER_NOT_FOUND', `Không tìm thấy đơn hàng "${cleanId}".`);
    }

    const orderRes = await this.pool.query(
      `SELECT id, order_code, buyer_id, buyer_name, buyer_email, seller_id, seller_name,
              status, shipping_fee, discount_amount, total_amount, created_at
       FROM commerce_orders
       WHERE id = $1 OR order_code = $1
       LIMIT 1`,
      [cleanId],
    );

    if (orderRes.rows.length === 0) {
      throw new InvoiceError(404, 'ORDER_NOT_FOUND', `Không tìm thấy đơn hàng "${cleanId}".`);
    }

    const order = orderRes.rows[0];
    const normalizedRole = String(actor.role || '').toUpperCase();
    const isAdminOrStaff = normalizedRole === 'ADMIN' || normalizedRole === 'SUPPORT_STAFF';

    if (!isAdminOrStaff) {
      if (normalizedRole === 'BUYER' && String(order.buyer_id) !== actor.userId) {
        throw new InvoiceError(
          403,
          'FORBIDDEN',
          'Bạn không có quyền truy cập hóa đơn của đơn hàng này.',
        );
      }
      if (
        normalizedRole === 'SELLER' &&
        String(order.seller_id) !== actor.userId &&
        String(order.buyer_id) !== actor.userId
      ) {
        throw new InvoiceError(
          403,
          'FORBIDDEN',
          'Bạn không có quyền truy cập hóa đơn của đơn hàng này.',
        );
      }
    }

    const orderStatus = String(order.status || '').toUpperCase();
    if (!ELIGIBLE_INVOICE_STATUSES.has(orderStatus)) {
      throw new InvoiceError(
        422,
        'INVOICE_NOT_ELIGIBLE',
        'Hóa đơn chỉ được xuất cho đơn hàng đã thanh toán hoặc đang/đã hoàn tất giao nhận.',
      );
    }

    const [itemsRes, paymentRes] = await Promise.all([
      this.pool.query(
        `SELECT product_id, product_title, quantity, unit_price, subtotal
         FROM commerce_order_items
         WHERE order_id = $1
         ORDER BY id ASC`,
        [order.id],
      ),
      this.pool.query(
        `SELECT payment_method, transaction_id
         FROM commerce_payments
         WHERE order_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [order.id],
      ),
    ]);

    let invRes = await this.pool.query(
      `SELECT id::text, order_id, invoice_code, pdf_url, issued_at
       FROM commerce_invoices
       WHERE order_id = $1
       ORDER BY id ASC
       LIMIT 1`,
      [order.id],
    );

    let newlyCreated = false;
    if (invRes.rows.length === 0) {
      const code = generateInvoiceCode();
      const inserted = await this.pool.query(
        `INSERT INTO commerce_invoices (order_id, invoice_code, pdf_url, issued_at)
         VALUES ($1, $2, NULL, NOW())
         ON CONFLICT (invoice_code) DO NOTHING
         RETURNING id::text, order_id, invoice_code, pdf_url, issued_at`,
        [order.id, code],
      );
      if (inserted.rows.length > 0) {
        invRes = inserted;
        newlyCreated = true;
      } else {
        invRes = await this.pool.query(
          `SELECT id::text, order_id, invoice_code, pdf_url, issued_at
           FROM commerce_invoices
           WHERE order_id = $1
           ORDER BY id ASC
           LIMIT 1`,
          [order.id],
        );
      }
    }

    const inv = invRes.rows[0];
    const items = itemsRes.rows.map((r) => ({
      productId: String(r.product_id),
      productName: String(r.product_title || 'Sản phẩm Nexus'),
      quantity: Number(r.quantity) || 1,
      unitPrice: Number(r.unit_price) || 0,
      totalPrice: Number(r.subtotal) || 0,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const shippingFee = Number(order.shipping_fee) || 0;
    const discountAmount = Number(order.discount_amount) || 0;
    const totalAmount =
      Number(order.total_amount) || Math.max(0, subtotal + shippingFee - discountAmount);
    const payment = paymentRes.rows[0] || null;
    const orderCode = String(order.order_code || order.id);

    const notificationDispatched = await this.dispatchInvoiceNotification({
      orderId: String(order.id),
      orderCode,
      invoiceCode: String(inv.invoice_code),
      buyerId: String(order.buyer_id),
      buyerEmail: order.buyer_email ? String(order.buyer_email) : undefined,
      totalAmount,
      forceDispatch: newlyCreated,
    });

    return {
      id: String(inv.id),
      orderId: String(order.id),
      orderCode,
      invoiceCode: String(inv.invoice_code),
      issuedAt: inv.issued_at ? new Date(inv.issued_at).toISOString() : new Date().toISOString(),
      pdfUrl: inv.pdf_url ? String(inv.pdf_url) : null,
      notificationDispatched,
      snapshot: {
        buyerId: String(order.buyer_id),
        buyerName: String(order.buyer_name || 'Người mua Nexus'),
        buyerEmail: String(order.buyer_email || ''),
        sellerId: String(order.seller_id),
        sellerName: String(order.seller_name || 'Gian hàng Nexus'),
        status: orderStatus,
        subtotal,
        shippingFee,
        discountAmount,
        totalAmount,
        currency: 'VND',
        paymentMethod: payment?.payment_method ? String(payment.payment_method) : null,
        transactionId: payment?.transaction_id ? String(payment.transaction_id) : null,
        items,
      },
    };
  }

  private async dispatchInvoiceNotification(params: {
    orderId: string;
    orderCode: string;
    invoiceCode: string;
    buyerId: string;
    buyerEmail?: string;
    totalAmount: number;
    forceDispatch: boolean;
  }): Promise<boolean> {
    const baseUrl = (
      process.env.NOTIFICATION_SERVICE_URL ||
      `http://127.0.0.1:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`
    ).replace(/\/$/, '');
    const internalKey = process.env.INTERNAL_SERVICE_SECRET || 'nexus-internal-service-key';

    try {
      const formattedTotal = new Intl.NumberFormat('vi-VN').format(params.totalAmount);
      const res = await fetch(`${baseUrl}/api/v1/notifications/internal/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildServiceAuthHeader({
            issuer: 'commerce-service',
            audience: 'notification-service',
            scope: 'notification:dispatch',
            resource: params.buyerId,
          }),
          'Idempotency-Key': `invoice:${params.orderId}`,
        },
        body: JSON.stringify({
          idempotencyKey: `invoice:${params.orderId}`,
          recipientId: params.buyerId,
          recipientEmail: params.buyerEmail,
          channel: 'IN_APP',
          category: 'ORDER',
          title: `Hóa đơn điện tử ${params.invoiceCode} đã phát hành`,
          body: `Đơn hàng ${params.orderCode} (${formattedTotal} ₫) đã có hóa đơn điện tử chính thức.`,
          href: `/account/orders/${encodeURIComponent(params.orderCode)}?tab=invoice`,
        }),
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
