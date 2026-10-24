import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import { mapShipmentToDto, ShipmentDetailDto } from '../dtos/ShipmentDetailDto';

export class GetShipmentDetailUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(identifier: string): Promise<ShipmentDetailDto> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      throw new ShipmentNotFoundException('empty_id');
    }

    // Tìm kiếm theo ID hoặc Tracking Code
    let shipment = await this.shipmentRepository.findById(trimmed);
    if (!shipment) {
      shipment = await this.shipmentRepository.findByTrackingCode(trimmed);
    }
    if (!shipment) {
      shipment = await this.shipmentRepository.findByOrderId(trimmed);
    }

    if (!shipment) {
      throw new ShipmentNotFoundException(trimmed);
    }

    return mapShipmentToDto(shipment);
  }
}
