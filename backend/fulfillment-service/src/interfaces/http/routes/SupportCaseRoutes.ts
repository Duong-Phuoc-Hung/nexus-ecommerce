import { Router } from 'express';
import { SupportCaseController } from '../controllers/SupportCaseController';
import {
  requireAuth,
  requireAuthOrScopedService,
  requireSupportCasePermission,
} from '../../../infrastructure/security/auth';

export function createSupportCaseRoutes(controller: SupportCaseController): Router {
  const router = Router();

  // 1. GET /api/v1/support/cases - Danh sách Ticket / Khiếu nại thực tế
  router.get(
    '/cases',
    requireAuthOrScopedService({
      requiredScope: 'fulfillment:case:read',
      allowedIssuers: ['commerce-service'],
      resourceResolver: (req) =>
        typeof req.query.orderId === 'string' ? req.query.orderId.trim() : undefined,
    }),
    requireSupportCasePermission('VIEW'),
    (req, res) => controller.listCases(req, res),
  );

  // 1.1 GET /api/v1/support/cases/by-order/:orderId - Tra cứu toàn bộ khiếu nại theo đơn hàng (đặt TRƯỚC /cases/:caseId)
  router.get(
    '/cases/by-order/:orderId',
    requireAuth,
    requireSupportCasePermission('VIEW'),
    (req, res) => controller.getCaseByOrderId(req, res),
  );
  // 1.1b GET /api/v1/support/cases/:caseId - Tra cứu trực tiếp theo caseId (kiểm tra quyền sở hữu - D1/D2)
  router.get('/cases/:caseId', requireAuth, requireSupportCasePermission('VIEW'), (req, res) =>
    controller.getCaseById(req, res),
  );
  // 1.1c POST /api/v1/support/cases/:caseId/return-shipment - Buyer gửi mã vận đơn hoàn trả (D4)
  router.post('/cases/:caseId/return-shipment', requireAuth, (req, res) =>
    controller.submitReturnShipment(req, res),
  );
  router.get('/orders/:id/cases', requireAuth, requireSupportCasePermission('VIEW'), (req, res) =>
    controller.getCaseByOrderId(req, res),
  );
  router.get(
    '/orders/:orderId/cases',
    requireAuth,
    requireSupportCasePermission('VIEW'),
    (req, res) => controller.getCaseByOrderId(req, res),
  );

  // 1.2 POST /api/v1/support/cases - Tiếp nhận tạo khiếu nại mới từ Buyer / Chatbot
  router.post(
    '/cases',
    requireAuthOrScopedService({
      requiredScope: 'fulfillment:case:create',
      allowedIssuers: ['chat-service'],
      resourceResolver: (req) =>
        typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : undefined,
    }),
    (req, res) => controller.createCase(req, res),
  );

  // 2. POST /api/v1/support/cases/:id/resolve - Cập nhật kết quả giải quyết khiếu nại
  router.post(
    '/cases/:id/resolve',
    requireAuth,
    requireSupportCasePermission('RESOLVE'),
    (req, res) => controller.resolveCase(req, res),
  );

  // 3. GET /api/v1/support/disputes - Hàng đợi phân xử tranh chấp trọng tài (SRS 2.3)
  router.get('/disputes', requireAuth, requireSupportCasePermission('VIEW'), (req, res) =>
    controller.listDisputes(req, res),
  );

  // 4. POST /api/v1/support/disputes/:caseId/verdict - Ban hành phán quyết trọng tài
  router.post(
    '/disputes/:caseId/verdict',
    requireAuth,
    requireSupportCasePermission('RESOLVE'),
    (req, res) => controller.issueVerdict(req, res),
  );

  // 4.1 GET & POST retry đồng bộ phán quyết sang Commerce Service (T17)
  router.get(
    '/disputes/:caseId/sync-status',
    requireAuth,
    requireSupportCasePermission('VIEW'),
    (req, res) => controller.getDisputeSyncStatus(req, res),
  );
  router.post(
    '/disputes/:caseId/retry-sync',
    requireAuth,
    requireSupportCasePermission('RESOLVE'),
    (req, res) => controller.retryDisputeSync(req, res),
  );

  // 5. POST /api/v1/support/disputes/:caseId/seller-evidence - Seller nộp video/ảnh đóng gói
  router.post(
    '/disputes/:caseId/seller-evidence',
    requireAuth,
    requireSupportCasePermission('SUBMIT_EVIDENCE'),
    (req, res) => controller.submitSellerEvidence(req, res),
  );

  // 5.1 Alias hỗ trợ theo orderId: POST /api/v1/support/orders/:orderId/dispute-evidence
  router.post(
    '/orders/:orderId/dispute-evidence',
    requireAuth,
    requireSupportCasePermission('SUBMIT_EVIDENCE'),
    (req, res) => controller.submitSellerEvidence(req, res),
  );

  return router;
}
