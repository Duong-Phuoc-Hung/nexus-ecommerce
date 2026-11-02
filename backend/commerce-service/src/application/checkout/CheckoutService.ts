import crypto from 'node:crypto';
import {
  CartLineInput,
  CheckoutError,
  ICatalogClient,
  ICheckoutRepository,
  IPaymentGateway,
  IShippingQuote,
  OrderRecord,
  PaymentRecord,
  PricedLine,
  QuoteRecord,
  ShippingAddress,
} from './ports';

const QUOTE_TTL_MS = 15 * 60 * 1000;
const ORDER_TTL_MS = 15 * 60 * 1000;
const RESERVATION_TTL_MS = 30 * 60 * 1000;
const MAX_PAYMENT_ATTEMPTS = 3;
const CURRENCY = 'VND';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCartLines(body: unknown): CartLineInput[] {
  const raw = isRecord(body) ? body.items : undefined;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) {
    throw new CheckoutError(400, 'VALIDATION_ERROR', 'Danh sách sản phẩm không hợp lệ.', {
      fieldErrors: { items: 'Cần từ 1 đến 50 sản phẩm.' },
    });
  }

  const merged = new Map<string, number>();
  for (const entry of raw) {
    const productId = isRecord(entry) ? String(entry.productId ?? '').trim() : '';
    const quantity = isRecord(entry) ? entry.quantity : undefined;
    if (!/^\d+$/.test(productId) || !Number.isInteger(quantity) || Number(quantity) < 1) {
      throw new CheckoutError(400, 'VALIDATION_ERROR', 'Sản phẩm trong giỏ không hợp lệ.', {
        fieldErrors: { items: 'Mỗi sản phẩm cần productId dạng số và quantity là số nguyên >= 1.' },
      });
    }
    merged.set(productId, (merged.get(productId) || 0) + Number(quantity));
  }

  const lines = Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
  if (lines.some((line) => line.quantity > 999)) {
    throw new CheckoutError(400, 'VALIDATION_ERROR', 'Số lượng mỗi sản phẩm tối đa là 999.');
  }
  return lines.sort((a, b) => Number(a.productId) - Number(b.productId));
}

export function parseShippingAddress(body: unknown): ShippingAddress {
  const raw = isRecord(body) && isRecord(body.shippingAddress) ? body.shippingAddress : undefined;
  const read = (key: string): string =>
    raw && typeof raw[key] === 'string' ? (raw[key] as string).trim() : '';

  const address: ShippingAddress = {
    fullName: read('fullName'),
    phone: read('phone'),
    province: read('province'),
    district: read('district') || undefined,
    ward: read('ward') || undefined,
    addressLine: read('addressLine'),
    country: (read('country') || 'VN').toUpperCase(),
  };

  const fieldErrors: Record<string, string> = {};
  if (!address.fullName) fieldErrors['shippingAddress.fullName'] = 'Họ tên là bắt buộc.';
  if (!/^[0-9+\-\s]{8,15}$/.test(address.phone)) {
    fieldErrors['shippingAddress.phone'] = 'Số điện thoại không hợp lệ.';
  }
  if (!address.province) fieldErrors['shippingAddress.province'] = 'Tỉnh/Thành là bắt buộc.';
  if (!address.addressLine) fieldErrors['shippingAddress.addressLine'] = 'Địa chỉ là bắt buộc.';
  if (Object.keys(fieldErrors).length > 0) {
    throw new CheckoutError(400, 'VALIDATION_ERROR', 'Địa chỉ giao hàng không hợp lệ.', {
      fieldErrors,
    });
  }
  return address;
}

export class CheckoutService {
  constructor(
    private readonly repository: ICheckoutRepository,
    private readonly catalog: ICatalogClient,
    private readonly shipping: IShippingQuote,
    private readonly gateway: IPaymentGateway,
  ) {}

  // POST /checkout/quote
  public async quote(buyerId: string, body: unknown) {
    const lines = parseCartLines(body);
    const address = parseShippingAddress(body);
    const priced = await this.priceCart(buyerId, lines, address);

    const record: QuoteRecord = {
      id: crypto.randomUUID(),
      buyerId,
      sellerId: priced.sellerId,
      items: priced.items,
      shippingAddress: address,
      subtotal: priced.subtotal,
      shippingFee: priced.shippingFee,
      totalAmount: priced.total,
      currency: CURRENCY,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
    };
    await this.repository.saveQuote(record);

    return {
      quoteId: record.id,
      expiresAt: record.expiresAt.toISOString(),
      currency: CURRENCY,
      sellerId: record.sellerId,
      items: record.items,
      subtotal: record.subtotal,
      shippingFee: record.shippingFee,
      totalAmount: record.totalAmount,
    };
  }

