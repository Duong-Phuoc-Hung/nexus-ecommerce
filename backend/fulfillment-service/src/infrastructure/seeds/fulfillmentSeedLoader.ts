import fs from 'node:fs';
import path from 'node:path';
import {
  SupportCase,
  SupportCasePriority,
  SupportCaseStatus,
} from '../../domain/entities/SupportCase';
import { CarrierCode, Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { SkuInventory } from '../../domain/entities/Inventory';

function readJsonFile<T>(filename: string): T | null {
  const candidatePaths = [
    path.resolve(__dirname, '../../../seeds', filename),
    path.resolve(__dirname, './', filename),
    path.resolve(process.cwd(), 'backend/fulfillment-service/seeds', filename),
    path.resolve(process.cwd(), 'seeds', filename),
    path.resolve(__dirname, '../../../data', filename),
    path.resolve(process.cwd(), 'backend/fulfillment-service/data', filename),
    path.resolve(process.cwd(), 'data', filename),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const content = fs.readFileSync(candidate, 'utf-8');
        return JSON.parse(content) as T;
      } catch (err) {
        console.warn(
          `[fulfillmentSeedLoader] Warning reading file ${candidate}:`,
          (err as Error).message,
        );
      }
    }
  }
  return null;
}

interface RawSupportCase {
  id: string;
  type: string;
  orderId: string;
  orderCode: string;
  userId: string;
  customer: string;
  reason: string;
  priority: string;
  status: string;
  offsetMinutes?: number;
  createdAt?: string;
}

export function loadSeedSupportCases(): SupportCase[] {
  const rawList = readJsonFile<RawSupportCase[]>('seed-support-cases.json');
  const now = Date.now();

  if (rawList && Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((raw) => {
      const createdAt = raw.createdAt
        ? new Date(raw.createdAt)
        : new Date(now + (raw.offsetMinutes || 0) * 60000);

      return new SupportCase({
        id: raw.id,
        type: raw.type,
        orderId: raw.orderId,
        orderCode: raw.orderCode,
        userId: raw.userId,
        customer: raw.customer,
        reason: raw.reason,
        priority: raw.priority as SupportCasePriority,
        status: raw.status as SupportCaseStatus,
        createdAt,
        updatedAt: createdAt,
      });
    });
  }

  // Fallback nếu không đọc được file JSON
  return [
    new SupportCase({
      id: 'CS-4021',
      type: 'Yêu cầu hoàn tiền',
      orderId: 'ord_01hqz555abc',
      orderCode: 'NX-ORD-8021',
      userId: '01a15822-43b8-78c3-a246-16bff78bc6e8',
      customer: 'Minh Anh',
      reason: 'Sản phẩm chưa đúng mô tả',
      priority: 'Cao',
      status: 'PENDING',
      createdAt: new Date(now - 12 * 60 * 1000),
    }),
  ];
}

interface RawShipment {
  id: string;
  orderId: string;
  carrier: string;
  trackingCode: string;
  status: string;
  shippingAddress: string;
  recipientName?: string;
  recipientPhone?: string;
  city?: string;
  currentLocation?: string;
  estimatedDaysAhead?: number;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function loadSeedShipments(): Shipment[] {
  const rawList = readJsonFile<RawShipment[]>('seed-shipments.json');

  if (rawList && Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((raw) => {
      let estDate: Date | undefined;
      if (raw.estimatedDeliveryDate) {
        estDate = new Date(raw.estimatedDeliveryDate);
      } else if (typeof raw.estimatedDaysAhead === 'number') {
        estDate = new Date(Date.now() + raw.estimatedDaysAhead * 86400000);
      }

      return new Shipment({
        id: raw.id,
        orderId: raw.orderId,
        carrier: (raw.carrier as CarrierCode) || CarrierCode.GHN,
        trackingCode: raw.trackingCode,
        status: (raw.status as ShipmentStatus) || ShipmentStatus.READY_TO_PICK,
        shippingAddress: raw.shippingAddress,
        recipientName: raw.recipientName,
        recipientPhone: raw.recipientPhone,
        city: raw.city,
        currentLocation: raw.currentLocation,
        estimatedDeliveryDate: estDate,
        actualDeliveryDate: raw.actualDeliveryDate ? new Date(raw.actualDeliveryDate) : undefined,
        createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
      });
    });
  }

  // Fallback nếu không đọc được file JSON
  return [
    new Shipment({
      id: 'shp_01hqz222trk',
      orderId: 'NX-ORD-8021',
      carrier: CarrierCode.GHN,
      trackingCode: 'GHN8829103VN',
      status: ShipmentStatus.PICKED,
      shippingAddress: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      recipientName: 'Minh Anh',
      recipientPhone: '0901234567',
      city: 'TP. Hồ Chí Minh',
      currentLocation: 'TP. Hồ Chí Minh · Trung tâm phân loại Tân Bình',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];
}

interface RawInventory {
  id: string;
  sku: string;
  productName: string;
  warehouseId?: string;
  warehouseName?: string;
  onHand: number;
  reserved: number;
  unavailableQuantity: number;
}

export function loadSeedInventory(): SkuInventory[] {
  const rawList = readJsonFile<RawInventory[]>('seed-inventory.json');
  const defaultWarehouseId = SkuInventory.DEFAULT_WAREHOUSE_ID;
  const defaultWarehouseName = SkuInventory.DEFAULT_WAREHOUSE_NAME;

  if (rawList && Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map(
      (raw) =>
        new SkuInventory({
          id: raw.id,
          sku: raw.sku,
          productName: raw.productName,
          warehouseId:
            (raw.warehouseId ? String(raw.warehouseId) : undefined) || defaultWarehouseId,
          warehouseName: raw.warehouseName || defaultWarehouseName,
          onHand: raw.onHand,
          reserved: raw.reserved,
          unavailableQuantity: raw.unavailableQuantity,
        }),
    );
  }

  // Fallback
  return [
    new SkuInventory({
      id: 'inv_01hqz_iphone15',
      sku: 'NX-IPHONE-15-BLUE',
      productName: 'iPhone 15 128GB Xanh Lam',
      warehouseId: defaultWarehouseId,
      warehouseName: defaultWarehouseName,
      onHand: 150,
      reserved: 25,
      unavailableQuantity: 2,
    }),
  ];
}
