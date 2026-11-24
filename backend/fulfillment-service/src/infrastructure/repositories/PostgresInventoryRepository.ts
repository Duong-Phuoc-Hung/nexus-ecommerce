import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  SkuInventory,
  InventoryLedgerEntry,
  InventoryAdjustmentType,
} from '../../domain/entities/Inventory';
import {
  IInventoryRepository,
  InventorySearchCriteria,
  InventorySearchPage,
} from '../../domain/repositories/IInventoryRepository';
import { loadSeedInventory } from '../seeds/fulfillmentSeedLoader';

export class PostgresInventoryRepository implements IInventoryRepository {
  private isInitialized = false;
  private _prisma?: PrismaClient;

  constructor(prisma?: PrismaClient) {
    if (prisma) {
      this._prisma = prisma;
    }
  }

  private get prisma(): PrismaClient {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
  }

  /**
   * Tự động nạp dữ liệu tồn kho khởi tạo nếu bảng fulfillment_sku_inventories trong PostgreSQL đang rỗng.
   */
  public async seedIfEmpty(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const count = await this.prisma.skuInventory.count();
      if (count === 0) {
        await this.seedInitialInventories();
      }
    } catch (err) {
      console.warn('[PostgresInventoryRepository] Seed check warning:', (err as Error).message);
    }
  }

  private async seedInitialInventories(): Promise<void> {
    // 1. Đảm bảo Warehouse WH_001 tồn tại
    let defaultWarehouse = await this.prisma.warehouse.findUnique({
      where: { code: SkuInventory.DEFAULT_WAREHOUSE_ID },
    });

    if (!defaultWarehouse) {
      defaultWarehouse = await this.prisma.warehouse.create({
        data: {
          code: SkuInventory.DEFAULT_WAREHOUSE_ID,
          name: SkuInventory.DEFAULT_WAREHOUSE_NAME,
          address: 'Khu Công Nghệ Cao, TP. Thủ Đức',
          city: 'Hồ Chí Minh',
          isActive: true,
        },
      });
    }

    const samples = loadSeedInventory();
    // Bổ sung SKU mẫu theo tài liệu đặc tả Người 3
    const specSample = new SkuInventory({
      id: 'inv_01hqz_spec_ip15pm',
      sku: 'SKU-IP15PM-256',
      productName: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
      warehouseId: SkuInventory.DEFAULT_WAREHOUSE_ID,
      warehouseName: SkuInventory.DEFAULT_WAREHOUSE_NAME,
      onHand: 20,
      reserved: 4,
      unavailableQuantity: 0,
    });
    const allSamples = [...samples, specSample];

    let productIdCounter = BigInt(1001);
    for (const inv of allSamples) {
      const created = await this.prisma.skuInventory.upsert({
        where: { skuCode: inv.sku.toUpperCase() },
        update: {
          totalQuantity: inv.onHand,
          availableQuantity: inv.available,
          reservedQuantity: inv.reserved,
          unavailableQuantity: inv.unavailableQuantity,
        },
        create: {
          warehouseId: defaultWarehouse.id,
          productId: productIdCounter++,
          skuCode: inv.sku.toUpperCase(),
          totalQuantity: inv.onHand,
          availableQuantity: inv.available,
          reservedQuantity: inv.reserved,
          unavailableQuantity: inv.unavailableQuantity,
        },
      });

      // Tạo bản ghi sổ cái ban đầu
      await this.prisma.inventoryLedger.create({
        data: {
          inventoryId: created.id,
          transactionType: 'INBOUND',
          quantityDelta: inv.onHand,
          reason: 'Khởi tạo tồn kho ban đầu theo hệ thống kiểm kê',
          referenceId: 'INIT-BATCH-001',
        },
      });
    }

    console.log(
      `[PostgresInventoryRepository] ✅ Đã nạp thành công ${allSamples.length} SKU vào PostgreSQL (nexus_fulfillment_db).`,
    );
  }

  public async findBySkuAndWarehouse(
    sku: string,
    warehouseId: string = SkuInventory.DEFAULT_WAREHOUSE_ID,
  ): Promise<SkuInventory | null> {
    const trimmedSku = sku.trim().toUpperCase();
    const row = await this.prisma.skuInventory.findFirst({
      where: {
        skuCode: trimmedSku,
      },
      include: {
        warehouse: true,
      },
    });

    if (!row) {
      return null;
    }

    return this.mapToDomain(row);
  }

  public async search(criteria: InventorySearchCriteria): Promise<InventorySearchPage> {
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (criteria.sku && criteria.sku.trim()) {
      where.skuCode = {
        contains: criteria.sku.trim().toUpperCase(),
      };
    }

    if (criteria.warehouseId && criteria.warehouseId.trim()) {
      where.warehouse = {
        code: criteria.warehouseId.trim(),
      };
    }

    const [total, rows] = await Promise.all([
      this.prisma.skuInventory.count({ where }),
      this.prisma.skuInventory.findMany({
        where,
        include: { warehouse: true },
        orderBy: { id: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const items = rows.map((r) => this.mapToDomain(r));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(inventory: SkuInventory, ledger?: InventoryLedgerEntry): Promise<void> {
    const trimmedSku = inventory.sku.trim().toUpperCase();
    let warehouse = await this.prisma.warehouse.findUnique({
      where: { code: inventory.warehouseId || SkuInventory.DEFAULT_WAREHOUSE_ID },
    });

    if (!warehouse) {
      warehouse = await this.prisma.warehouse.findFirst();
    }

    const warehouseId = warehouse?.id || BigInt(1);

    const saved = await this.prisma.skuInventory.upsert({
      where: { skuCode: trimmedSku },
      update: {
        totalQuantity: inventory.onHand,
        availableQuantity: inventory.available,
        reservedQuantity: inventory.reserved,
        unavailableQuantity: inventory.unavailableQuantity,
      },
      create: {
        warehouseId,
        productId: BigInt(Math.floor(1000 + Math.random() * 9000)),
        skuCode: trimmedSku,
        totalQuantity: inventory.onHand,
        availableQuantity: inventory.available,
        reservedQuantity: inventory.reserved,
        unavailableQuantity: inventory.unavailableQuantity,
      },
    });

    if (ledger) {
      await this.prisma.inventoryLedger.create({
        data: {
          inventoryId: saved.id,
          transactionType: ledger.transactionType,
          quantityDelta: ledger.quantityChange,
          reason: ledger.reason,
          referenceId: ledger.operatorId ? `OP:${ledger.operatorId}` : undefined,
          createdAt: ledger.createdAt || new Date(),
        },
      });
    }
  }

  public async getLedger(sku?: string): Promise<InventoryLedgerEntry[]> {
    const where: any = {};
    if (sku && sku.trim()) {
      where.inventory = {
        skuCode: sku.trim().toUpperCase(),
      };
    }

    const rows = await this.prisma.inventoryLedger.findMany({
      where,
      include: {
        inventory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return rows.map((row) => ({
      id: String(row.id),
      inventoryId: String(row.inventoryId),
      sku: row.inventory?.skuCode || '',
      transactionType: (row.transactionType as InventoryAdjustmentType) || 'STOCK_IN',
      quantityChange: row.quantityDelta,
      reason: row.reason || '',
      operatorId: row.referenceId?.startsWith('OP:')
        ? row.referenceId.replace('OP:', '')
        : row.referenceId || undefined,
      createdAt: row.createdAt,
    }));
  }

  private mapToDomain(row: any): SkuInventory {
    const defaultWarehouseId = SkuInventory.DEFAULT_WAREHOUSE_ID;
    const defaultWarehouseName = SkuInventory.DEFAULT_WAREHOUSE_NAME;

    return new SkuInventory({
      id: String(row.id),
      sku: row.skuCode,
      productName: row.skuCode, // Tên SKU đại diện
      warehouseId: row.warehouse?.code || defaultWarehouseId,
      warehouseName: row.warehouse?.name || defaultWarehouseName,
      onHand: row.totalQuantity,
      reserved: row.reservedQuantity,
      unavailableQuantity: row.unavailableQuantity,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
