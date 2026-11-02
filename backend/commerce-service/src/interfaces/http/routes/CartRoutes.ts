import { Router } from 'express';
import { CartController } from '../controllers/CartController';
import { requireAuth } from '../../../infrastructure/security/auth';
import { requireBuyer } from '../controllers/CheckoutController';

export function createCartRoutes(controller: CartController): Router {
  const router = Router();
  const buyerOnly = [requireAuth, requireBuyer];

  router.get('/', ...buyerOnly, controller.getCart);
  router.post('/items', ...buyerOnly, controller.addItem);
  router.put('/items/:id', ...buyerOnly, controller.updateItem);
  router.delete('/items/:id', ...buyerOnly, controller.removeItem);
  router.delete('/', ...buyerOnly, controller.clearCart);

  return router;
}
