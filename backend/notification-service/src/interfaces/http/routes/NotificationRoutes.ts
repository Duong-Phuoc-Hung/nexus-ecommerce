import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  // TASK-NOT-01: Realtime SSE Stream & Inbox (đặt TRƯỚC /:id để không bị collision)
  router.get('/stream', (req, res) => controller.stream(req, res));
  router.get('/inbox', (req, res) => controller.inbox(req, res));
  router.put('/:id/read', (req, res) => controller.markAsRead(req, res));

  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/send', (req, res) => controller.send(req, res));
  router.post('/email/otp', (req, res) => controller.sendOtpEmail(req, res));
  router.post('/email/welcome', (req, res) => controller.sendWelcomeEmail(req, res));
  router.post('/email/send', (req, res) => controller.sendCustomEmail(req, res));

  return router;
}
