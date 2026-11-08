import { Router } from 'express';
import { SupportCaseController } from '../controllers/SupportCaseController';
import { requireAuth, requireSupportCasePermission } from '../../../infrastructure/security/auth';

export function createSupportCaseRoutes(controller: SupportCaseController): Router {
  const router = Router();

  // 1. GET /api/v1/support/cases - Danh sách Ticket / Khiếu nại thực tế
  router.get('/cases', requireAuth, requireSupportCasePermission('VIEW'), (req, res) =>
    controller.listCases(req, res),
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

  return router;
}
