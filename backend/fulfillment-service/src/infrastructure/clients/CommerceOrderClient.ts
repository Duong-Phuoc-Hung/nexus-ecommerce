import { ShipmentStatus } from '../../domain/entities/Shipment';
import { buildServiceAuthHeader } from '../security/internal-service-auth';

/**
 * Ánh xạ trạng thái vận chuyển (Fulfillment / 3PL Carrier) sang trạng thái đơn hàng (Commerce Order Status).
 */
export function mapShipmentStatusToOrderStatus(
  shipmentStatus: ShipmentStatus | string,
): string | null {
  const normalized = (shipmentStatus || '').toString().toUpperCase().trim();
  switch (normalized) {
    case ShipmentStatus.READY_TO_PICK:
    case ShipmentStatus.PICKED:
      return 'PROCESSING';
    case ShipmentStatus.IN_TRANSIT:
    case ShipmentStatus.OUT_FOR_DELIVERY:
      return 'SHIPPED';
    case ShipmentStatus.DELIVERED:
      return 'DELIVERED';
    case ShipmentStatus.FAILED:
      // Giao thất bại vẫn giữ SHIPPED để shipper thử giao lại hoặc cập nhật
      return 'SHIPPED';
    case ShipmentStatus.RETURNED:
      return 'CANCELLED';
    default:
      return null;
  }
}

export interface ICommerceOrderClient {
  syncStatus(
    orderId: string,
    shipmentStatus: ShipmentStatus | string,
    note?: string,
  ): Promise<boolean>;
}

/**
 * Client kết nối trực tiếp từ Fulfillment Service sang Commerce Service (SRS 3.4 & 3.6).
 * Đảm bảo khi nhân viên hỗ trợ (Support Staff) hoặc Webhook ĐVVC đổi trạng thái vận đơn,
 * trạng thái đơn hàng ở màn hình Support Orders và Seller Orders được đồng bộ tức thì,
 * đồng thời kích hoạt trừ kho Catalog khi đơn hàng chuyển sang DELIVERED.
 */
export class CommerceOrderClient implements ICommerceOrderClient {
  constructor(
    private readonly commerceUrl: string = (
      process.env.COMMERCE_SERVICE_URL ||
      `http://127.0.0.1:${process.env.COMMERCE_SERVICE_PORT || 4003}`
    ).replace(/\/$/, ''),
  ) {}

  public async syncStatus(
    orderId: string,
    shipmentStatus: ShipmentStatus | string,
    note?: string,
  ): Promise<boolean> {
    const cleanOrderId = (orderId || '').trim();
    if (!cleanOrderId) return false;

    const mappedStatus = mapShipmentStatusToOrderStatus(shipmentStatus);
    if (!mappedStatus) return false;

    const targetUrl = `${this.commerceUrl}/api/v1/orders/${encodeURIComponent(cleanOrderId)}/status`;
    const bodyPayload = JSON.stringify({
      status: mappedStatus,
      note: note || `Đồng bộ tự động từ Vận chuyển (Fulfillment status: ${shipmentStatus})`,
    });

    let s2sHeaders: Record<string, string> = {};
    try {
      s2sHeaders = buildServiceAuthHeader({
        issuer: 'fulfillment-service',
        audience: 'commerce-service',
        scope: 'order:status:sync',
        resource: cleanOrderId,
      });
    } catch (err: any) {
      console.warn('[CommerceOrderClient] Không thể tạo S2S header:', err?.message || err);
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...s2sHeaders,
        },
        body: bodyPayload,
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        return true;
      }

      // Fallback sang POST nếu route PATCH không khớp ở proxy/gateway cũ
      if (response.status === 404 || response.status === 405) {
        const postRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...s2sHeaders,
          },
          body: bodyPayload,
          signal: AbortSignal.timeout(4000),
        });
        return postRes.ok;
      }

      console.warn(
        `[CommerceOrderClient] Đồng bộ trạng thái đơn hàng ${cleanOrderId} trả về HTTP ${response.status}`,
      );
      return false;
    } catch (err: any) {
      console.warn(
        `[CommerceOrderClient] Không thể kết nối tới Commerce Service (${targetUrl}):`,
        err?.message || err,
      );
      return false;
    }
  }
}
