import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import { CarrierCode, ShipmentStatus } from '../../domain/entities/Shipment';
import { mapShipmentToDto, ShipmentDetailDto } from '../dtos/ShipmentDetailDto';

export interface ManualOverrideShipmentRequest {
  shipmentId: string;
  carrier?: CarrierCode | string;
  trackingCode?: string;
  shippingAddress?: string;
  city?: string;
  status?: ShipmentStatus | string;
  reason?: string;
  operatorId?: string;
}

export class ManualOverrideShipmentUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(req: ManualOverrideShipmentRequest): Promise<ShipmentDetailDto> {
    const trimmed = (req.shipmentId || '').trim();
    let shipment = await this.shipmentRepository.findById(trimmed);
    if (!shipment) {
      shipment = await this.shipmentRepository.findByTrackingCode(trimmed);
    }

    if (!shipment) {
      throw new ShipmentNotFoundException(trimmed);
    }

    let resolvedCarrier: CarrierCode | undefined;
    if (req.carrier) {
      const c = req.carrier.toUpperCase().trim();
      if (c === 'GHN') resolvedCarrier = CarrierCode.GHN;
      else if (c === 'GHTK') resolvedCarrier = CarrierCode.GHTK;
      else if (c === 'VNPOST' || c === 'VN_POST') resolvedCarrier = CarrierCode.VNPOST;
      else if (c === 'VIETTEL_POST' || c === 'VIETTELPOST' || c.includes('VIETTEL'))
        resolvedCarrier = CarrierCode.VIETTEL_POST;
    }

    let resolvedStatus: ShipmentStatus | undefined;
    if (req.status) {
      const s = req.status.toUpperCase().trim();
      if (s in ShipmentStatus) {
        resolvedStatus = s as ShipmentStatus;
      }
    }

    shipment.manualOverride({
      carrier: resolvedCarrier,
      trackingCode: req.trackingCode,
      shippingAddress: req.shippingAddress,
      city: req.city,
      status: resolvedStatus,
    });

    await this.shipmentRepository.update(shipment);

    return mapShipmentToDto(shipment);
  }
}
