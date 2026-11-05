import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import { mapShipmentToDto, ShipmentDetailDto } from '../dtos/ShipmentDetailDto';

export interface ConfirmReturnInput {
  shipmentId: string;
  returnedToSellerAt?: string | Date;
  condition: 'INTACT' | 'DAMAGED' | 'LOST';
}

/**
 * UseCase: ConfirmReturnUseCase
 * Xác nhận đơn giao thất bại đã hoàn về kho Người bán thành công để đóng hồ sơ vận đơn (SRS 3.6)
 */
export class ConfirmReturnUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(input: ConfirmReturnInput): Promise<ShipmentDetailDto> {
    const rawId = (input.shipmentId || '').trim();
    if (!rawId) {
      throw new ShipmentNotFoundException('empty_id');
    }

    let shipment = await this.shipmentRepository.findById(rawId);
    if (!shipment) {
      shipment = await this.shipmentRepository.findByTrackingCode(rawId);
    }
    if (!shipment) {
      shipment = await this.shipmentRepository.findByOrderId(rawId);
    }

    if (!shipment) {
      throw new ShipmentNotFoundException(rawId);
    }

    const returnDate =
      typeof input.returnedToSellerAt === 'string'
        ? new Date(input.returnedToSellerAt)
        : input.returnedToSellerAt || new Date();

    const condition = input.condition || 'INTACT';

    shipment.confirmReturn({
      returnedToSellerAt: returnDate,
      condition,
    });

    await this.shipmentRepository.update(shipment);
    return mapShipmentToDto(shipment);
  }
}
