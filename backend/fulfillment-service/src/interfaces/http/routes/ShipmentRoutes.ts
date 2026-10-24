import { Router } from 'express';
import { ShipmentController } from '../controllers/ShipmentController';
import { requireAuth, requireShipmentPermission } from '../../../infrastructure/security/auth';

export function createShipmentRoutes(controller: ShipmentController): Router {
  const router = Router();

  // 1. Dashboard summary
  router.get('/dashboard/summary', requireAuth, requireShipmentPermission('LIST'), (req, res) =>
    controller.getDashboardSummary(req, res),
  );

  // 2. Tra cứu danh sách vận đơn (Search / Filter / Pagination)
  router.get('/shipments', requireAuth, requireShipmentPermission('LIST'), (req, res) =>
    controller.listShipments(req, res),
  );

  // 3. Chi tiết vận đơn theo ID hoặc Tracking code
  router.get('/shipments/:id', requireAuth, requireShipmentPermission('VIEW'), (req, res) =>
    controller.getById(req, res),
  );

  // 4. Cập nhật trạng thái vận đơn
  router.patch(
    '/shipments/:id/status',
    requireAuth,
    requireShipmentPermission('UPDATE_STATUS'),
    (req, res) => controller.updateStatus(req, res),
  );

  // 5. Can thiệp thủ công thông tin vận đơn
  router.patch(
    '/shipments/:id/override',
    requireAuth,
    requireShipmentPermission('MANUAL_OVERRIDE'),
    (req, res) => controller.manualOverride(req, res),
  );

  return router;
}
