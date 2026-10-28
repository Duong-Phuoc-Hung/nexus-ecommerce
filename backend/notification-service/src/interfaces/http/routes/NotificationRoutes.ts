import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/send', (req, res) => controller.send(req, res));
  router.post('/email/otp', (req, res) => controller.sendOtpEmail(req, res));
  router.post('/email/welcome', (req, res) => controller.sendWelcomeEmail(req, res));
  router.post('/email/send', (req, res) => controller.sendCustomEmail(req, res));

  return router;
}
