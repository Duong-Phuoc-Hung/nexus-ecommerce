import { SkuInventory, InventoryLedgerEntry } from '../entities/Inventory';

export interface InventorySearchCriteria {
  sku?: string;
  warehouseId?: string;
  page?: number;
  limit?: number;
}

export interface InventorySearchPage {
  items: SkuInventory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IInventoryRepository {
  findBySkuAndWarehouse(sku: string, warehouseId?: string): Promise<SkuInventory | null>;
  search(criteria: InventorySearchCriteria): Promise<InventorySearchPage>;
  save(inventory: SkuInventory, ledger?: InventoryLedgerEntry): Promise<void>;
  getLedger(sku?: string): Promise<InventoryLedgerEntry[]>;
}
