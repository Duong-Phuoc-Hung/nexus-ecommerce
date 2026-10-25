import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';

export function createCategoryRoutes(controller: CategoryController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.getAll(req, res));

  return router;
}
