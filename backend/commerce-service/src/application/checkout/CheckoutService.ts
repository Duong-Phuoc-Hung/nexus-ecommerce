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
  ShippingOption,
} from './ports';
import { PromotionService } from '../promotion/PromotionService';

const QUOTE_TTL_MS = 15 * 60 * 1000;
const ORDER_TTL_MS = 15 * 60 * 1000;
const RESERVATION_TTL_MS = 30 * 60 * 1000;
const MAX_PAYMENT_ATTEMPTS = 3;
const CURRENCY = 'VND';

const PRODUCT_ID_PATTERN =
  /^([0-9]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

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

  const merged = new Map<string, { quantity: number; price?: number }>();
  for (const entry of raw) {
    const productId = isRecord(entry) ? String(entry.productId ?? '').trim() : '';
    const quantity = isRecord(entry) ? entry.quantity : undefined;
    const price =
      isRecord(entry) && entry.price !== undefined && Number(entry.price) > 0
        ? Number(entry.price)
        : undefined;
    if (
      !PRODUCT_ID_PATTERN.test(productId) ||
      !Number.isInteger(quantity) ||
      Number(quantity) < 1
    ) {
      throw new CheckoutError(400, 'VALIDATION_ERROR', 'Sản phẩm trong giỏ không hợp lệ.', {
        fieldErrors: {
          items:
            'Mỗi sản phẩm cần productId dạng số hoặc UUID hợp lệ và quantity là số nguyên >= 1.',
        },
      });
    }
    const existing = merged.get(productId);
    merged.set(productId, {
      quantity: (existing?.quantity || 0) + Number(quantity),
      price: price ?? existing?.price,
    });
  }

  const lines = Array.from(merged, ([productId, data]) => ({
    productId,
    quantity: data.quantity,
    price: data.price,
  }));
  if (lines.some((line) => line.quantity > 999)) {
    throw new CheckoutError(400, 'VALIDATION_ERROR', 'Số lượng mỗi sản phẩm tối đa là 999.');
  }
  return lines.sort((a, b) => a.productId.localeCompare(b.productId));
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
    private readonly promotionService?: PromotionService,
  ) {}

  public buildShippingOptions(baseFee: number): ShippingOption[] {
    const now = Date.now();
    const standardDelivery = new Date(now + 3 * 24 * 60 * 60 * 1000);

    return [
      {
        optionId: 'GHN_STANDARD',
        carrier: 'GHN',
        carrierName: 'Giao Hàng Nhanh',
        serviceName: 'Tiêu chuẩn',
        fee: baseFee,
        etaDaysMin: 2,
        etaDaysMax: 3,
        etaText: 'Dự kiến 2–3 ngày',
        estimatedDeliveryAt: standardDelivery.toISOString(),
        recommended: true,
      },
    ];
  }

  // GET /checkout/promotions
  public async getPromotions(userId: string, subtotal?: number) {
    if (!this.promotionService) return [];
    return this.promotionService.getEligiblePromotions(userId, subtotal);
  }

  // POST /checkout/promotions/validate
  public async validatePromotion(params: {
    code: string;
    userId: string;
    subtotal?: number;
    items?: Array<{ productId: string; quantity: number }>;
  }) {
    if (!this.promotionService) {
      throw new CheckoutError(
        503,
        'PROMOTION_SERVICE_UNAVAILABLE',
        'Dịch vụ khuyến mãi chưa sẵn sàng.',
      );
    }
    return this.promotionService.validatePromotion(params);
  }

  // POST /checkout/quote
  public async quote(buyerId: string, body: unknown) {
    const lines = parseCartLines(body);
    const address = parseShippingAddress(body);
    const targetSellerId =
      isRecord(body) && typeof body.targetSellerId === 'string' && body.targetSellerId.trim()
        ? String(body.targetSellerId).trim()
        : undefined;
    const isAuction = isRecord(body) && Boolean(body.isAuction);
    const priced = await this.priceCart(buyerId, lines, address, { targetSellerId, isAuction });

    const shippingOptions = this.buildShippingOptions(priced.shippingFee);
    const requestedOptionId =
      isRecord(body) && typeof body.shippingOptionId === 'string'
        ? String(body.shippingOptionId).trim().toUpperCase()
        : 'GHN_STANDARD';

    const selectedOption =
      shippingOptions.find((o) => o.optionId.toUpperCase() === requestedOptionId) ||
      shippingOptions[0];
    const finalShippingFee = selectedOption.fee;

    const promoCode =
      isRecord(body) && typeof body.promoCode === 'string' && body.promoCode.trim()
        ? String(body.promoCode).trim().toUpperCase()
        : undefined;

    let discountAmount = 0;
    let promoData: any = null;

    if (promoCode && this.promotionService) {
      const promoResult = await this.promotionService.validatePromotion({
        code: promoCode,
        userId: buyerId,
        subtotal: priced.subtotal,
        items: priced.items,
      });

      const isApplied = promoResult.valid && promoResult.discountAmount > 0;
      promoData = {
        code: promoCode,
        applied: isApplied,
        discountAmount: isApplied ? promoResult.discountAmount : 0,
        reasonCode: promoResult.reasonCode,
      };

      if (isApplied) {
        discountAmount = promoResult.discountAmount;
      }
    }

    const taxAmount = 0;
    const totalAmount = Math.max(
      0,
      priced.subtotal - discountAmount + finalShippingFee + taxAmount,
    );

    const record: QuoteRecord = {
      id: crypto.randomUUID(),
      buyerId,
      sellerId: priced.sellerId,
      items: priced.items,
      shippingAddress: address,
      subtotal: priced.subtotal,
      discountAmount,
      taxAmount,
      shippingFee: finalShippingFee,
      totalAmount,
      currency: CURRENCY,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
      promoCode: discountAmount > 0 ? promoCode || null : null,
      promo: promoData,
      selectedShippingOptionId: selectedOption.optionId,
      shippingOptions,
    };
    await this.repository.saveQuote(record);

    return {
      quoteId: record.id,
      expiresAt: record.expiresAt.toISOString(),
      currency: CURRENCY,
      sellerId: record.sellerId,
      items: record.items,
      subtotal: record.subtotal,
      discountAmount,
      taxAmount,
      shippingFee: record.shippingFee,
      totalAmount: record.totalAmount,
      promo: promoData,
      selectedShippingOptionId: selectedOption.optionId,
      shippingOptions,
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

    const rawPromo =
      isRecord(body) && typeof body.promoCode === 'string' && body.promoCode.trim()
        ? String(body.promoCode).trim().toUpperCase()
        : undefined;

    const requestedOptionId =
      isRecord(body) && typeof body.shippingOptionId === 'string' && body.shippingOptionId.trim()
        ? String(body.shippingOptionId).trim().toUpperCase()
        : undefined;

    // P1-2: requestHash sinh ra từ đúng Payload đầu vào của Client (không băm các giá trị server tự tính toán lại)
    const requestHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          buyerId,
          lines,
          address,
          quoteId: quoteId || null,
          paymentMethod,
          promoCode: rawPromo || null,
          shippingOptionId: requestedOptionId || null,
        }),
      )
      .digest('hex');

    // P1-2: Nhận diện yêu cầu đã xử lý trước khi tính toán lại voucher
    if (idempotencyKey && this.repository.findOrderByIdempotency) {
      const existing = await this.repository.findOrderByIdempotency(buyerId, idempotencyKey);
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new CheckoutError(
            409,
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency-Key đã được dùng cho một yêu cầu khác.',
          );
        }
        if (existing.order) {
          const payment =
            paymentMethod === 'COD'
              ? existing.payment
              : await this.ensureLink(existing.order, existing.payment);
          return { replay: true, data: this.toCheckoutResponse(existing.order, payment) };
        }
      }
    }

    const targetSellerId =
      isRecord(body) && typeof body.targetSellerId === 'string' && body.targetSellerId.trim()
        ? String(body.targetSellerId).trim()
        : undefined;
    const isAuction = isRecord(body) && Boolean(body.isAuction);
    const priced = await this.priceCart(buyerId, lines, address, { targetSellerId, isAuction });

    let finalShippingFee = priced.shippingFee;
    let finalDiscountAmount = 0;
    let finalTotalAmount = priced.total;
    let finalPromoCode: string | undefined = undefined;
    let finalPromotionId: string | undefined = undefined;
    let finalShippingCarrier = 'GHN';
    let finalShippingServiceName = 'Tiêu chuẩn';
    let finalEstimatedDeliveryAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    if (quoteId) {
      const quote = await this.repository.findQuote(quoteId);
      if (!quote || quote.buyerId !== buyerId) {
        throw new CheckoutError(404, 'QUOTE_NOT_FOUND', 'Không tìm thấy báo giá.');
      }
      if (quote.expiresAt.getTime() < Date.now()) {
        throw new CheckoutError(422, 'QUOTE_EXPIRED', 'Báo giá đã hết hạn, vui lòng báo giá lại.');
      }
      if (quote.subtotal !== priced.subtotal) {
        throw new CheckoutError(
          409,
          'QUOTE_PRICE_CHANGED',
          'Giá đã thay đổi, vui lòng báo giá lại.',
        );
      }

      // P1-3: Ràng buộc quote với các dòng hàng, địa chỉ và dịch vụ vận chuyển đã chọn
      if (quote.items.length !== lines.length) {
        throw new CheckoutError(
          409,
          'QUOTE_PRICE_CHANGED',
          'Danh sách sản phẩm trong giỏ hàng đã thay đổi so với báo giá, vui lòng báo giá lại.',
        );
      }
      for (const line of lines) {
        const quoteItem = quote.items.find((i) => i.productId === line.productId);
        if (!quoteItem || quoteItem.quantity !== line.quantity) {
          throw new CheckoutError(
            409,
            'QUOTE_PRICE_CHANGED',
            'Danh sách sản phẩm trong giỏ hàng đã thay đổi so với báo giá, vui lòng báo giá lại.',
          );
        }
      }

      const norm = (s?: string) => (s || '').trim().toLowerCase();
      const addressChanged =
        norm(address.province) !== norm(quote.shippingAddress?.province) ||
        norm(address.district) !== norm(quote.shippingAddress?.district) ||
        norm(address.ward) !== norm(quote.shippingAddress?.ward) ||
        norm(address.addressLine) !== norm(quote.shippingAddress?.addressLine);

      if (addressChanged && priced.shippingFee !== quote.shippingFee) {
        throw new CheckoutError(
          409,
          'QUOTE_PRICE_CHANGED',
          'Địa chỉ nhận hàng đã thay đổi làm thay đổi cước phí vận chuyển, vui lòng báo giá lại.',
        );
      }

      if (
        requestedOptionId &&
        quote.selectedShippingOptionId &&
        requestedOptionId !== quote.selectedShippingOptionId.toUpperCase()
      ) {
        throw new CheckoutError(
          409,
          'QUOTE_PRICE_CHANGED',
          'Phương thức vận chuyển đã thay đổi so với báo giá, vui lòng báo giá lại.',
        );
      }

      finalShippingFee = quote.shippingFee;
      finalDiscountAmount = quote.discountAmount || 0;
      finalTotalAmount = quote.totalAmount;

      // P1-1: Chỉ lưu và trừ lượt cho voucher thực sự được áp dụng (finalDiscountAmount > 0)
      if (finalDiscountAmount > 0 && quote.promoCode) {
        finalPromoCode = quote.promoCode;
        if (this.promotionService) {
          const promo = await this.promotionService.getPromotionByCode(finalPromoCode);
          if (promo) finalPromotionId = promo.id;
        }
      } else {
        finalPromoCode = undefined;
        finalPromotionId = undefined;
      }
    } else {
      if (rawPromo && this.promotionService) {
        const promoRes = await this.promotionService.validatePromotion({
          code: rawPromo,
          userId: buyerId,
          subtotal: priced.subtotal,
          items: priced.items,
        });
        // P1-1: Chỉ lưu và trừ lượt cho voucher thực sự được áp dụng (discountAmount > 0)
        if (promoRes.valid && promoRes.discountAmount > 0) {
          finalDiscountAmount = promoRes.discountAmount;
          finalPromoCode = rawPromo;
          finalPromotionId = promoRes.promotion?.id;
        } else {
          finalDiscountAmount = 0;
          finalPromoCode = undefined;
          finalPromotionId = undefined;
        }
      }
      finalTotalAmount = Math.max(0, priced.subtotal - finalDiscountAmount + finalShippingFee);
    }

    const created = await this.repository.createOrder({
      buyerId,
      sellerId: priced.sellerId,
      items: priced.items,
      stockByProduct: priced.stockByProduct,
      shippingAddress: address,
      subtotal: priced.subtotal,
      discountAmount: finalDiscountAmount,
      taxAmount: 0,
      shippingFee: finalShippingFee,
      totalAmount: finalTotalAmount,
      paymentMethod,
      idempotencyKey,
      requestHash,
      orderExpiresAt: new Date(Date.now() + ORDER_TTL_MS),
      reservationExpiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
      promoCode: finalPromoCode,
      promotionId: finalPromotionId,
      shippingCarrier: finalShippingCarrier,
      shippingServiceName: finalShippingServiceName,
      estimatedDeliveryAt: finalEstimatedDeliveryAt,
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

    /**
     * KIẾN TRÚC TRỪ TỒN KHO PHÂN TÁN (CATALOG STOCK DEDUCTION):
     * - Phase 1 (MVP hiện tại): Gọi trực tiếp qua HTTP REST (CatalogClient.deductStock) kèm catch warning log.
     *   Đảm bảo không chặn hoặc làm fail giao dịch checkout của người dùng nếu Catalog có độ trễ mạng ngắn.
     * - Phase 2 (Định hướng phân tán): Chuyển sang Saga Pattern / Transactional Outbox Pattern:
     *   Commerce Service ghi Domain Event 'order.created' / 'order.paid' vào Outbox Table cùng transaction tạo đơn,
     *   sau đó phát tán qua RabbitMQ Event Broker. Catalog Service đăng ký subscribe và trừ kho bất đồng bộ an toàn,
     *   có cơ chế bù trừ (Compensating Transaction) nếu phát sinh sự cố.
     */
    if (paymentMethod === 'COD' && this.catalog.deductStock) {
      for (const item of priced.items) {
        this.catalog
          .deductStock(item.productId, item.quantity, created.order.id)
          .catch((err: any) => {
            console.warn(
              `[CheckoutService] Deduct stock failed for product ${item.productId}:`,
              err?.message,
            );
          });
      }
    }
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
    const outcome = await this.repository.applyPaymentResult(webhook);

    // Tự động kích hoạt trừ tồn kho phía Catalog khi thanh toán PayOS thành công (PAID)
    if (outcome === 'PAID' && this.catalog.deductStock && this.repository.findOrderByPayosCode) {
      this.repository
        .findOrderByPayosCode(webhook.orderCode)
        .then((order) => {
          if (order) {
            for (const item of order.items) {
              this.catalog
                .deductStock?.(item.productId, item.quantity, order.id)
                .catch((err: any) => {
                  console.warn(
                    `[CheckoutService] Deduct stock failed for product ${item.productId}:`,
                    err?.message,
                  );
                });
            }
          }
        })
        .catch((err: any) => {
          console.warn(`[CheckoutService] Error finding order for stock deduction:`, err?.message);
        });
    }

    return outcome;
  }

  // GET /orders/:id/payment-status
  public async paymentStatus(buyerId: string, orderId: string) {
    const order = await this.requireOwnedOrder(buyerId, orderId);
    let payment = await this.repository.latestPayment(order.id);

    // Tự động kiểm tra trực tiếp từ PayOS nếu đang ở trạng thái PENDING
    if (
      payment &&
      payment.status === 'PENDING' &&
      payment.payosOrderCode &&
      this.gateway.isConfigured() &&
      this.gateway.getPaymentStatus
    ) {
      try {
        const remote = await this.gateway.getPaymentStatus(payment.payosOrderCode);
        if (remote && remote.status === 'PAID') {
          await this.repository.applyPaymentResult({
            orderCode: payment.payosOrderCode,
            amount: payment.amount,
            success: true,
            raw: remote,
          });
          payment = await this.repository.latestPayment(order.id);
          const updatedOrder = await this.repository.findOrder(order.id);
          if (updatedOrder) {
            order.status = updatedOrder.status;
          }
        }
      } catch (err) {
        console.error('[paymentStatus] auto-check PayOS error:', err);
      }
    }

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
      checkoutUrl: payment?.checkoutUrl || null,
      paymentLinkId: payment?.paymentLinkId || null,
      qrCode: payment?.qrCode || null,
      bin: payment?.bin || null,
      accountNumber: payment?.accountNumber || null,
      accountName: payment?.accountName || null,
      description: payment?.description || null,
    };
  }

  private async requireOwnedOrder(buyerId: string, orderId: string): Promise<OrderRecord> {
    const trimmedId = typeof orderId === 'string' ? orderId.trim() : '';
    const order = trimmedId ? await this.repository.findOrder(trimmedId) : null;
    if (!order || order.buyerId !== buyerId) {
      throw new CheckoutError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    }
    return order;
  }

  private async ensureLink(order: OrderRecord, payment: PaymentRecord): Promise<PaymentRecord> {
    if (payment.checkoutUrl) return payment;

    try {
      const link = await this.gateway.createPaymentLink({
        orderId: order.id,
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
      return {
        ...payment,
        checkoutUrl: link.checkoutUrl,
        paymentLinkId: link.paymentLinkId,
        qrCode: link.qrCode,
        bin: link.bin,
        accountNumber: link.accountNumber,
        accountName: link.accountName,
        description: link.description,
      };
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
    const discountAmount = order.discountAmount || 0;
    const taxAmount = order.taxAmount || 0;
    const subtotal = order.totalAmount - order.shippingFee + discountAmount - taxAmount;

    return {
      orderId: order.id,
      orderCode: order.orderCode,
      status: order.status,
      paymentMethod: payment.paymentMethod || (payment.checkoutUrl ? 'PAYOS' : 'COD'),
      currency: CURRENCY,
      subtotal,
      discountAmount,
      taxAmount,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      promoCode: order.promoCode || null,
      shippingCarrier: order.shippingCarrier || null,
      shippingServiceName: order.shippingServiceName || null,
      estimatedDeliveryAt: order.estimatedDeliveryAt
        ? order.estimatedDeliveryAt.toISOString()
        : null,
      expiresAt: order.expiresAt.toISOString(),
      checkoutUrl: payment.checkoutUrl || null,
      paymentLinkId: payment.paymentLinkId || null,
      qrCode: payment.qrCode || null,
      bin: payment.bin || null,
      accountNumber: payment.accountNumber || null,
      accountName: payment.accountName || null,
      description: payment.description || null,
    };
  }

  private async priceCart(
    buyerId: string,
    lines: CartLineInput[],
    address: ShippingAddress,
    options?: { targetSellerId?: string; isAuction?: boolean },
  ) {
    const items: PricedLine[] = [];
    const sellers = new Set<string>();
    const stockByProduct: Record<string, number> = {};

    const allProducts = new Map<string, CatalogProduct>();
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
      allProducts.set(line.productId, product);
      sellers.add(product.sellerId);
    }

    // Nếu chỉ định targetSellerId -> Lọc chỉ các sản phẩm của Seller đó để tách đơn
    const activeLines = options?.targetSellerId
      ? lines.filter((l) => allProducts.get(l.productId)?.sellerId === options.targetSellerId)
      : lines;

    if (options?.targetSellerId && activeLines.length === 0) {
      throw new CheckoutError(
        404,
        'SELLER_PRODUCTS_NOT_FOUND',
        'Không tìm thấy sản phẩm của Seller được chỉ định trong giỏ hàng.',
        { availableSellerIds: Array.from(sellers) },
      );
    }

    const activeSellers = new Set<string>();
    for (const line of activeLines) {
      const product = allProducts.get(line.productId)!;
      activeSellers.add(product.sellerId);
      stockByProduct[product.id] = product.stockQuantity;
      const unitPrice = line.price !== undefined && line.price > 0 ? line.price : product.price;
      items.push({
        productId: product.id,
        title: product.title,
        unitPrice,
        quantity: line.quantity,
        subtotal: Math.round(unitPrice * line.quantity),
      });
    }

    if (activeSellers.size > 1) {
      throw new CheckoutError(
        422,
        'MIXED_SELLERS_NOT_SUPPORTED',
        'Mỗi đơn hàng chỉ được chứa sản phẩm của một Seller. Vui lòng chọn Shop cần thanh toán (targetSellerId).',
        { availableSellerIds: Array.from(activeSellers) },
      );
    }

    const shipping = await this.shipping.quote(address, activeLines);
    if (!shipping.supported) {
      throw new CheckoutError(
        422,
        'SHIPPING_NOT_SUPPORTED',
        'Khu vực này chưa được hỗ trợ giao hàng.',
      );
    }

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Tự động miễn phí vận chuyển cho đơn hàng từ 500.000đ trở lên (không áp dụng cho đấu giá)
    const FREE_SHIPPING_THRESHOLD = 500_000;
    const finalShippingFee =
      !options?.isAuction && subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shipping.fee;

    return {
      sellerId: Array.from(activeSellers)[0],
      items,
      stockByProduct,
      subtotal,
      shippingFee: finalShippingFee,
      total: subtotal + finalShippingFee,
      availableSellerIds: Array.from(sellers),
    };
  }
}
