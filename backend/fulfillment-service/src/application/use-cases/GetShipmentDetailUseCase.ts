import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import { ShipmentDetailDto } from '../dtos/ShipmentDetailDto';

export class GetShipmentDetailUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(shipmentId: string): Promise<ShipmentDetailDto> {
    const shipment = await this.shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new ShipmentNotFoundException(shipmentId);
    }

    return {
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      shippingAddress: shipment.shippingAddress,
    };
  }
}
