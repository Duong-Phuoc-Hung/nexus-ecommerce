import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  // TASK-NOT-01: Realtime SSE Stream & Inbox (đặt TRƯỚC /:id để không bị collision)
  router.get('/', (req, res) => controller.inbox(req, res));
  router.get('/stream', (req, res) => controller.stream(req, res));
  router.get('/inbox', (req, res) => controller.inbox(req, res));
  router.put('/:id/read', (req, res) => controller.markAsRead(req, res));

  // Tùy chọn thông báo người dùng (User Notification Preferences)
  router.get('/preferences', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        orderEmail: true,
        orderPush: true,
        promoEmail: true,
        systemPush: true,
      },
    });
  });
  router.put('/preferences', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Đã lưu tùy chọn thông báo thành công.',
      data: req.body,
    });
  });

  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/send', (req, res) => controller.send(req, res));
  router.post('/email/otp', (req, res) => controller.sendOtpEmail(req, res));
  router.post('/email/welcome', (req, res) => controller.sendWelcomeEmail(req, res));
  router.post('/email/send', (req, res) => controller.sendCustomEmail(req, res));

  return router;
}
