import { Router } from 'express';
import { ShipmentController } from '../controllers/ShipmentController';
import { requireAuth, requireShipmentPermission } from '../../../infrastructure/security/auth';

export function createShipmentRoutes(controller: ShipmentController): Router {
  const router = Router();

  // 1. Dashboard summary
  router.get('/dashboard/summary', requireAuth, requireShipmentPermission('LIST'), (req, res) =>
    controller.getDashboardSummary(req, res),
  );

  // 1.1 Khởi tạo hoặc đăng ký vận đơn sandbox (hỗ trợ tạo đơn từ Commerce Service)
  router.post('/shipments', requireAuth, requireShipmentPermission('CREATE'), (req, res) =>
    controller.createShipment(req, res),
  );

  // 2. Tra cứu danh sách vận đơn (Search / Filter / Pagination)
  router.get('/shipments', requireAuth, requireShipmentPermission('LIST'), (req, res) =>
    controller.listShipments(req, res),
  );

  // 3. Chi tiết vận đơn theo ID hoặc Tracking code
  router.get('/shipments/:id', requireAuth, requireShipmentPermission('VIEW'), (req, res) =>
    controller.getById(req, res),
  );

  // 3.1. Chi tiết vận đơn theo mã đơn hàng phục vụ In phiếu gửi hàng & Tracking
  router.get(
    '/shipments/by-order/:orderId',
    requireAuth,
    requireShipmentPermission('VIEW'),
    (req, res) => controller.getByOrderId(req, res),
  );

  // 3.2. Webhook nhận biến động trạng thái từ 3PL (GHN/GHTK) hoặc Simulator
  router.post('/carriers/webhook', (req, res) => controller.carrierWebhook(req, res));
  router.post('/carrier/webhook', (req, res) => controller.carrierWebhook(req, res));

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
