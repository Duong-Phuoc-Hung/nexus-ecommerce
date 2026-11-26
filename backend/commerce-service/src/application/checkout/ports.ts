export class CheckoutError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  province: string;
  district?: string;
  ward?: string;
  addressLine: string;
  country: string;
}

export interface CartLineInput {
  productId: string;
  quantity: number;
  price?: number;
}

export interface CatalogProduct {
  id: string;
  sellerId: string;
  title: string;
  price: number;
  stockQuantity: number;
  status: string;
  imageUrl?: string | null;
}

export interface ICatalogClient {
  findProduct(productId: string): Promise<CatalogProduct | null>;
  deductStock?(productId: string, quantity: number, orderId: string): Promise<boolean>;
  restoreStock?(productId: string, quantity: number, orderId: string): Promise<boolean>;
}

export interface IShippingQuote {
  quote(
    address: ShippingAddress,
    items: CartLineInput[],
  ): Promise<{ supported: boolean; fee: number }>;
}

export interface PaymentLinkRequest {
  orderId?: string;
  orderCode: number;
  amount: number;
  description: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  expiresAt: Date;
}

export interface PaymentLink {
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode?: string;
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  amount?: number;
  orderCode?: number;
}

export interface PaymentWebhook {
  orderCode: number;
  amount: number;
  success: boolean;
  reference?: string;
  raw: unknown;
}

export interface RefundRequest {
  orderId: string;
  orderCode?: number | string;
  amount: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundResponse {
  refundTransactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  completedAt: Date;
  providerConfirmed?: boolean;
  needsReconciliation?: boolean;
  demoMode?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundReconciliationResult {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  providerConfirmed: boolean;
  refundTransactionId?: string;
  completedAt?: Date;
  errorMessage?: string;
}

export interface IPaymentGateway {
  isConfigured(): boolean;
  createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLink>;
  verifyWebhook(body: unknown): PaymentWebhook | null;
  getPaymentStatus?(orderCode: number): Promise<{ status: string; amountPaid: number } | null>;
  executeRefund?(request: RefundRequest): Promise<RefundResponse>;
  getRefundStatus?(refundTransactionId: string): Promise<RefundReconciliationResult>;
}

export interface PricedLine {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingOption {
  optionId: string;
  carrier: string;
  carrierName: string;
  serviceName: string;
  fee: number;
  etaDaysMin: number;
  etaDaysMax: number;
  etaText: string;
  estimatedDeliveryAt: string;
  recommended: boolean;
}

export interface QuoteRecord {
  id: string;
  buyerId: string;
  sellerId: string;
  items: PricedLine[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  expiresAt: Date;
  promoCode?: string | null;
  promo?: {
    code: string;
    applied: boolean;
    discountAmount: number;
    reasonCode: string | null;
  } | null;
  selectedShippingOptionId?: string | null;
  shippingOptions?: ShippingOption[];
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  buyerId: string;
  sellerId: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingAddress: ShippingAddress;
  expiresAt: Date;
  items: PricedLine[];
  promoCode?: string | null;
  shippingCarrier?: string | null;
  shippingServiceName?: string | null;
  estimatedDeliveryAt?: Date | null;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  paymentMethod?: string;
  payosOrderCode: number;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl?: string;
  paymentLinkId?: string;
  qrCode?: string;
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  expiresAt?: Date;
  paidAt?: Date;
}

export interface CreateOrderParams {
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerId: string;
  sellerName?: string;
  items: PricedLine[];
  stockByProduct: Record<string, number>;
  shippingAddress: ShippingAddress;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod?: 'PAYOS' | 'COD';
  orderType?: 'AUCTION' | 'STANDARD';
  idempotencyKey?: string;
  requestHash: string;
  orderExpiresAt: Date;
  reservationExpiresAt: Date;
  promoCode?: string;
  promotionId?: string;
  shippingOptionId?: string;
  shippingCarrier?: string;
  shippingServiceName?: string;
  estimatedDeliveryAt?: Date;
}

export interface INotificationClient {
  sendInAppNotification(params: {
    recipientId: string;
    channel?: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<boolean>;
  sendOrderConfirmationEmail?(params: {
    email: string;
    title: string;
    body: string;
  }): Promise<boolean>;
}

export type ApplyPaymentOutcome =
  'PAID' | 'DUPLICATE' | 'UNKNOWN_ORDER_CODE' | 'AMOUNT_MISMATCH' | 'PAYMENT_FAILED';

export interface ICheckoutRepository {
  saveQuote(quote: QuoteRecord): Promise<void>;
  findQuote(id: string): Promise<QuoteRecord | null>;
  findOrderByIdempotency?(
    buyerId: string,
    idempotencyKey: string,
  ): Promise<{ order: OrderRecord; payment: PaymentRecord; requestHash: string } | null>;
  createOrder(params: CreateOrderParams): Promise<{
    order: OrderRecord;
    payment: PaymentRecord;
    replay: boolean;
    requestHash: string;
  }>;
  findOrder(orderId: string): Promise<OrderRecord | null>;
  latestPayment(orderId: string): Promise<PaymentRecord | null>;
  countPayments(orderId: string): Promise<number>;
  createPaymentAttempt(orderId: string, amount: number, expiresAt: Date): Promise<PaymentRecord>;
  markPaymentCancelled(paymentId: string): Promise<void>;
  setPaymentLink(paymentId: string, link: PaymentLink): Promise<void>;
  applyPaymentResult(webhook: PaymentWebhook): Promise<ApplyPaymentOutcome>;
  findOrderByPayosCode?(payosOrderCode: number): Promise<OrderRecord | null>;
}
