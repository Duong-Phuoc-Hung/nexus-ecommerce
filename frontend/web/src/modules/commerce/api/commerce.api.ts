import { requestApi } from '@/lib/axios/api-client';
import { ApiError, unwrap, type RequestApi } from '@/lib/axios/http';
import type { OrderDetail, OrderSummary, PageResult } from '../types/order.types';

type Row = Record<string, unknown>;
const object = (x: unknown): Row => (x && typeof x === 'object' ? (x as Row) : {});
function pageOf<T>(raw: unknown, key: string): PageResult<T> {
  const root = object(raw);
  const data = root.data;
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(object(data)[key])
      ? (object(data)[key] as T[])
      : [];
  const p = object(root.pagination);
  return {
    items: rows as T[],
    page: Number(p.page ?? root.page ?? 1),
    limit: Number(p.limit ?? root.limit ?? rows.length),
    total: Number(p.total ?? root.total ?? rows.length),
    totalPages: Number(p.totalPages ?? root.totalPages ?? 1),
  };
}
export function createCommerceApi(request: RequestApi) {
  return {
    async listOrders(
      query: {
        buyerId?: string;
        sellerId?: string;
        q?: string;
        status?: string;
        page?: number;
        limit?: number;
      },
      signal?: AbortSignal,
    ) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query))
        if (value !== undefined && value !== '') params.set(key, String(value));
      const raw = await request(`/orders?${params}`, { signal });
      return pageOf<OrderSummary>(raw, 'items');
    },
    async getOrder(id: string, signal?: AbortSignal) {
      const raw = unwrap<unknown>(await request(`/orders/${encodeURIComponent(id)}`, { signal }));
      const value = object(raw);
      if (typeof value.id !== 'string')
        throw new ApiError('Thông tin đơn hàng chưa đúng định dạng.', undefined, 'INVALID_ORDER');
      return value as unknown as OrderDetail;
    },
    async cancelOrder(id: string, reason: string) {
      return unwrap<OrderDetail>(
        await request(`/orders/${encodeURIComponent(id)}/cancel`, {
          method: 'POST',
          body: { reason },
        }),
      );
    },
    async refundOrder(id: string, reason: string) {
      return unwrap<OrderDetail>(
        await request(`/orders/${encodeURIComponent(id)}/refund`, {
          method: 'POST',
          body: { reason },
        }),
      );
    },
    async checkout(input: {
      items: { productId: string; quantity: number }[];
      shippingAddress: Record<string, string>;
    }) {
      const raw = unwrap<Record<string, unknown>>(
        await request('/orders/checkout', { method: 'POST', body: input }),
      );
      if (
        String(raw.clientSecret ?? '').includes('skeleton') ||
        String(raw.message ?? '')
          .toLowerCase()
          .includes('skeleton')
      )
        throw new ApiError(
          'Checkout phía máy chủ hiện vẫn ở chế độ khung thử nghiệm; chưa thể tạo đơn hoặc thanh toán thật.',
          501,
          'CHECKOUT_NOT_READY',
        );
      return raw;
    },
  };
}
export const commerceApi = createCommerceApi(requestApi);