  // POST /orders/checkout
  public async checkout(
    buyerId: string,
    body: unknown,
    idempotencyKey: string | undefined,
  ): Promise<{ replay: boolean; data: Record<string, unknown> }> {
    const rawPaymentMethod =
      isRecord(body) && typeof body.paymentMethod === 'string'
        ? body.paymentMethod.toUpperCase()
        : 'PAYOS';
    const paymentMethod: 'PAYOS' | 'COD' = rawPaymentMethod === 'COD' ? 'COD' : 'PAYOS';

    if (paymentMethod === 'PAYOS' && !this.gateway.isConfigured()) {
      throw new CheckoutError(
        503,
        'PAYMENT_NOT_CONFIGURED',
        'Cổng thanh toán PayOS chưa được cấu hình.',
      );
    }
    if (idempotencyKey !== undefined && !/^[\w\-.:]{1,100}$/.test(idempotencyKey)) {
      throw new CheckoutError(400, 'VALIDATION_ERROR', 'Header Idempotency-Key không hợp lệ.');
    }

    const lines = parseCartLines(body);
    const address = parseShippingAddress(body);
    const quoteId =
      isRecord(body) && typeof body.quoteId === 'string' && body.quoteId ? body.quoteId : undefined;

    const priced = await this.priceCart(buyerId, lines, address);

    if (quoteId) {
      const quote = await this.repository.findQuote(quoteId);
      if (!quote || quote.buyerId !== buyerId) {
        throw new CheckoutError(404, 'QUOTE_NOT_FOUND', 'Không tìm thấy báo giá.');
      }
      if (quote.expiresAt.getTime() < Date.now()) {
        throw new CheckoutError(422, 'QUOTE_EXPIRED', 'Báo giá đã hết hạn, vui lòng báo giá lại.');
      }
      if (quote.totalAmount !== priced.total) {
        throw new CheckoutError(
          409,
          'QUOTE_PRICE_CHANGED',
          'Giá đã thay đổi, vui lòng báo giá lại.',
        );
      }
    }

    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ lines, address, quoteId: quoteId || null, paymentMethod }))
      .digest('hex');

    const created = await this.repository.createOrder({
      buyerId,
      sellerId: priced.sellerId,
      items: priced.items,
      stockByProduct: priced.stockByProduct,
      shippingAddress: address,
      subtotal: priced.subtotal,
      shippingFee: priced.shippingFee,
      totalAmount: priced.total,
      paymentMethod,
      idempotencyKey,
      requestHash,
      orderExpiresAt: new Date(Date.now() + ORDER_TTL_MS),
      reservationExpiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
    });

    if (created.replay && created.requestHash !== requestHash) {
      throw new CheckoutError(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency-Key đã được dùng cho một yêu cầu khác.',
      );
    }

    const payment =
      paymentMethod === 'COD'
        ? created.payment
        : await this.ensureLink(created.order, created.payment);

    return { replay: created.replay, data: this.toCheckoutResponse(created.order, payment) };
  }

  // POST /orders/:id/payment-link
  public async paymentLink(buyerId: string, orderId: string, body: unknown) {
    if (!this.gateway.isConfigured()) {
      throw new CheckoutError(
        503,
        'PAYMENT_NOT_CONFIGURED',
        'Cổng thanh toán PayOS chưa được cấu hình.',
      );
    }
    const order = await this.requireOwnedOrder(buyerId, orderId);
    if (order.status === 'PAID') {
      throw new CheckoutError(409, 'ORDER_ALREADY_PAID', 'Đơn hàng đã được thanh toán.');
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new CheckoutError(409, 'ORDER_NOT_PAYABLE', 'Đơn hàng không còn thanh toán được.');
    }
    if (order.expiresAt.getTime() < Date.now()) {
      throw new CheckoutError(409, 'ORDER_EXPIRED', 'Đơn hàng đã hết hạn thanh toán.');
    }

    const renew = isRecord(body) && body.renew === true;
    const latest = await this.repository.latestPayment(order.id);

    if (latest && latest.status === 'PENDING' && !renew) {
      const payment = await this.ensureLink(order, latest);
      return { reused: true, ...this.toCheckoutResponse(order, payment) };
    }

    const attempts = await this.repository.countPayments(order.id);
    if (attempts >= MAX_PAYMENT_ATTEMPTS) {
      throw new CheckoutError(
        409,
        'PAYMENT_ATTEMPTS_EXCEEDED',
        `Đơn hàng đã dùng hết ${MAX_PAYMENT_ATTEMPTS} lần tạo link thanh toán.`,
      );
    }
    if (latest && latest.status === 'PENDING') {
      await this.repository.markPaymentCancelled(latest.id);
    }

    const attempt = await this.repository.createPaymentAttempt(
      order.id,
      order.totalAmount,
      order.expiresAt,
    );
    const payment = await this.ensureLink(order, attempt);
    return { reused: false, ...this.toCheckoutResponse(order, payment) };
  }

  // POST /payments/payos/webhook
  public async handleWebhook(body: unknown) {
    if (!this.gateway.isConfigured()) {
      throw new CheckoutError(
        503,
        'PAYMENT_NOT_CONFIGURED',
        'Cổng thanh toán PayOS chưa được cấu hình.',
      );
    }
    const webhook = this.gateway.verifyWebhook(body);
    if (!webhook) {
      throw new CheckoutError(401, 'INVALID_SIGNATURE', 'Chữ ký webhook không hợp lệ.');
    }
    return this.repository.applyPaymentResult(webhook);
  }

  // GET /orders/:id/payment-status
  public async paymentStatus(buyerId: string, orderId: string) {
    const order = await this.requireOwnedOrder(buyerId, orderId);
    const payment = await this.repository.latestPayment(order.id);
    const expired = order.status === 'PENDING_PAYMENT' && order.expiresAt.getTime() < Date.now();

    return {
      orderId: order.id,
      orderCode: order.orderCode,
      orderStatus: order.status,
      paymentMethod: payment?.paymentMethod || 'PAYOS',
      paymentStatus: payment ? payment.status : 'NOT_STARTED',
      amount: order.totalAmount,
      currency: CURRENCY,
      paidAt: payment?.paidAt ? payment.paidAt.toISOString() : null,
      expiresAt: order.expiresAt.toISOString(),
      expired,
    };
  }

  private async requireOwnedOrder(buyerId: string, orderId: string): Promise<OrderRecord> {
    const order = /^\d+$/.test(orderId) ? await this.repository.findOrder(orderId) : null;
    if (!order || order.buyerId !== buyerId) {
      throw new CheckoutError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    }
    return order;
  }

  private async ensureLink(order: OrderRecord, payment: PaymentRecord): Promise<PaymentRecord> {
    if (payment.checkoutUrl) return payment;

    try {
      const link = await this.gateway.createPaymentLink({
        orderCode: payment.payosOrderCode,
        amount: payment.amount,
        description: `Nexus ${order.id}`.slice(0, 25),
        items: order.items.map((item) => ({
          name: item.title.slice(0, 100),
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        expiresAt: order.expiresAt,
      });
      await this.repository.setPaymentLink(payment.id, link);
      return { ...payment, checkoutUrl: link.checkoutUrl, paymentLinkId: link.paymentLinkId };
    } catch {
      throw new CheckoutError(
        502,
        'PAYMENT_GATEWAY_ERROR',
        'Không tạo được link thanh toán. Vui lòng thử lại bằng payment-link.',
        { orderId: order.id },
      );
    }
  }

  private toCheckoutResponse(order: OrderRecord, payment: PaymentRecord) {
    return {
      orderId: order.id,
      orderCode: order.orderCode,
      status: order.status,
      paymentMethod: payment.paymentMethod || (payment.checkoutUrl ? 'PAYOS' : 'COD'),
      currency: CURRENCY,
      subtotal: order.totalAmount - order.shippingFee,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      expiresAt: order.expiresAt.toISOString(),
      checkoutUrl: payment.checkoutUrl || null,
      paymentLinkId: payment.paymentLinkId || null,
    };
  }

  private async priceCart(buyerId: string, lines: CartLineInput[], address: ShippingAddress) {
    const items: PricedLine[] = [];
    const sellers = new Set<string>();
    const stockByProduct: Record<string, number> = {};

    for (const line of lines) {
      const product = await this.catalog.findProduct(line.productId);
      if (!product) {
        throw new CheckoutError(
          404,
          'PRODUCT_NOT_FOUND',
          `Không tìm thấy sản phẩm ${line.productId}.`,
        );
      }
      if (product.status !== 'ACTIVE') {
        throw new CheckoutError(
          409,
          'PRODUCT_UNAVAILABLE',
          `Sản phẩm ${line.productId} không còn bán.`,
        );
      }
      if (product.stockQuantity < line.quantity) {
        throw new CheckoutError(
          409,
          'INSUFFICIENT_STOCK',
          `Sản phẩm ${line.productId} không đủ hàng.`,
        );
      }
      if (product.sellerId === buyerId) {
        throw new CheckoutError(
          422,
          'CANNOT_BUY_OWN_PRODUCT',
          'Không thể mua sản phẩm của chính mình.',
        );
      }
      sellers.add(product.sellerId);
      stockByProduct[product.id] = product.stockQuantity;
      items.push({
        productId: product.id,
        title: product.title,
        unitPrice: product.price,
        quantity: line.quantity,
        subtotal: Math.round(product.price * line.quantity),
      });
    }

    if (sellers.size > 1) {
      throw new CheckoutError(
        422,
        'MIXED_SELLERS_NOT_SUPPORTED',
        'Mỗi đơn hàng chỉ được chứa sản phẩm của một Seller.',
      );
    }

    const shipping = await this.shipping.quote(address, lines);
    if (!shipping.supported) {
      throw new CheckoutError(
        422,
        'SHIPPING_NOT_SUPPORTED',
        'Khu vực này chưa được hỗ trợ giao hàng.',
      );
    }

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    return {
      sellerId: Array.from(sellers)[0],
      items,
      stockByProduct,
      subtotal,
      shippingFee: shipping.fee,
      total: subtotal + shipping.fee,
    };
  }
}
