import { SkuInventory, InventoryAdjustmentType } from '../../domain/entities/Inventory';
import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { SkuInventoryDto } from './GetSkuInventoryUseCase';

export interface AdjustInventoryRequest {
  sku: string;
  warehouseId?: string;
  adjustmentType: string;
  quantity: number;
  reason: string;
  operatorId?: string;
}

export interface AdjustInventoryResult {
  success: boolean;
  message: string;
  data: SkuInventoryDto;
  ledgerId: string;
}

/**
 * UseCase: AdjustInventoryUseCase
 * Điều chỉnh số lượng tồn kho theo thực tế kiểm kê tại kho (STOCK_IN, STOCK_OUT, DAMAGE) (SRS 3.6.1).
 * Quyền thực hiện: SELLER, ADMIN.
 * Cơ chế: Lưu sổ cái biến động (Append-Only Inventory Ledger) và ngăn chặn bán âm (ALLOW_OVERSELL: false).
 */
export class AdjustInventoryUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  public async execute(request: AdjustInventoryRequest): Promise<AdjustInventoryResult> {
    const { sku, warehouseId, adjustmentType, quantity, reason, operatorId } = request;

    if (!sku || !sku.trim()) {
      throw new Error('Mã SKU sản phẩm không được để trống.');
    }

    const validTypes: InventoryAdjustmentType[] = ['STOCK_IN', 'STOCK_OUT', 'DAMAGE'];
    const normalizedType = (adjustmentType || '').trim().toUpperCase() as InventoryAdjustmentType;
    if (!validTypes.includes(normalizedType)) {
      throw new Error(
        `Loại điều chỉnh '${adjustmentType}' không hợp lệ. Chỉ chấp nhận 'STOCK_IN', 'STOCK_OUT', hoặc 'DAMAGE'.`,
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Số lượng điều chỉnh (quantity) phải là số nguyên dương lớn hơn 0.');
    }

    if (!reason || !reason.trim()) {
      throw new Error(
        'Lý do điều chỉnh kho (reason) là bắt buộc cho mục đích kiểm kê và kiểm toán.',
      );
    }

    const targetWarehouseId = warehouseId?.trim() || SkuInventory.DEFAULT_WAREHOUSE_ID;
    const inventory = await this.inventoryRepository.findBySkuAndWarehouse(
      sku.trim(),
      targetWarehouseId,
    );

    if (!inventory) {
      throw new Error(
        `Không tìm thấy dữ liệu tồn kho cho SKU '${sku}' tại kho '${targetWarehouseId}'.`,
      );
    }

    // Thực thi điều chỉnh và sinh bản ghi sổ cái biến động
    const ledger = inventory.adjust(normalizedType, quantity, reason);
    ledger.operatorId = operatorId;

    await this.inventoryRepository.save(inventory, ledger);

    return {
      success: true,
      message: `Đã điều chỉnh tồn kho thành công theo hình thức '${normalizedType}'. Số lượng khả dụng hiện tại: ${inventory.available}.`,
      data: inventory.toResponseDto(),
      ledgerId: ledger.id,
    };
  }
}
