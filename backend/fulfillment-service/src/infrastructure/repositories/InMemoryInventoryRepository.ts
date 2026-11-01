import { SkuInventory, InventoryLedgerEntry } from '../../domain/entities/Inventory';
import {
  IInventoryRepository,
  InventorySearchCriteria,
  InventorySearchPage,
} from '../../domain/repositories/IInventoryRepository';

export class InMemoryInventoryRepository implements IInventoryRepository {
  private inventories: Map<string, SkuInventory> = new Map();
  private ledgers: InventoryLedgerEntry[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    const defaultWarehouseId = SkuInventory.DEFAULT_WAREHOUSE_ID;
    const defaultWarehouseName = SkuInventory.DEFAULT_WAREHOUSE_NAME;

    const samples = [
      {
        id: 'inv_01hqz_iphone15',
        sku: 'NX-IPHONE-15-BLUE',
        productName: 'iPhone 15 128GB Xanh Lam',
        warehouseId: defaultWarehouseId,
        warehouseName: defaultWarehouseName,
        onHand: 150,
        reserved: 25,
        unavailableQuantity: 2,
      },
      {
        id: 'inv_01hqz_airpods',
        sku: 'NX-AIRPODS-PRO-2',
        productName: 'Tai nghe không dây AirPods Pro 2',
        warehouseId: defaultWarehouseId,
        warehouseName: defaultWarehouseName,
        onHand: 80,
        reserved: 10,
        unavailableQuantity: 0,
      },
      {
        id: 'inv_01hqz_retrocam',
        sku: 'NX-RETRO-35-CAM',
        productName: 'Máy ảnh Film Retro 35mm Classic',
        warehouseId: defaultWarehouseId,
        warehouseName: defaultWarehouseName,
        onHand: 40,
        reserved: 5,
        unavailableQuantity: 1,
      },
      {
        id: 'inv_01hqz_sportwatch',
        sku: 'NX-SPORT-WATCH-S2',
        productName: 'Đồng hồ thông minh Nexus Sport S2',
        warehouseId: defaultWarehouseId,
        warehouseName: defaultWarehouseName,
        onHand: 120,
        reserved: 20,
        unavailableQuantity: 0,
      },
      {
        id: 'inv_01hqz_macbook',
        sku: 'NX-MACBOOK-AIR-M2',
        productName: 'MacBook Air M2 13.6 inch Midnight',
        warehouseId: defaultWarehouseId,
        warehouseName: defaultWarehouseName,
        onHand: 50,
        reserved: 8,
        unavailableQuantity: 0,
      },
    ];

    for (const item of samples) {
      const inv = new SkuInventory(item);
      const key = `${inv.sku.toUpperCase()}_${inv.warehouseId}`;
      this.inventories.set(key, inv);
    }
  }

  public async findBySkuAndWarehouse(
    sku: string,
    warehouseId: string = SkuInventory.DEFAULT_WAREHOUSE_ID,
  ): Promise<SkuInventory | null> {
    const key = `${sku.trim().toUpperCase()}_${warehouseId.trim()}`;
    return this.inventories.get(key) || null;
  }

  public async search(criteria: InventorySearchCriteria): Promise<InventorySearchPage> {
    let items = Array.from(this.inventories.values());

    if (criteria.sku && criteria.sku.trim()) {
      const searchSku = criteria.sku.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.sku.toLowerCase().includes(searchSku) ||
          i.productName.toLowerCase().includes(searchSku),
      );
    }

    if (criteria.warehouseId && criteria.warehouseId.trim()) {
      items = items.filter(
        (i) => i.warehouseId.toLowerCase() === criteria.warehouseId!.trim().toLowerCase(),
      );
    }

    const total = items.length;
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const pagedItems = items.slice(offset, offset + limit);

    return {
      items: pagedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(inventory: SkuInventory, ledger?: InventoryLedgerEntry): Promise<void> {
    const key = `${inventory.sku.toUpperCase()}_${inventory.warehouseId}`;
    this.inventories.set(key, inventory);

    if (ledger) {
      this.ledgers.unshift(ledger);
    }
  }

  public async getLedger(sku?: string): Promise<InventoryLedgerEntry[]> {
    if (!sku) return [...this.ledgers];
    return this.ledgers.filter((l) => l.sku.toLowerCase() === sku.trim().toLowerCase());
  }
}
