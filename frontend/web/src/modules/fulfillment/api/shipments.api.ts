import { requestApi } from '@/lib/axios/api-client';
import { unwrap, type RequestApi } from '@/lib/axios/http';

export type Shipment = {
  id: string;
  code: string;
  trackingCode: string;
  orderId: string;
  order: string;
  carrier: string;
  recipient: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  city: string;
  currentLocation: string;
  status: string;
  statusCode: string;
  updated: string;
  updatedAt: string;
  createdAt: string;
  timeline: {
    title: string;
    status: 'done' | 'current' | 'pending';
    timestamp?: string;
    description?: string;
    location?: string;
  }[];
};

export type ShipmentQuery = {
  q?: string;
  carrier?: string;
  status?: string;
  orderId?: string;
  trackingCode?: string;
  page?: number;
  limit?: number;
};
export type ShipmentPage = {
  items: Shipment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function queryString(query: ShipmentQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
}

export function createShipmentsApi(request: RequestApi, prefix = '/support') {
  return {
    async list(query: ShipmentQuery = {}, signal?: AbortSignal): Promise<ShipmentPage> {
      const suffix = queryString(query);
      const raw = await request<{
        success: boolean;
        data: Shipment[];
        pagination?: { total: number; page: number; limit: number; totalPages: number };
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      }>(`${prefix}/shipments${suffix ? `?${suffix}` : ''}`, { signal });
      const items = unwrap<Shipment[]>(raw);
      const pagination = raw.pagination;
      return {
        items: Array.isArray(items) ? items : [],
        total: pagination?.total ?? raw.total ?? (Array.isArray(items) ? items.length : 0),
        page: pagination?.page ?? raw.page ?? 1,
        limit: pagination?.limit ?? raw.limit ?? (Array.isArray(items) ? items.length : 0),
        totalPages: pagination?.totalPages ?? raw.totalPages ?? 1,
      };
    },
    async getById(id: string, signal?: AbortSignal): Promise<Shipment> {
      return unwrap<Shipment>(
        await request(`${prefix}/shipments/${encodeURIComponent(id)}`, { signal }),
      );
    },
    async updateStatus(
      id: string,
      input: { status: string; location?: string; note?: string },
    ): Promise<Shipment> {
      return unwrap<Shipment>(
        await request(`${prefix}/shipments/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          body: input,
        }),
      );
    },
    async override(
      id: string,
      input: {
        carrier?: string;
        trackingCode?: string;
        shippingAddress?: string;
        city?: string;
        status?: string;
        reason?: string;
      },
    ): Promise<Shipment> {
      return unwrap<Shipment>(
        await request(`${prefix}/shipments/${encodeURIComponent(id)}/override`, {
          method: 'PATCH',
          body: input,
        }),
      );
    },
    async getByOrderId(orderId: string, signal?: AbortSignal): Promise<Shipment> {
      return unwrap<Shipment>(
        await request(`/fulfillments/shipments/by-order/${encodeURIComponent(orderId)}`, {
          signal,
        }),
      );
    },
    async requestRedelivery(
      id: string,
      input: { reason?: string; scheduledDate?: string } = {},
    ): Promise<Shipment> {
      return unwrap<Shipment>(
        await request(`/fulfillments/shipments/${encodeURIComponent(id)}/request-redelivery`, {
          method: 'POST',
          body: input,
        }),
      );
    },
    async confirmReturn(
      id: string,
      input: { returnCondition?: string; note?: string } = {},
    ): Promise<Shipment> {
      return unwrap<Shipment>(
        await request(`/fulfillments/shipments/${encodeURIComponent(id)}/confirm-return`, {
          method: 'POST',
          body: input,
        }),
      );
    },
    async triggerCarrierWebhook(input: {
      carrier?: string;
      tracking_code?: string;
      trackingCode?: string;
      order_id?: string;
      orderId?: string;
      status: string;
      current_location?: string;
      currentLocation?: string;
      shipper_name?: string;
      shipperName?: string;
      shipper_phone?: string;
      shipperPhone?: string;
      timestamp?: string;
    }) {
      const raw = await request<{
        success: boolean;
        message?: string;
        data: {
          shipmentId: string;
          orderId: string;
          trackingCode: string;
          status: string;
          currentLocation?: string;
          updatedAt: string;
        };
      }>('/fulfillments/carriers/webhook', {
        method: 'POST',
        body: input,
      });
      return unwrap(raw);
    },
  };
}

export const supportShipmentsApi = createShipmentsApi(requestApi);
