import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  // TASK-NOT-01: Realtime SSE Stream & Inbox (đặt TRƯỚC /:id để không bị collision)
  router.get('/stream', (req, res) => controller.stream(req, res));
  router.get('/inbox', (req, res) => controller.inbox(req, res));
  router.put('/:id/read', (req, res) => controller.markAsRead(req, res));

  // Web Push Notifications (Sprint 3 & 4)
  router.get('/push/vapid-public-key', (req, res) => controller.getVapidPublicKey(req, res));
  router.get('/push/subscriptions', (req, res) => controller.getSubscriptions(req, res));
  router.post('/push/subscribe', (req, res) => controller.subscribeWebPush(req, res));
  router.post('/push/unsubscribe', (req, res) => controller.unsubscribeWebPush(req, res));
  router.post('/push/send', (req, res) => controller.sendWebPush(req, res));

  // Email Notifications
  router.post('/email/otp', (req, res) => controller.sendOtpEmail(req, res));
  router.post('/email/welcome', (req, res) => controller.sendWelcomeEmail(req, res));
  router.post('/email/send', (req, res) => controller.sendCustomEmail(req, res));

  // General Notification Skeleton & Retrieval
  router.post('/send', (req, res) => controller.send(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));

  return router;
}
