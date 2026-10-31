export interface SkuInventoryProps {
  id: string;
  sku: string;
  productName: string;
  warehouseId?: string;
  warehouseName?: string;
  onHand: number;
  reserved?: number;
  unavailableQuantity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type InventoryAdjustmentType = 'STOCK_IN' | 'STOCK_OUT' | 'DAMAGE';

export interface InventoryLedgerEntry {
  id: string;
  inventoryId: string;
  sku: string;
  transactionType: InventoryAdjustmentType | 'RESERVE' | 'RELEASE' | 'COMMIT';
  quantityChange: number;
  reason: string;
  operatorId?: string;
  createdAt: Date;
}

/**
 * Domain Entity: SkuInventory
 * Đại diện cho dữ liệu tồn kho theo SKU tại từng kho bãi vật lý (SRS 2.6, 3.6.1).
 * Công thức bắt buộc: available = onHand - reserved.
 * Quy tắc: ALLOW_OVERSELL: false (Không cho phép bán âm kho).
 */
export class SkuInventory {
  public static readonly DEFAULT_WAREHOUSE_ID = 'WH_001';
  public static readonly DEFAULT_WAREHOUSE_NAME = 'Kho Tổng TP.HCM';

  private readonly _id: string;
  private readonly _sku: string;
  private _productName: string;
  private _warehouseId: string;
  private _warehouseName: string;
  private _onHand: number;
  private _reserved: number;
  private _unavailableQuantity: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: SkuInventoryProps) {
    this._id = props.id;
    this._sku = props.sku.trim();
    this._productName = props.productName.trim();
    this._warehouseId = props.warehouseId || SkuInventory.DEFAULT_WAREHOUSE_ID;
    this._warehouseName = props.warehouseName || SkuInventory.DEFAULT_WAREHOUSE_NAME;
    this._onHand = Math.max(0, props.onHand);
    this._reserved = Math.max(0, props.reserved || 0);
    this._unavailableQuantity = Math.max(0, props.unavailableQuantity || 0);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get sku(): string {
    return this._sku;
  }

  public get productName(): string {
    return this._productName;
  }

  public get warehouseId(): string {
    return this._warehouseId;
  }

  public get warehouseName(): string {
    return this._warehouseName;
  }

  public get onHand(): number {
    return this._onHand;
  }

  public get reserved(): number {
    return this._reserved;
  }

  public get unavailableQuantity(): number {
    return this._unavailableQuantity;
  }

  /**
   * Số lượng tồn kho sẵn sàng bán cho khách: available = onHand - reserved
   */
  public get available(): number {
    return Math.max(0, this._onHand - this._reserved);
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Điều chỉnh số lượng tồn kho (STOCK_IN, STOCK_OUT, DAMAGE) theo SRS 3.6.1
   */
  public adjust(
    type: InventoryAdjustmentType,
    quantity: number,
    reason: string,
  ): InventoryLedgerEntry {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Số lượng điều chỉnh (quantity) phải là số nguyên dương lớn hơn 0.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('Lý do điều chỉnh (reason) không được để trống.');
    }

    let quantityChange = 0;

    switch (type) {
      case 'STOCK_IN':
        this._onHand += quantity;
        quantityChange = quantity;
        break;

      case 'STOCK_OUT':
        // Tuân thủ SRS: ALLOW_OVERSELL: false
        if (this._onHand - quantity < this._reserved) {
          throw new Error(
            `Không thể xuất kho ${quantity} sản phẩm vì số lượng tồn khả dụng không đủ (Hiện có onHand=${this._onHand}, đang giữ chỗ reserved=${this._reserved}).`,
          );
        }
        this._onHand -= quantity;
        quantityChange = -quantity;
        break;

      case 'DAMAGE':
        if (this._onHand - quantity < this._reserved) {
          throw new Error(
            `Không thể đánh dấu hỏng ${quantity} sản phẩm vì vượt quá số lượng hàng chưa bị giữ chỗ.`,
          );
        }
        this._onHand -= quantity;
        this._unavailableQuantity += quantity;
        quantityChange = -quantity;
        break;

      default:
        throw new Error(`Loại điều chỉnh kho '${type}' không hợp lệ.`);
    }

    this._updatedAt = new Date();

    return {
      id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      inventoryId: this._id,
      sku: this._sku,
      transactionType: type,
      quantityChange,
      reason: reason.trim(),
      createdAt: new Date(),
    };
  }

  public toResponseDto() {
    return {
      sku: this.sku,
      productName: this.productName,
      warehouseId: this.warehouseId,
      warehouseName: this.warehouseName,
      onHand: this.onHand,
      reserved: this.reserved,
      available: this.available,
      unavailableQuantity: this.unavailableQuantity,
      updatedAt: this.updatedAt,
    };
  }
}
