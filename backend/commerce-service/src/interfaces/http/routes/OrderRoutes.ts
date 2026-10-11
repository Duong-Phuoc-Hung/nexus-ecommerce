import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/checkout', (req, res) => controller.checkout(req, res));

  return router;
}
