import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { requireAuth, requireInventoryPermission } from '../../../infrastructure/security/auth';

export function createInventoryRoutes(controller: InventoryController): Router {
  const router = Router();

  // 1. GET /api/v1/fulfillments/inventory - Tra cứu tồn kho chuẩn SKU
  router.get('/', requireAuth, requireInventoryPermission('VIEW'), (req, res) =>
    controller.listInventory(req, res),
  );

  // 1.0 GET /api/v1/fulfillments/inventory/warehouses - Danh sách kho hàng
  router.get('/warehouses', requireAuth, requireInventoryPermission('VIEW'), (req, res) =>
    controller.listWarehouses(req, res),
  );

  // 1.1 GET /api/v1/fulfillments/inventory/:sku/ledger - Tra cứu sổ cái biến động kho
  router.get('/:sku/ledger', requireAuth, requireInventoryPermission('VIEW'), (req, res) =>
    controller.getSkuLedger(req, res),
  );

  // 2. POST /api/v1/fulfillments/inventory/adjust - Điều chỉnh số lượng tồn kho và lưu sổ cái
  router.post('/adjust', requireAuth, requireInventoryPermission('ADJUST'), (req, res) =>
    controller.adjustInventory(req, res),
  );

  return router;
}
