import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import {
  requireAuth,
  requireSellerOrAdmin,
  optionalAuth,
} from '../../../infrastructure/security/auth';
import { extractServiceToken } from '../../../infrastructure/security/internal-service-auth';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  const requireCatalogStockService = (scope: 'catalog:stock:deduct' | 'catalog:stock:restore') => {
    return (
      req: import('express').Request,
      res: import('express').Response,
      next: import('express').NextFunction,
    ) => {
      const svc = extractServiceToken(req, {
        expectedAudience: 'catalog-service',
        requiredScope: scope,
        allowedIssuers: ['commerce-service'],
        expectedResource: String(req.params.id || '').trim(),
      });
      if (!svc) {
        res.status(401).json({
          success: false,
          error: `Valid scoped service credential (${scope}) required.`,
        });
        return;
      }
      next();
    };
  };

  router.get('/search', (req, res) => controller.search(req, res));

  router.get('/mine', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.getMine(req, res),
  );
  router.get('/', optionalAuth, (req, res) => controller.getAll(req, res));

  router.get('/:id', optionalAuth, (req, res) => controller.getById(req, res));
  router.put('/:id', requireAuth, requireSellerOrAdmin, (req, res) => controller.update(req, res));
  router.delete('/:id', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.delete(req, res),
  );
  router.post('/', requireAuth, requireSellerOrAdmin, (req, res) => controller.create(req, res));
  router.post('/:id/recover', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.recover(req, res),
  );
  router.post('/:id/deduct-stock', requireCatalogStockService('catalog:stock:deduct'), (req, res) =>
    controller.deductStock(req, res),
  );
  router.post(
    '/:id/restore-stock',
    requireCatalogStockService('catalog:stock:restore'),
    (req, res) => controller.restoreStock(req, res),
  );
  router.get('/:id/reviews', (req, res) => controller.getReviews(req, res));
  router.post('/:id/reviews', requireAuth, (req, res) => controller.createReview(req, res));
  return router;
}
