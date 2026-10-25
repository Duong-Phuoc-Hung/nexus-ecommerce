import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { SearchShipmentsQueryDto, SearchShipmentsResultDto } from '../dtos/SearchShipmentsDto';
import { mapShipmentToDto } from '../dtos/ShipmentDetailDto';

export class SearchShipmentsUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(query: SearchShipmentsQueryDto): Promise<SearchShipmentsResultDto> {
    const pageResult = await this.shipmentRepository.search({
      query: query.query,
      carrier: query.carrier,
      status: query.status,
      orderId: query.orderId,
      trackingCode: query.trackingCode,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: pageResult.items.map(mapShipmentToDto),
      total: pageResult.total,
      page: pageResult.page,
      limit: pageResult.limit,
      totalPages: pageResult.totalPages,
    };
  }
}
