import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/send', (req, res) => controller.send(req, res));

  return router;
}
