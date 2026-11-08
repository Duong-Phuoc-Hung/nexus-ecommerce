import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { CarrierCode } from '../../domain/entities/Shipment';
import { ShipmentNotFoundException } from '../../domain/exceptions/ShipmentNotFoundException';
import { mapShipmentToDto, ShipmentDetailDto } from '../dtos/ShipmentDetailDto';

export interface RequestRedeliveryInput {
  shipmentId: string;
  carrierCode?: string;
  rescheduledDate: string | Date;
  note?: string;
}

/**
 * UseCase: RequestRedeliveryUseCase
 * Yêu cầu hãng vận chuyển phát lại đơn hàng giao không thành công
 * Giới hạn tối đa 3 lần phát lại trước khi chuyển hoàn (SRS 3.6)
 */
export class RequestRedeliveryUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(input: RequestRedeliveryInput): Promise<ShipmentDetailDto> {
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

    const resDate =
      typeof input.rescheduledDate === 'string'
        ? new Date(input.rescheduledDate)
        : input.rescheduledDate || new Date(Date.now() + 86400000);

    let carrier: CarrierCode | undefined;
    if (input.carrierCode) {
      const code = input.carrierCode.toUpperCase().trim();
      if (code === 'GHTK') carrier = CarrierCode.GHTK;
      else if (code === 'VNPOST') carrier = CarrierCode.VNPOST;
      else if (code === 'VIETTEL_POST' || code === 'VTP') carrier = CarrierCode.VIETTEL_POST;
      else carrier = CarrierCode.GHN;
    }

    shipment.requestRedelivery({
      carrierCode: carrier,
      rescheduledDate: resDate,
      note: input.note,
    });

    await this.shipmentRepository.update(shipment);
    return mapShipmentToDto(shipment);
  }
}
