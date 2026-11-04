import { CarrierCode, Shipment, ShipmentStatus } from '../../domain/entities/Shipment';

export interface ShipmentTimelineStep {
  title: string;
  status: 'done' | 'current' | 'pending';
  timestamp?: string;
  description?: string;
  location?: string;
}

export interface ShipmentDetailDto {
  // Canonical ID & Codes
  id: string;
  shipmentId?: string;
  code: string;
  trackingCode: string;
  carrierCode?: string;
  carrierName?: string;
  shippingFee?: number;

  // Order link
  orderId: string;
  order: string;

  // Carrier & Recipient / Sender (Phục vụ In phiếu gửi hàng)
  carrier: string;
  recipient: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  city: string;
  currentLocation: string;
  sender?: {
    name: string;
    phone: string;
    warehouseName: string;
    address: string;
  };
  receiver?: {
    name: string;
    phone: string;
    address: string;
  };
  codAmount?: number;
  paymentMethod?: string;
  shippingNote?: string;

  // Status with dual compatibility
  status: string; // Vietnamese friendly status label (e.g. 'Đang giao')
  statusCode: string; // Canonical enum string (e.g. 'IN_TRANSIT')
  statusEnum: ShipmentStatus;

  // Timestamps
  updated: string; // Formatted date string (e.g. '18/10/2026 · 14:30')
  updatedAt: string;
  createdAt: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;

  // Lifecycle timeline
  timeline: ShipmentTimelineStep[];
}

export function mapShipmentStatusToVietnamese(status: ShipmentStatus | string): string {
  switch (status) {
    case ShipmentStatus.READY_TO_PICK:
    case 'READY_TO_PICK':
      return 'Đã tạo vận đơn';
    case ShipmentStatus.PICKED:
    case 'PICKED':
      return 'Đang lấy hàng';
    case ShipmentStatus.IN_TRANSIT:
    case 'IN_TRANSIT':
      return 'Đang giao';
    case ShipmentStatus.OUT_FOR_DELIVERY:
    case 'OUT_FOR_DELIVERY':
      return 'Đang phát hàng';
    case ShipmentStatus.DELIVERED:
    case 'DELIVERED':
      return 'Đã giao';
    case ShipmentStatus.FAILED:
    case 'FAILED':
      return 'Giao thất bại';
    case ShipmentStatus.RETURNED:
    case 'RETURNED':
      return 'Đã trả hàng';
    default:
      return String(status);
  }
}

export function formatVietnameseDateTime(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${d}/${m}/${y} · ${hours}:${minutes}`;
}

export function buildShipmentTimeline(shipment: Shipment): ShipmentTimelineStep[] {
  const isDelivered = shipment.status === ShipmentStatus.DELIVERED;
  const isOutForDelivery = shipment.status === ShipmentStatus.OUT_FOR_DELIVERY || isDelivered;
  const isInTransit = shipment.status === ShipmentStatus.IN_TRANSIT || isOutForDelivery;
  const isPicked = shipment.status === ShipmentStatus.PICKED || isInTransit;

  return [
    {
      title: 'Đã tạo vận đơn',
      status: 'done',
      timestamp: formatVietnameseDateTime(shipment.createdAt),
      description: 'Hệ thống đã phát hành vận đơn và mã vận chuyển.',
    },
    {
      title: 'Đã lấy hàng',
      status: isPicked ? 'done' : 'pending',
      timestamp: isPicked ? formatVietnameseDateTime(shipment.updatedAt) : undefined,
      description: isPicked
        ? 'Bưu tá đã lấy hàng từ kho của người bán.'
        : 'Đang đợi bưu tá tới kho lấy hàng.',
    },
    {
      title: mapShipmentStatusToVietnamese(shipment.status),
      status: isDelivered ? 'done' : 'current',
      timestamp: formatVietnameseDateTime(shipment.updatedAt),
      location: shipment.currentLocation,
      description: `Vị trí ghi nhận: ${shipment.currentLocation}`,
    },
    {
      title: 'Đã giao',
      status: isDelivered ? 'done' : 'pending',
      timestamp: shipment.actualDeliveryDate
        ? formatVietnameseDateTime(shipment.actualDeliveryDate)
        : undefined,
      description: isDelivered
        ? 'Người nhận đã nhận hàng thành công.'
        : 'Dự kiến giao trong 24-48 giờ tới.',
    },
  ];
}

export function mapShipmentToDto(shipment: Shipment): ShipmentDetailDto {
  const statusLabel = mapShipmentStatusToVietnamese(shipment.status);
  const updatedLabel = formatVietnameseDateTime(shipment.updatedAt);

  const carrierNameMap: Record<string, string> = {
    GHN: 'Giao Hàng Nhanh',
    GHTK: 'Giao Hàng Tiết Kiệm',
    VNPOST: 'Bưu điện Việt Nam VNPost',
    VIETTEL_POST: 'Viettel Post',
  };

  return {
    id: shipment.id,
    shipmentId: shipment.id,
    code: shipment.trackingCode,
    trackingCode: shipment.trackingCode,
    carrierCode: shipment.carrier,
    carrierName: carrierNameMap[shipment.carrier] || shipment.carrier,
    shippingFee: 32000,
    orderId: shipment.orderId,
    order: shipment.orderId,
    carrier: shipment.carrier,
    recipient: shipment.recipientName,
    recipientName: shipment.recipientName,
    recipientPhone: shipment.recipientPhone,
    shippingAddress: shipment.shippingAddress,
    city: shipment.city,
    currentLocation: shipment.currentLocation,
    sender: {
      name: 'Gian hàng Đối tác Nexus',
      phone: '19006868',
      warehouseName: 'Kho Tổng Nexus (WH_001)',
      address: 'Tầng 5, Tòa nhà Nexus, Quận 1, TP.HCM',
    },
    receiver: {
      name: shipment.recipientName,
      phone: shipment.recipientPhone,
      address: shipment.shippingAddress,
    },
    codAmount: 0,
    paymentMethod: 'PAYOS_VIETQR',
    shippingNote: 'Cho xem hàng, không cho thử',
    status: statusLabel,
    statusCode: shipment.status,
    statusEnum: shipment.status,
    updated: updatedLabel,
    updatedAt: shipment.updatedAt.toISOString(),
    createdAt: shipment.createdAt.toISOString(),
    estimatedDeliveryDate: shipment.estimatedDeliveryDate?.toISOString(),
    actualDeliveryDate: shipment.actualDeliveryDate?.toISOString(),
    timeline: buildShipmentTimeline(shipment),
  };
}
