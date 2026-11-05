import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { CarrierCode, Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { mapShipmentToDto, ShipmentDetailDto } from '../dtos/ShipmentDetailDto';

export interface CreateShipmentInput {
  id?: string;
  orderId: string;
  carrier?: string;
  trackingCode?: string;
  shippingAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  city?: string;
  currentLocation?: string;
  status?: string;
}

/**
 * Use case: CreateShipmentUseCase
 * Đăng ký hoặc tự động cấp phát vận đơn (Shipment) trong phân hệ Fulfillment.
 * Phục vụ đồng bộ từ Commerce Service và kích hoạt môi trường vận chuyển Sandbox tức thì (SRS 3.6).
 */
export class CreateShipmentUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(input: CreateShipmentInput): Promise<ShipmentDetailDto> {
    const rawOrderId = (input.orderId || '').trim();
    if (!rawOrderId) {
      throw new Error('orderId là bắt buộc để khởi tạo vận đơn.');
    }

    // 1. Kiểm tra vận đơn đã tồn tại cho đơn hàng này chưa (Đảm bảo Idempotency)
    const existing = await this.shipmentRepository.findByOrderId(rawOrderId);
    if (existing) {
      if (input.trackingCode || input.carrier || input.status) {
        const nextCarrier = input.carrier ? this.mapCarrier(input.carrier) : undefined;
        const nextStatus = input.status ? this.mapStatus(input.status) : undefined;
        existing.manualOverride({
          carrier: nextCarrier,
          trackingCode: input.trackingCode || undefined,
          shippingAddress: input.shippingAddress || undefined,
          city: input.city || undefined,
          status: nextStatus,
        });
        await this.shipmentRepository.update(existing);
      }
      return mapShipmentToDto(existing);
    }

    // 2. Tự động sinh mã vận đơn trackingCode & id chuẩn nếu chưa có
    const carrier = this.mapCarrier(input.carrier);
    const trackingCode =
      (input.trackingCode || '').trim() ||
      `${carrier}${
        rawOrderId
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(-8)
          .toUpperCase() || Math.floor(10000000 + Math.random() * 90000000)
      }`;
    const id =
      (input.id || '').trim() ||
      `shp_${rawOrderId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || Date.now()}`;
    const status = this.mapStatus(input.status);

    const defaultLocation =
      status === ShipmentStatus.READY_TO_PICK
        ? 'Kho tổng Nexus · Đang chờ lấy hàng'
        : status === ShipmentStatus.PICKED
          ? 'Trung tâm khai thác · Đã lấy hàng'
          : status === ShipmentStatus.IN_TRANSIT
            ? 'Đang luân chuyển trên trục vận chuyển'
            : status === ShipmentStatus.OUT_FOR_DELIVERY
              ? 'Bưu cục phát · Đang giao cho khách hàng'
              : status === ShipmentStatus.DELIVERED
                ? 'Đã giao hàng thành công'
                : 'Kho vận';

    const shipment = new Shipment({
      id,
      orderId: rawOrderId,
      carrier,
      trackingCode,
      status,
      shippingAddress: input.shippingAddress || 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
      recipientName: input.recipientName || 'Khách hàng',
      recipientPhone: input.recipientPhone || '0901234567',
      city: input.city || 'Hà Nội',
      currentLocation: input.currentLocation || defaultLocation,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.shipmentRepository.save(shipment);
    return mapShipmentToDto(shipment);
  }

  private mapCarrier(raw?: string): CarrierCode {
    const c = (raw || '').toUpperCase().trim();
    if (c === 'GHTK') return CarrierCode.GHTK;
    if (c === 'VNPOST') return CarrierCode.VNPOST;
    if (c === 'VIETTEL_POST' || c === 'VIETTELPOST' || c === 'VTP') return CarrierCode.VIETTEL_POST;
    return CarrierCode.GHN;
  }

  private mapStatus(raw?: string): ShipmentStatus {
    const s = (raw || '').toUpperCase().trim();
    switch (s) {
      case 'PICKED':
      case 'PICKED_UP':
        return ShipmentStatus.PICKED;
      case 'IN_TRANSIT':
      case 'DELIVERING':
      case 'TRANSIT':
        return ShipmentStatus.IN_TRANSIT;
      case 'OUT_FOR_DELIVERY':
        return ShipmentStatus.OUT_FOR_DELIVERY;
      case 'DELIVERED':
      case 'SUCCESS':
        return ShipmentStatus.DELIVERED;
      case 'FAILED':
        return ShipmentStatus.FAILED;
      case 'RETURNED':
        return ShipmentStatus.RETURNED;
      default:
        return ShipmentStatus.READY_TO_PICK;
    }
  }
}
