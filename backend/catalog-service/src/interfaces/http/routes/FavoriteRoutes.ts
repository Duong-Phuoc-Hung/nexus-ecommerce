import { Router } from 'express';
import { FavoriteController } from '../controllers/FavoriteController';
import { requireAuth } from '../../../infrastructure/security/auth';

export function createFavoriteRoutes(controller: FavoriteController): Router {
  const router = Router();

  // GET /api/v1/favorites -> Lấy danh sách yêu thích của Buyer
  router.get('/', requireAuth, controller.getFavorites);

  // POST /api/v1/favorites/:productId -> Thả tim / Bỏ tim sản phẩm
  router.post('/:productId', requireAuth, controller.toggleFavorite);

  return router;
}
