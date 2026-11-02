import { requestApi } from '@/lib/axios/api-client';
import { ApiError, unwrap, type RequestApi } from '@/lib/axios/http';

export type OrderListItem = {
  id: string;
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
  buyerId: string;
  buyer: string;
  email: string;
  sellerId: string;
  seller: string;
  product: string;
  date: string;
  total: number;
  items: {
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  status: string;
  tracking: string;
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  timeline: { status: string; title: string; timestamp: string; note?: string }[];
};

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
      };
    },
    async getPaymentLink(orderId: string, renew?: boolean) {
      return unwrap<{
        orderId: string;
        orderCode?: number;
        checkoutUrl?: string | null;
        paymentLinkId?: string | null;
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
      }>(await request(`/orders/${encodeURIComponent(orderId)}/payment-status`, { signal }));
    },
  };
}

export const ordersApi = createOrdersApi(requestApi);
