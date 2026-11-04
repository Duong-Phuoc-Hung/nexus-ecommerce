export type SkuInventoryItem = {
  id?: string;
  sku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  unavailableQuantity?: number;
  updatedAt?: string;
};
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, type RequestApi } from '@/lib/axios/http';
import type { Shipment } from '../types/shipment.types';
import type { PageResult } from '@/modules/commerce/types/order.types';

export function createFulfillmentApi(request: RequestApi) {
  return {
    async listShipments(
      query: { query?: string; status?: string; page?: number; limit?: number },
      signal?: AbortSignal,
    ): Promise<PageResult<Shipment>> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query))
        if (value !== undefined && value !== '') params.set(key, String(value));
      const raw = (await request(`/fulfillments/shipments?${params}`, { signal })) as Record<
        string,
        unknown
      >;
      const pagination = (raw.pagination ?? {}) as Record<string, unknown>;
      const data = Array.isArray(raw.data) ? (raw.data as Shipment[]) : [];
      return {
        items: data,
        page: Number(pagination.page ?? 1),
        limit: Number(pagination.limit ?? data.length),
        total: Number(pagination.total ?? data.length),
        totalPages: Number(pagination.totalPages ?? 1),
      };
    },
    async getShipment(id: string, signal?: AbortSignal) {
      return unwrap<Shipment>(
        await request(`/fulfillments/shipments/${encodeURIComponent(id)}`, { signal }),
      );
    },
    async updateShipmentStatus(
      id: string,
      input: { status: string; location?: string; note?: string },
    ) {
      return unwrap<Shipment>(
        await request(`/fulfillments/shipments/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          body: input,
        }),
      );
    },
    async overrideShipment(
      id: string,
      input: {
        carrier?: string;
        trackingCode?: string;
        shippingAddress?: string;
        city?: string;
        status?: string;
        reason: string;
      },
    ) {
      return unwrap<Shipment>(
        await request(`/fulfillments/shipments/${encodeURIComponent(id)}/override`, {
          method: 'PATCH',
          body: input,
        }),
      );
    },
    async listInventory(
      query: { sku?: string; warehouseId?: string; page?: number; limit?: number } = {},
      signal?: AbortSignal,
    ): Promise<SkuInventoryItem[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') params.set(key, String(value));
      }
      const raw = await request<{ success: boolean; data: SkuInventoryItem[] }>(
        `/fulfillments/inventory${params.toString() ? `?${params.toString()}` : ''}`,
        { signal },
      );
      return unwrap<SkuInventoryItem[]>(raw);
    },
    async adjustInventory(input: {
      sku: string;
      warehouseId?: string;
      adjustmentType: 'STOCK_IN' | 'STOCK_OUT' | 'DAMAGE';
      quantity: number;
      reason: string;
    }): Promise<{
      sku: string;
      productName: string;
      warehouseId: string;
      warehouseName: string;
      onHand: number;
      reserved: number;
      available: number;
    }> {
      const raw = await request<{
        success: boolean;
        data: {
          sku: string;
          productName: string;
          warehouseId: string;
          warehouseName: string;
          onHand: number;
          reserved: number;
          available: number;
        };
      }>('/fulfillments/inventory/adjust', {
        method: 'POST',
        body: input,
      });
      return unwrap(raw);
    },
  };
}
export const fulfillmentApi = createFulfillmentApi(requestApi);
