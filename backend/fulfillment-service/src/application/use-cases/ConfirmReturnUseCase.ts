import { IShipmentRepository } from '../../domain/repositories/IShipmentRepository';
import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { SkuInventory } from '../../domain/entities/Inventory';
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
  sku?: string;
  quantity?: number;
  warehouseId?: string;
}

/**
 * UseCase: ConfirmReturnUseCase
 * Xác nhận đơn giao thất bại đã hoàn về kho Người bán thành công để đóng hồ sơ vận đơn (SRS 3.6)
 * Tự động phục hồi tồn kho (RTO Restock) và ghi sổ cái bất biến nếu hàng nguyên vẹn (INTACT)
 */
export class ConfirmReturnUseCase {
  private readonly commerceClient: ICommerceOrderClient;

  constructor(
    private readonly shipmentRepository: IShipmentRepository,
    commerceClient?: ICommerceOrderClient,
    private readonly inventoryRepository?: IInventoryRepository,
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

    // Task 15: Quy trình nhập kho hoàn trả (RTO Restock Workflow - SRS 3.6.1)
    // Khi hàng hoàn về trong tình trạng nguyên vẹn (INTACT), tự động phục hồi tồn kho và ghi sổ cái kiểm toán
    if (condition === 'INTACT' && this.inventoryRepository) {
      const restockSku = input.sku || `SKU-${shipment.orderId || shipment.id}`;
      const restockQty = input.quantity && input.quantity > 0 ? input.quantity : 1;
      let inventory = await this.inventoryRepository.findBySkuAndWarehouse(
        restockSku,
        input.warehouseId,
      );
      if (!inventory) {
        inventory = new SkuInventory({
          id: `inv_rto_${Date.now()}`,
          sku: restockSku,
          productName: `Sản phẩm hoàn về từ đơn ${shipment.orderId || shipment.id}`,
          warehouseId: input.warehouseId,
          onHand: 0,
        });
      }

      const ledger = inventory.adjust(
        'STOCK_IN',
        restockQty,
        `RTO hoàn kho đơn ${shipment.orderId || shipment.id} thành công (Tình trạng: INTACT)`,
      );
      (ledger as any).transactionType = 'RETURN_RESTOCK';
      await this.inventoryRepository.save(inventory, ledger);
    }

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
