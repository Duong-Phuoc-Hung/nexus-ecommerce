import { Request, Response } from 'express';
import { GetNotificationDetailUseCase } from '../../../application/use-cases/GetNotificationDetailUseCase';
import { NotificationNotFoundException } from '../../../domain/exceptions/NotificationNotFoundException';
import { EmailService } from '../../../infrastructure/email/EmailService';
import { WebPushService } from '../../../application/services/WebPushService';

export class NotificationController {
  private readonly webPushService: WebPushService;

  constructor(
    private readonly getNotificationDetailUseCase: GetNotificationDetailUseCase,
    private readonly emailService?: EmailService,
    webPushService?: WebPushService,
  ) {
    this.webPushService = webPushService || new WebPushService();
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = (req.params.id || 'ntf_01hqz111welcome') as string;
      const notification = await this.getNotificationDetailUseCase.execute(id);
      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      if (error instanceof NotificationNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }

  public async send(req: Request, res: Response): Promise<void> {
    const { recipientId, channel, title, body } = req.body;
    res.status(202).json({
      success: true,
      message: 'Notification queued for delivery (Skeleton mode)',
      data: {
        notificationId: 'ntf_' + Date.now(),
        recipientId: recipientId || 'usr_01hqz789abc',
        channel: channel || 'EMAIL',
        title: title || 'System Alert',
        body: body || 'Notification body sample',
        status: 'QUEUED',
      },
    });
  }

  /**
   * POST /api/v1/notifications/email/otp
   */
  public async sendOtpEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, fullName } = req.body;
      if (!email || !otp) {
        res.status(400).json({ success: false, error: 'Email and otp are required.' });
        return;
      }

      if (!this.emailService) {
        res.status(500).json({ success: false, error: 'EmailService is not configured.' });
        return;
      }

      const success = await this.emailService.sendOtpEmail(email, otp, fullName);
      res
        .status(200)
        .json({ success, message: success ? 'Mã OTP đã được gửi.' : 'Gửi OTP thất bại.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  }

  /**
   * POST /api/v1/notifications/email/welcome
   */
  public async sendWelcomeEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, fullName } = req.body;
      if (!email || !fullName) {
        res.status(400).json({ success: false, error: 'Email and fullName are required.' });
        return;
      }

      if (!this.emailService) {
        res.status(500).json({ success: false, error: 'EmailService is not configured.' });
        return;
      }

      const success = await this.emailService.sendWelcomeEmail(email, fullName);
      res.status(200).json({
        success,
        message: success ? 'Email chào mừng đã được gửi.' : 'Gửi email thất bại.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  }

  /**
   * POST /api/v1/notifications/email/send
   */
  public async sendCustomEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, title, body } = req.body;
      if (!email || !title || !body) {
        res.status(400).json({ success: false, error: 'Email, title, and body are required.' });
        return;
      }

      if (!this.emailService) {
        res.status(500).json({ success: false, error: 'EmailService is not configured.' });
        return;
      }

      const success = await this.emailService.sendCustomNotification(email, title, body);
      res
        .status(200)
        .json({ success, message: success ? 'Email thông báo đã gửi.' : 'Gửi email thất bại.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  }

  /**
   * GET /api/v1/notifications/push/vapid-public-key
   */
  public async getVapidPublicKey(_req: Request, res: Response): Promise<void> {
    try {
      const data = this.webPushService.getVapidPublicKey();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  }

  /**
   * POST /api/v1/notifications/push/subscribe
   */
  public async subscribeWebPush(req: Request, res: Response): Promise<void> {
    try {
      const { userId, subscription } = req.body;
      const record = this.webPushService.registerSubscription(userId, subscription);
      res.status(201).json({
        success: true,
        message: 'Đăng ký nhận thông báo Web Push thành công.',
        data: record,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Bad Request' });
    }
  }

  /**
   * POST /api/v1/notifications/push/unsubscribe
   */
  public async unsubscribeWebPush(req: Request, res: Response): Promise<void> {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        res.status(400).json({ success: false, error: 'Endpoint is required to unsubscribe.' });
        return;
      }
      const removed = this.webPushService.unregisterSubscription(endpoint);
      res.status(200).json({
        success: true,
        message: removed ? 'Đã hủy đăng ký Web Push.' : 'Subscription không tồn tại.',
        removed,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  }

  /**
   * GET /api/v1/notifications/push/subscriptions
   */
  public async getSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string | undefined;
      const list = this.webPushService.getSubscriptions(userId);
      res.status(200).json({ success: true, data: list, count: list.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  }

  /**
   * POST /api/v1/notifications/push/send
   */
  public async sendWebPush(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.webPushService.sendPushNotification(req.body);
      res.status(200).json({
        success: true,
        message: `Đã gửi thông báo đẩy tới ${result.targetCount} thiết bị.`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Bad Request' });
    }
  }
}
