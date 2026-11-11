import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import { ShipmentStatus } from '../../domain/entities/Shipment';
import { mapShipmentToDto, ShipmentDetailDto } from '../dtos/ShipmentDetailDto';
import {
  CommerceOrderClient,
  ICommerceOrderClient,
} from '../../infrastructure/clients/CommerceOrderClient';

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
  private readonly commerceClient: ICommerceOrderClient;

  constructor(
    private readonly shipmentRepository: IShipmentRepository,
    commerceClient?: ICommerceOrderClient,
  ) {
    this.commerceClient = commerceClient || new CommerceOrderClient();
  }

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

    // Tự động đồng bộ sang Commerce Service
    if (shipment.orderId) {
      await this.commerceClient.syncStatus(
        shipment.orderId,
        ShipmentStatus.RETURNED,
        `Xác nhận hàng đã hoàn về kho người bán (Tình trạng: ${condition})`,
      );
    }

    return mapShipmentToDto(shipment);
  }
}
