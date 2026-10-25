import {
  FulfillmentDashboardSummary,
  IShipmentRepository,
} from '../../domain/repositories/IShipmentRepository';

export class GetFulfillmentSummaryUseCase {
  constructor(private readonly shipmentRepository: IShipmentRepository) {}

  public async execute(): Promise<FulfillmentDashboardSummary> {
    return this.shipmentRepository.getDashboardSummary();
  }
}
