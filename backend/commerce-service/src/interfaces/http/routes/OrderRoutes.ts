import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { requireAuth, requireOrderPermission } from '../../../infrastructure/security/auth';

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  router.get('/', requireAuth, requireOrderPermission('LIST'), (req, res) =>
    controller.listOrders(req, res),
  );
  router.get('/:id', requireAuth, requireOrderPermission('VIEW'), (req, res) =>
    controller.getById(req, res),
  );
  router.post('/:id/cancel', requireAuth, requireOrderPermission('CANCEL'), (req, res) =>
    controller.cancel(req, res),
  );
  router.post('/:id/refund', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.refund(req, res),
  );
  router.post('/:id/refund/cancel', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.rejectRefund(req, res),
  );
  router.post('/:id/reject-refund', requireAuth, requireOrderPermission('REFUND'), (req, res) =>
    controller.rejectRefund(req, res),
  );
  router.post('/checkout', (req, res) => controller.checkout(req, res));

  return router;
}
