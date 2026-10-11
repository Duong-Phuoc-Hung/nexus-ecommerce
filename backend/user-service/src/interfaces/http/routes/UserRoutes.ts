import { Router } from 'express';
import { UserController } from '../controllers/UserController';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  router.get('/profile', (req, res) => controller.getProfile(req, res));
  router.get('/:id', (req, res) => controller.getProfile(req, res));
  router.post('/register', (req, res) => controller.register(req, res));

  return router;
}
