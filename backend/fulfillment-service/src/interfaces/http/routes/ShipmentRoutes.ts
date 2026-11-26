import { Router } from 'express';
import { ShipmentController } from '../controllers/ShipmentController';
import {
  requireAuth,
  requireAuthOrScopedService,
  requireShipmentPermission,
} from '../../../infrastructure/security/auth';

export function createShipmentRoutes(controller: ShipmentController): Router {
  const router = Router();

  // 1. Dashboard summary
  router.get('/dashboard/summary', requireAuth, requireShipmentPermission('LIST'), (req, res) =>
    controller.getDashboardSummary(req, res),
  );

  // 1.1 Khởi tạo hoặc đăng ký vận đơn (hỗ trợ Commerce Service với S2S scope)
  router.post(
    '/shipments',
    requireAuthOrScopedService({
      requiredScope: 'fulfillment:shipment:create',
      allowedIssuers: ['commerce-service'],
      resourceResolver: (req) =>
        typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : undefined,
    }),
    requireShipmentPermission('CREATE'),
    (req, res) => controller.createShipment(req, res),
  );

  // 1.2 Tra cứu báo giá cước vận chuyển và ETA đối tác
  router.post('/shipments/quote', requireAuth, (req, res) => controller.getShippingQuote(req, res));

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
    requireAuthOrScopedService({
      requiredScope: 'fulfillment:shipment:read',
      allowedIssuers: ['chat-service', 'commerce-service'],
      resourceResolver: (req) => String(req.params.orderId || '').trim(),
    }),
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

  // 6. Yêu cầu hãng vận chuyển phát lại đơn giao không thành công (Failed Delivery & RTO)
  router.post(
    '/shipments/:id/request-redelivery',
    requireAuth,
    requireShipmentPermission('UPDATE_STATUS'),
    (req, res) => controller.requestRedelivery(req, res),
  );

  // 7. Xác nhận đơn đã hoàn về kho Seller thành công để đóng hồ sơ vận đơn
  router.post(
    '/shipments/:id/confirm-return',
    requireAuth,
    requireShipmentPermission('UPDATE_STATUS'),
    (req, res) => controller.confirmReturn(req, res),
  );

  // 8. Xác nhận đã thu tiền COD cho đơn hàng liên kết
  router.post(
    '/shipments/:id/confirm-cod',
    requireAuth,
    requireShipmentPermission('UPDATE_STATUS'),
    (req, res) => controller.confirmCodPayment(req, res),
  );

  return router;
}
