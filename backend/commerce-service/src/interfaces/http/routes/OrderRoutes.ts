import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { requireAuth, requireOrderPermission } from '../../../infrastructure/security/auth';

import { requireAuth as requireOrderReadAuth } from '../../../infrastructure/security/order-read-auth';

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  router.get('/', requireOrderReadAuth, requireOrderPermission('LIST'), (req, res) =>
    controller.listOrders(req, res),
  );
  router.get('/:id', requireOrderReadAuth, requireOrderPermission('VIEW'), (req, res) =>
    controller.getById(req, res),
  );
  router.post('/:id/cancel', requireAuth, requireOrderPermission('CANCEL'), (req, res) =>
    controller.cancel(req, res),
  );
  router.post('/:id/refund', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.refund(req, res),
  );
  router.post('/:id/refund/execute', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.executeRefund(req, res),
  );
  router.get('/:id/refund/status', requireAuth, requireOrderPermission('VIEW'), (req, res) =>
    controller.getRefundStatus(req, res),
  );
  router.post('/:id/refund/cancel', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.rejectRefund(req, res),
  );
  router.post('/:id/reject-refund', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.rejectRefund(req, res),
  );
  router.post('/:id/dispatch', requireAuth, requireOrderPermission('DISPATCH'), (req, res) =>
    controller.dispatch(req, res),
  );
  router.post(
    '/:id/refund/request',
    requireAuth,
    requireOrderPermission('REQUEST_REFUND'),
    (req, res) => controller.requestRefund(req, res),
  );
  router.post('/checkout', (req, res) => controller.checkout(req, res));

  return router;
}
