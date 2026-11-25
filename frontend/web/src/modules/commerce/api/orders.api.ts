import { requestApi } from '@/lib/axios/api-client';
import { ApiError, unwrap, type RequestApi } from '@/lib/axios/http';

export type OrderListItem = {
  id: string;
  orderCode?: string;
  orderSource?: 'DIRECT' | 'AUCTION' | string;
  auctionId?: string | null;
  auctionWinningBid?: number | null;
  buyer: string;
  email: string;
  seller: string;
  product: string;
  date: string;
  total: number;
  totalAmount: number;
  status: string;
  tracking: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetail = {
  id: string;
  orderCode?: string;
  orderSource?: 'DIRECT' | 'AUCTION' | string;
  auctionId?: string | null;
  auctionWinningBid?: number | null;
  buyerId: string;
  buyer: string;
  email: string;
  sellerId: string;
  seller: string;
  product: string;
  date: string;
  total: number;
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  paymentMethod?: string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    province?: string;
    district?: string;
    ward?: string;
    addressLine?: string;
    country?: string;
  };
  items: {
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
  }[];
  status: string;
  tracking: string;
  paymentTransactionId?: string;
  refundTransactionId?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
  timeline: { status: string; title: string; timestamp: string; note?: string }[];
};

export function isAuctionOrder(
  order?: {
    id?: string;
    orderCode?: string;
    orderSource?: string;
    auctionId?: string | null;
  } | null,
): boolean {
  if (!order) return false;
  if (String(order.orderSource || '').toUpperCase() === 'AUCTION') return true;
  if (order.auctionId && String(order.auctionId).trim().length > 0) return true;
  const code = String(order.orderCode || order.id || '').toUpperCase();
  return code.startsWith('ORD-AUC-');
}

