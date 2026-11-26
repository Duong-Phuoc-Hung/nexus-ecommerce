import { authorizeEmail } from '../middleware/emailDelivery';
import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { requireAuth } from '../middleware/auth';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  // Route tĩnh đặt TRƯỚC /:id để tránh /:id bắt nhầm /preferences hoặc /read-all
  router.get('/', requireAuth, (req, res) => controller.list(req, res));
  router.get('/stream', (req, res) => controller.stream(req, res));
  router.get('/inbox', (req, res) => controller.inbox(req, res));
  router.get('/preferences', requireAuth, (req, res) => controller.getPreferences(req, res));
  router.put('/preferences', requireAuth, (req, res) => controller.updatePreferences(req, res));
  router.patch('/preferences', requireAuth, (req, res) => controller.updatePreferences(req, res));
  router.post('/read-all', requireAuth, (req, res) => controller.markAllAsRead(req, res));
  router.post('/send', requireAuth, (req, res) => controller.send(req, res));
  router.post('/internal/dispatch', (req, res) => controller.dispatchInternal(req, res));
  router.post('/email/otp', authorizeEmail('otp'), (req, res) => controller.sendOtpEmail(req, res));
  router.post('/email/welcome', authorizeEmail('welcome'), (req, res) =>
    controller.sendWelcomeEmail(req, res),
  );
  router.post('/email/password-reset', authorizeEmail('password-reset'), (req, res) =>
    controller.sendPasswordResetEmail(req, res),
  );
  router.post('/email/send', authorizeEmail('send'), (req, res) =>
    controller.sendCustomEmail(req, res),
  );
  router.put('/:id/read', requireAuth, (req, res) => controller.markAsRead(req, res));
  router.patch('/:id/read', requireAuth, (req, res) => controller.markAsRead(req, res));
  router.get('/:id', requireAuth, (req, res) => controller.getById(req, res));

  return router;
}
