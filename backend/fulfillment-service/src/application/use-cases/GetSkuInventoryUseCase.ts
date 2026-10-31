import {
  IInventoryRepository,
  InventorySearchCriteria,
} from '../../domain/repositories/IInventoryRepository';

export interface SkuInventoryDto {
  sku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  unavailableQuantity: number;
  updatedAt: Date;
}

export interface GetSkuInventoryResult {
  items: SkuInventoryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * UseCase: GetSkuInventoryUseCase
 * Tra cứu số lượng tồn kho theo chuẩn SKU cho Seller và Support Staff (SRS 2.6, 3.6.1)
 * Trả về: { sku, productName, warehouseId, warehouseName, onHand, reserved, available }
 * với available = onHand - reserved.
 */
export class GetSkuInventoryUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  public async execute(criteria: InventorySearchCriteria): Promise<GetSkuInventoryResult> {
    const pageResult = await this.inventoryRepository.search(criteria);

    return {
      items: pageResult.items.map((item) => item.toResponseDto()),
      total: pageResult.total,
      page: pageResult.page,
      limit: pageResult.limit,
      totalPages: pageResult.totalPages,
    };
  }
}