export type OrderPage = {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
export type OrderQuery = {
  q?: string;
  sellerId?: string;
  buyerId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
};

function searchParams(query: OrderQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
}

export function createOrdersApi(request: RequestApi) {
  return {
    async list(query: OrderQuery = {}, signal?: AbortSignal): Promise<OrderPage> {
      const suffix = searchParams(query);
      const raw = await request<{
        success: boolean;
        data: OrderListItem[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        pagination?: { total: number; page: number; limit: number; totalPages: number };
      }>(`/orders${suffix ? `?${suffix}` : ''}`, { signal });
      const items = unwrap<OrderListItem[]>(raw);
      const pagination = raw.pagination;
      return {
        items: Array.isArray(items) ? items : [],
        total: raw.total ?? pagination?.total ?? (Array.isArray(items) ? items.length : 0),
        page: raw.page ?? pagination?.page ?? 1,
        limit: raw.limit ?? pagination?.limit ?? (Array.isArray(items) ? items.length : 0),
        totalPages: raw.totalPages ?? pagination?.totalPages ?? 1,
      };
    },
    async getById(id: string, signal?: AbortSignal): Promise<OrderDetail> {
      return unwrap<OrderDetail>(await request(`/orders/${encodeURIComponent(id)}`, { signal }));
    },
    async cancel(id: string, reason: string) {
      return unwrap<OrderDetail>(
        await request(`/orders/${encodeURIComponent(id)}/cancel`, {
          method: 'POST',
          body: { reason },
        }),
      );
    },
    async refund(id: string, reason: string) {
      return unwrap<OrderDetail>(
        await request(`/orders/${encodeURIComponent(id)}/refund`, {
          method: 'POST',
          body: { reason },
        }),
      );
    },
    async rejectRefund(id: string, reason: string) {
      return unwrap<OrderDetail>(
        await request(`/orders/${encodeURIComponent(id)}/refund/cancel`, {
          method: 'POST',
          body: { reason },
        }),
      );
    },
    async executeRefund(id: string, input?: { refundAmount?: number; reason?: string }) {
      const raw = await request<{
        success: boolean;
        message?: string;
        data: {
          orderId: string;
          refundTransactionId: string;
          amount: number;
          status: 'PENDING' | 'SUCCESS' | 'FAILED';
          completedAt: string;
          message: string;
        };
      }>(`/orders/${encodeURIComponent(id)}/refund/execute`, {
        method: 'POST',
        body: input,
      });
      return unwrap<{
        orderId: string;
        refundTransactionId: string;
        amount: number;
        status: 'PENDING' | 'SUCCESS' | 'FAILED';
        completedAt: string;
        message: string;
      }>(raw);
    },
    async getRefundStatus(id: string) {
      return unwrap<{
        orderId: string;
        orderStatus: string;
        refundStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'NONE';
        refundTransactionId?: string;
        refundAmount?: number;
        completedAt?: string;
        canRefund: boolean;
      }>(await request(`/orders/${encodeURIComponent(id)}/refund/status`));
    },
    async dispatch(id: string, carrierCode?: string, trackingCode?: string) {
      const raw = await request<{ success: boolean; message?: string; data: OrderDetail }>(
        `/orders/${encodeURIComponent(id)}/dispatch`,
        {
          method: 'POST',
          body: { carrierCode, trackingCode },
        },
      );
      return unwrap<OrderDetail>(raw);
    },
    async updateStatus(id: string, status: string, note?: string) {
      const raw = await request<{ success: boolean; message?: string; data: OrderDetail }>(
        `/orders/${encodeURIComponent(id)}/status`,
        {
          method: 'PATCH',
          body: { status, note },
        },
      );
      return unwrap<OrderDetail>(raw);
    },
    async requestRefund(id: string, reason: string, evidenceUrls?: string[]) {
      const raw = await request<{ success: boolean; message?: string; data: OrderDetail }>(
        `/orders/${encodeURIComponent(id)}/refund/request`,
        {
          method: 'POST',
          body: { reason, evidenceUrls },
        },
      );
      return unwrap<OrderDetail>(raw);
    },
    async getQuote(input: {
      items: { productId: string; quantity: number }[];
      shippingAddress: {
        fullName: string;
        phone: string;
        province: string;
        district?: string;
        ward?: string;
        addressLine: string;
        country?: string;
      };
    }) {
      return unwrap<{
        quoteId: string;
        expiresAt: string;
        currency: string;
        sellerId?: string;
        items: { productId: string; quantity: number; unitPrice: number; totalPrice: number }[];
        subtotal: number;
        shippingFee: number;
        totalAmount: number;
      }>(await request('/checkout/quote', { method: 'POST', body: input }));
    },
    async checkout(
      input: {
        items: { productId: string; quantity: number }[];
        shippingAddress: {
          fullName: string;
          phone: string;
          province: string;
          district?: string;
          ward?: string;
          addressLine: string;
          country?: string;
        };
        quoteId?: string;
        paymentMethod?: 'PAYOS' | 'COD';
      },
      idempotencyKey?: string,
    ) {
      const headers: Record<string, string> = {};
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
      const raw = unwrap<Record<string, unknown>>(
        await request('/orders/checkout', {
          method: 'POST',
          body: {
            ...input,
            paymentMethod: input.paymentMethod || 'PAYOS',
          },
          headers,
        }),
      );
      if (
        String(raw.clientSecret ?? '').includes('skeleton') ||
        String(raw.message ?? '')
          .toLowerCase()
          .includes('skeleton')
      ) {
        throw new ApiError(
          'Checkout phía máy chủ hiện vẫn ở chế độ khung thử nghiệm; chưa thể tạo đơn hoặc thanh toán thật.',
          501,
          'CHECKOUT_NOT_READY',
        );
      }
      return raw as {
        orderId: string;
        orderCode?: number;
        status: string;
        paymentMethod: string;
        subtotal: number;
        shippingFee: number;
        totalAmount: number;
        currency: string;
        expiresAt?: string;
        checkoutUrl?: string | null;
        paymentLinkId?: string | null;
        qrCode?: string | null;
        bin?: string | null;
        accountNumber?: string | null;
        accountName?: string | null;
        description?: string | null;
      };
    },
    async getPaymentLink(orderId: string, renew?: boolean) {
      return unwrap<{
        orderId: string;
        orderCode?: number;
        checkoutUrl?: string | null;
        paymentLinkId?: string | null;
        qrCode?: string | null;
        bin?: string | null;
        accountNumber?: string | null;
        accountName?: string | null;
        description?: string | null;
        reused?: boolean;
      }>(
        await request(`/orders/${encodeURIComponent(orderId)}/payment-link`, {
          method: 'POST',
          body: { renew: Boolean(renew) },
        }),
      );
    },
    async getPaymentStatus(orderId: string, signal?: AbortSignal) {
      return unwrap<{
        orderId: string;
        orderCode?: number;
        orderStatus: string;
        paymentStatus: string;
        amount: number;
        currency: string;
        paidAt: string | null;
        expiresAt: string;
        expired: boolean;
        checkoutUrl?: string | null;
        paymentLinkId?: string | null;
        qrCode?: string | null;
        bin?: string | null;
        accountNumber?: string | null;
        accountName?: string | null;
        description?: string | null;
      }>(await request(`/orders/${encodeURIComponent(orderId)}/payment-status`, { signal }));
    },
  };
}

export const ordersApi = createOrdersApi(requestApi);
