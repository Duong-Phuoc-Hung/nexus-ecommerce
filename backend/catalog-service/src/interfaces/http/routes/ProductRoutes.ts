import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import {
  requireAuth,
  requireSellerOrAdmin,
  requireAdminPermission,
  optionalAuth,
} from '../../../infrastructure/security/auth';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  router.get('/search', optionalAuth, (req, res) => controller.search(req, res));

  router.get('/mine', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.getMine(req, res),
  );
  router.get('/', optionalAuth, (req, res) => controller.getAll(req, res));

  router.get('/:id', optionalAuth, (req, res) => controller.getById(req, res));
  router.put(
    '/:id',
    requireAuth,
    requireAdminPermission('PRODUCT.UPDATE'),
    requireSellerOrAdmin,
    (req, res) => controller.update(req, res),
  );
  router.delete(
    '/:id',
    requireAuth,
    requireAdminPermission('PRODUCT.DELETE'),
    requireSellerOrAdmin,
    (req, res) =>
    controller.delete(req, res),
  );
  router.post(
    '/',
    requireAuth,
    requireAdminPermission('PRODUCT.CREATE'),
    requireSellerOrAdmin,
    (req, res) => controller.create(req, res),
  );
  return router;
}
