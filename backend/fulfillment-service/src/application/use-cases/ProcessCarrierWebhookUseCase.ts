import crypto from 'node:crypto';
import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { CarrierCode, Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import {
  CommerceOrderClient,
  ICommerceOrderClient,
} from '../../infrastructure/clients/CommerceOrderClient';

export interface CarrierWebhookInput {
  carrier?: string;
  trackingCode?: string;
  orderId?: string;
  status: string;
  currentLocation?: string;
  shipperName?: string;
  shipperPhone?: string;
  timestamp?: string;
}

export class ProcessCarrierWebhookUseCase {
  private readonly commerceClient: ICommerceOrderClient;

  constructor(
    private readonly shipmentRepository: IShipmentRepository,
    commerceClient?: ICommerceOrderClient,
  ) {
    this.commerceClient = commerceClient || new CommerceOrderClient();
  }

  public async execute(input: CarrierWebhookInput): Promise<Shipment> {
    const rawTracking = (input.trackingCode || '')
      .replace(/^[#]/, '')
      .replace(/^NEX-TRK-/i, '')
      .trim();
    const rawOrderId = (input.orderId || '')
      .replace(/^[#]/, '')
      .replace(/^NEX-TRK-/i, '')
      .trim();

    let shipment: Shipment | null = null;
    if (rawTracking) {
      shipment = await this.shipmentRepository.findByTrackingCode(rawTracking);
      if (!shipment) {
        shipment = await this.shipmentRepository.findById(rawTracking);
      }
    }
    if (!shipment && rawOrderId) {
      shipment = await this.shipmentRepository.findByOrderId(rawOrderId);
    }

    if (!shipment) {
      if (rawTracking || rawOrderId) {
        // Tự động cấp phát vận đơn Sandbox tức thì cho mã đơn / tracking thử nghiệm
        const autoOrderId =
          rawOrderId ||
          (rawTracking.startsWith('ORD') || rawTracking.startsWith('NX-')
            ? rawTracking
            : `ORD-${Date.now().toString().slice(-6)}`);
        const carrierCode =
          (input.carrier || '').toUpperCase() === 'GHTK' ? CarrierCode.GHTK : CarrierCode.GHN;
        const autoTracking =
          rawTracking ||
          `${carrierCode}${autoOrderId
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(-8)
            .toUpperCase()}`;

        shipment = new Shipment({
          id: crypto.randomUUID(),
          orderId: autoOrderId,
          carrier: carrierCode,
          trackingCode: autoTracking,
          status: ShipmentStatus.READY_TO_PICK,
          shippingAddress: 'Địa chỉ giao hàng (Sandbox Testbed)',
          recipientName: 'Khách hàng Sandbox',
          recipientPhone: '0901234567',
          city: 'TP. Hồ Chí Minh',
          currentLocation: 'Kho trung chuyển',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await this.shipmentRepository.save(shipment);
      } else {
        throw new ShipmentNotFoundException(rawTracking || rawOrderId || 'unknown');
      }
    }

    const mappedStatus = this.mapStatus(input.status);

    // Chống sự kiện webhook cũ/trễ làm lùi trạng thái vận đơn & đơn hàng (P1 Phát hiện 05)
    if (input.timestamp) {
      const eventTime = new Date(input.timestamp).getTime();
      if (!Number.isNaN(eventTime) && eventTime < shipment.updatedAt.getTime() - 5000) {
        return shipment;
      }
    }
    if (!this.isValidProgression(shipment.status, mappedStatus)) {
      return shipment;
    }

    const location =
      input.currentLocation ||
      (input.shipperName
        ? `Bưu cục ${shipment.city} · Shipper ${input.shipperName} phụ trách`
        : undefined);

    shipment.updateStatus(mappedStatus, location);
    await this.shipmentRepository.update(shipment);

    // Tự động đồng bộ trạng thái đơn hàng sang Commerce Service (SRS 3.4 & 3.6)
    if (shipment.orderId) {
      await this.commerceClient.syncStatus(
        shipment.orderId,
        mappedStatus,
        `Cập nhật qua 3PL Carrier Webhook (${input.carrier || 'Carrier'})`,
      );
      if (
        mappedStatus === ShipmentStatus.DELIVERED &&
        typeof this.commerceClient.confirmCodPayment === 'function'
      ) {
        try {
          await this.commerceClient.confirmCodPayment(
            shipment.orderId,
            '3PL Webhook: Shipper đã giao kiện hàng thành công và thu đủ tiền COD.',
          );
        } catch (err: any) {
          console.warn(
            '[ProcessCarrierWebhookUseCase] confirmCodPayment warning:',
            err?.message || err,
          );
        }
      }
    }

    return shipment;
  }

  private mapStatus(raw: string): ShipmentStatus {
    const normalized = (raw || '').toUpperCase().trim();
    switch (normalized) {
      case 'READY_TO_PICK':
      case 'CREATED':
        return ShipmentStatus.READY_TO_PICK;
      case 'PICKED':
      case 'PICKED_UP':
      case 'PICKING':
        return ShipmentStatus.PICKED;
      case 'IN_TRANSIT':
      case 'DELIVERING':
      case 'TRANSIT':
        return ShipmentStatus.IN_TRANSIT;
      case 'OUT_FOR_DELIVERY':
        return ShipmentStatus.OUT_FOR_DELIVERY;
      case 'DELIVERED':
      case 'SUCCESS':
      case 'COMPLETED':
        return ShipmentStatus.DELIVERED;
      case 'FAILED':
      case 'CANCELLED':
        return ShipmentStatus.FAILED;
      case 'RETURNED':
      case 'RETURNING':
        return ShipmentStatus.RETURNED;
      default:
        return ShipmentStatus.IN_TRANSIT;
    }
  }

  private isValidProgression(current: ShipmentStatus, next: ShipmentStatus): boolean {
    if (current === ShipmentStatus.DELIVERED || current === ShipmentStatus.RETURNED) {
      return next === current;
    }
    if (next === ShipmentStatus.FAILED) {
      return (
        current === ShipmentStatus.PICKED ||
        current === ShipmentStatus.IN_TRANSIT ||
        current === ShipmentStatus.OUT_FOR_DELIVERY
      );
    }
    if (next === ShipmentStatus.RETURNED) {
      return current === ShipmentStatus.FAILED;
    }
    const orderRank: Partial<Record<ShipmentStatus, number>> = {
      [ShipmentStatus.READY_TO_PICK]: 0,
      [ShipmentStatus.PICKED]: 1,
      [ShipmentStatus.IN_TRANSIT]: 2,
      [ShipmentStatus.OUT_FOR_DELIVERY]: 3,
      [ShipmentStatus.DELIVERED]: 4,
    };
    const currRank = orderRank[current];
    const nextRank = orderRank[next];
    if (currRank !== undefined && nextRank !== undefined) {
      return nextRank >= currRank;
    }
    return true;
  }
}
