import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { CarrierCode, Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';

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
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(input: CarrierWebhookInput): Promise<Shipment> {
    const rawTracking = (input.trackingCode || '').trim();
    const rawOrderId = (input.orderId || '').trim();

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
      throw new ShipmentNotFoundException(rawTracking || rawOrderId || 'unknown');
    }

    const mappedStatus = this.mapStatus(input.status);
    const location =
      input.currentLocation ||
      (input.shipperName
        ? `${shipment.city} · Shipper ${input.shipperName} phụ trách`
        : shipment.currentLocation);

    shipment.updateStatus(mappedStatus, location);
    await this.shipmentRepository.update(shipment);

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
}
