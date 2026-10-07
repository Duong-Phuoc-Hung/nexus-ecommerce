import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.getAll(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));

  return router;
}
