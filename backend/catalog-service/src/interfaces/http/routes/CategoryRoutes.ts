import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';

export function createCategoryRoutes(controller: CategoryController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.getCategories(req, res));
  router.get('/:id', (req, res) => controller.getCategoryById(req, res));

  return router;
}
