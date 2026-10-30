import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import {
  requireAuth,
  requireSellerOrAdmin,
  optionalAuth,
} from '../../../infrastructure/security/auth';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  router.get('/search', (req, res) => controller.search(req, res));

  router.get('/mine', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.getMine(req, res),
  );
  router.get('/', (req, res) => controller.getAll(req, res));

  router.get('/:id', (req, res) => controller.getById(req, res));
  router.put('/:id', requireAuth, requireSellerOrAdmin, (req, res) => controller.update(req, res));
  router.delete('/:id', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.delete(req, res),
  );
  router.post('/', requireAuth, requireSellerOrAdmin, (req, res) => controller.create(req, res));
  router.post('/:id/recover', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.recover(req, res),
  );
  router.put('/:id/recover', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.recover(req, res),
  );
  return router;
}
