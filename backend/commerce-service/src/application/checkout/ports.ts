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
}

export interface IShippingQuote {
  quote(
    address: ShippingAddress,
    items: CartLineInput[],
  ): Promise<{ supported: boolean; fee: number }>;
}

export interface PaymentLinkRequest {
  orderCode: number;
  amount: number;
  description: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  expiresAt: Date;
}

export interface PaymentLink {
  paymentLinkId: string;
  checkoutUrl: string;
}

export interface PaymentWebhook {
  orderCode: number;
  amount: number;
  success: boolean;
  reference?: string;
  raw: unknown;
}

export interface IPaymentGateway {
  isConfigured(): boolean;
  createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLink>;
  verifyWebhook(body: unknown): PaymentWebhook | null;
}

export interface PricedLine {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface QuoteRecord {
  id: string;
  buyerId: string;
  sellerId: string;
  items: PricedLine[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  expiresAt: Date;
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  buyerId: string;
  sellerId: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  shippingAddress: ShippingAddress;
  expiresAt: Date;
  items: PricedLine[];
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
  expiresAt?: Date;
  paidAt?: Date;
}

export interface CreateOrderParams {
  buyerId: string;
  sellerId: string;
  items: PricedLine[];
  stockByProduct: Record<string, number>;
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod?: 'PAYOS' | 'COD';
  idempotencyKey?: string;
  requestHash: string;
  orderExpiresAt: Date;
  reservationExpiresAt: Date;
}

export type ApplyPaymentOutcome =
  'PAID' | 'DUPLICATE' | 'UNKNOWN_ORDER_CODE' | 'AMOUNT_MISMATCH' | 'PAYMENT_FAILED';

export interface ICheckoutRepository {
  saveQuote(quote: QuoteRecord): Promise<void>;
  findQuote(id: string): Promise<QuoteRecord | null>;
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
}
