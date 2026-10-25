import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import { ShipmentStatus } from '../../domain/entities/Shipment';
import { mapShipmentToDto, ShipmentDetailDto } from '../dtos/ShipmentDetailDto';

export interface UpdateShipmentStatusRequest {
  shipmentId: string;
  status: ShipmentStatus | string;
  location?: string;
  note?: string;
}

export class UpdateShipmentStatusUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(req: UpdateShipmentStatusRequest): Promise<ShipmentDetailDto> {
    const trimmed = (req.shipmentId || '').trim();
    let shipment = await this.shipmentRepository.findById(trimmed);
    if (!shipment) {
      shipment = await this.shipmentRepository.findByTrackingCode(trimmed);
    }

    if (!shipment) {
      throw new ShipmentNotFoundException(trimmed);
    }

    // Chuẩn hóa status
    let targetStatus: ShipmentStatus = shipment.status;
    const rawStatus = (req.status || '').toUpperCase().trim();

    if (rawStatus in ShipmentStatus) {
      targetStatus = rawStatus as ShipmentStatus;
    } else {
      // Tìm kiếm mapping tiếng Việt
      switch (req.status) {
        case 'Đã tạo vận đơn':
          targetStatus = ShipmentStatus.READY_TO_PICK;
          break;
        case 'Đang lấy hàng':
          targetStatus = ShipmentStatus.PICKED;
          break;
        case 'Đang giao':
          targetStatus = ShipmentStatus.IN_TRANSIT;
          break;
        case 'Đang phát hàng':
          targetStatus = ShipmentStatus.OUT_FOR_DELIVERY;
          break;
        case 'Đã giao':
          targetStatus = ShipmentStatus.DELIVERED;
          break;
        case 'Giao thất bại':
          targetStatus = ShipmentStatus.FAILED;
          break;
        case 'Đã trả hàng':
          targetStatus = ShipmentStatus.RETURNED;
          break;
        default:
          throw new Error(
            `Trạng thái vận đơn không hợp lệ: "${req.status}". Các giá trị hợp lệ: READY_TO_PICK, PICKED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED.`,
          );
      }
    }

    shipment.updateStatus(targetStatus, req.location);
    await this.shipmentRepository.update(shipment);

    return mapShipmentToDto(shipment);
  }
}
