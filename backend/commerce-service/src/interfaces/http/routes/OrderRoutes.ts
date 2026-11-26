import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { AdminCommerceController } from '../controllers/AdminCommerceController';
import {
  requireAuth,
  requireAdmin,
  requireAuthOrScopedService,
  requireOrderPermission,
} from '../../../infrastructure/security/auth';

import { requireAuth as requireOrderReadAuth } from '../../../infrastructure/security/order-read-auth';

export function createOrderRoutes(
  controller: OrderController,
  adminController?: AdminCommerceController,
): Router {
  const router = Router();
  const adminOnly = [requireAuth, requireAdmin];

  const orderIdParam = (req: import('express').Request) => String(req.params.id || '');
  const buyerIdQuery = (req: import('express').Request) =>
    typeof req.query.buyerId === 'string' ? req.query.buyerId : undefined;

  router.get(
    '/',
    (req, res, next) => {
      // Cho phép user-service đọc đơn của đúng buyerId để kiểm tra nghĩa vụ kích hoạt Seller
      if (req.headers['x-service-authorization']) {
        return requireAuthOrScopedService({
          requiredScope: 'order:eligibility:read',
          allowedIssuers: ['user-service'],
          resourceResolver: buyerIdQuery,
        })(req, res, next);
      }
      return requireOrderReadAuth(req, res, next);
    },
    requireOrderPermission('LIST'),
    (req, res) => controller.listOrders(req, res),
  );

  // =========================================================================
  // ADMIN DASHBOARD & REPORTS (SRS A15) - Phải đặt TRƯỚC route động /:id
  // =========================================================================
  if (adminController) {
    router.get('/admin/dashboard-summary', ...adminOnly, (req, res) =>
      adminController.getDashboardSummary(req, res),
    );
    router.get('/admin/reports/export', ...adminOnly, (req, res) =>
      adminController.exportReports(req, res),
    );
    router.get('/admin/reports', ...adminOnly, (req, res) => adminController.getReports(req, res));
  }

  router.get('/admin/reports', requireAuth, requireOrderPermission('LIST'), (req, res) =>
    controller.getAdminReports(req, res),
  );

  router.get('/:id', requireOrderReadAuth, requireOrderPermission('VIEW'), (req, res) =>
    controller.getById(req, res),
  );
  router.get('/:id/cases', requireAuth, requireOrderPermission('VIEW'), (req, res) =>
    controller.getOrderCases(req, res),
  );
  router.post('/:id/cancel', requireAuth, requireOrderPermission('CANCEL'), (req, res) =>
    controller.cancel(req, res),
  );
  router.post(
    '/:id/confirm-receipt',
    requireAuth,
    requireOrderPermission('CONFIRM_RECEIPT'),
    (req, res) => controller.confirmReceipt(req, res),
  );
  router.post('/:id/refund', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.refund(req, res),
  );
  router.post(
    '/:id/refund/execute',
    requireAuthOrScopedService({
      requiredScope: 'order:refund:execute',
      allowedIssuers: ['fulfillment-service'],
      resourceResolver: orderIdParam,
    }),
    requireOrderPermission('REFUND'),
    (req, res) => controller.executeRefund(req, res),
  );
  router.get('/:id/refund/status', requireAuth, requireOrderPermission('VIEW'), (req, res) =>
    controller.getRefundStatus(req, res),
  );
  router.post(
    '/:id/refund/cancel',
    requireAuthOrScopedService({
      requiredScope: 'order:refund:cancel',
      allowedIssuers: ['fulfillment-service'],
      resourceResolver: orderIdParam,
    }),
    requireOrderPermission('REFUND'),
    (req, res) => controller.rejectRefund(req, res),
  );
  router.post(
    '/:id/reject-refund',
    requireAuthOrScopedService({
      requiredScope: 'order:refund:cancel',
      allowedIssuers: ['fulfillment-service'],
      resourceResolver: orderIdParam,
    }),
    requireOrderPermission('REFUND'),
    (req, res) => controller.rejectRefund(req, res),
  );
  router.post('/:id/dispatch', requireAuth, requireOrderPermission('DISPATCH'), (req, res) =>
    controller.dispatch(req, res),
  );
  router.patch(
    '/:id/status',
    requireAuthOrScopedService({
      requiredScope: 'order:status:sync',
      allowedIssuers: ['fulfillment-service'],
      resourceResolver: orderIdParam,
    }),
    requireOrderPermission('UPDATE_STATUS'),
    (req, res) => controller.updateStatus(req, res),
  );
  router.post(
    '/:id/status',
    requireAuthOrScopedService({
      requiredScope: 'order:status:sync',
      allowedIssuers: ['fulfillment-service'],
      resourceResolver: orderIdParam,
    }),
    requireOrderPermission('UPDATE_STATUS'),
    (req, res) => controller.updateStatus(req, res),
  );
  router.post(
    '/:id/refund/request',
    requireAuthOrScopedService({
      requiredScope: 'order:refund:request',
      allowedIssuers: ['fulfillment-service'],
      resourceResolver: orderIdParam,
    }),
    requireOrderPermission('REQUEST_REFUND'),
    (req, res) => controller.requestRefund(req, res),
  );
  router.post('/checkout', (req, res) => controller.checkout(req, res));

  return router;
}
