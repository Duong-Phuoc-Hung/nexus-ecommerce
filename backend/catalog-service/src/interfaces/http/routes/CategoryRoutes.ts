import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';

export function createCategoryRoutes(controller: CategoryController): Router {
  const router = Router();

  // Khai báo method GET cho danh mục
  router.get('/', (req, res) => controller.getAll(req, res));

  return router;
}
