import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { requireAuth, requireProductPermission } from '../../../infrastructure/security/auth';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  // Public Endpoints
  router.get('/search', (req, res) => controller.search(req, res));
  router.get('/', (req, res) => controller.getAll(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));

  // Protected Endpoints: Kiểm tra quyền Seller / Admin
  router.post('/', requireAuth, requireProductPermission('CREATE'), (req, res) =>
    controller.create(req, res),
  );

  router.patch('/:id', requireAuth, requireProductPermission('UPDATE'), (req, res) =>
    controller.update(req, res),
  );

  return router;
}
