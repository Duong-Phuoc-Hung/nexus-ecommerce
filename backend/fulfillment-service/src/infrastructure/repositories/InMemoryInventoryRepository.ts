import { SkuInventory, InventoryLedgerEntry } from '../../domain/entities/Inventory';
import {
  IInventoryRepository,
  InventorySearchCriteria,
  InventorySearchPage,
} from '../../domain/repositories/IInventoryRepository';
import { loadSeedInventory } from '../seeds/fulfillmentSeedLoader';

export class InMemoryInventoryRepository implements IInventoryRepository {
  private inventories: Map<string, SkuInventory> = new Map();
  private ledgers: InventoryLedgerEntry[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    const samples = loadSeedInventory();
    for (const inv of samples) {
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
