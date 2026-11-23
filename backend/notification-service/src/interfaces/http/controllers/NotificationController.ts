import { Request, Response } from 'express';
import { GetNotificationDetailUseCase } from '../../../application/use-cases/GetNotificationDetailUseCase';
import { NotificationNotFoundException } from '../../../domain/exceptions/NotificationNotFoundException';
import { EmailService } from '../../../infrastructure/email/EmailService';

export class NotificationController {
  private readonly sseClients: Set<Response> = new Set();
  private readonly inAppNotifications: Array<{
    id: string;
    recipientId: string;
    channel: string;
    title: string;
    body: string;
    data?: any;
    read: boolean;
    createdAt: Date;
  }> = [];

  constructor(
    private readonly getNotificationDetailUseCase: GetNotificationDetailUseCase,
    private readonly emailService?: EmailService,
  ) {}

  /**
   * GET /api/v1/notifications/stream
   * TASK-NOT-01: Server-Sent Events (SSE) đẩy thông báo thời gian thực tới chuông thông báo Web
   */
  public stream(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    // Gửi thông điệp kết nối ban đầu
    res.write(
      `data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Active', timestamp: new Date().toISOString() })}\n\n`,
    );

    this.sseClients.add(res);

    req.on('close', () => {
      this.sseClients.delete(res);
      res.end();
    });
  }

  /**
   * GET /api/v1/notifications/inbox
   * TASK-NOT-01: Danh sách thông báo in-app cho người dùng (chuông thông báo Header)
   */
  public async inbox(req: Request, res: Response): Promise<void> {
    const userId = String(req.query.userId || req.headers['x-user-id'] || '');
    let items = this.inAppNotifications;
    if (userId) {
      items = items.filter((n) => n.recipientId === userId || n.recipientId === 'ALL');
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const unreadCount = items.filter((n) => !n.read).length;

    res.status(200).json({
      success: true,
      data: {
        items,
        total: items.length,
        unreadCount,
      },
    });
  }

  /**
   * PUT /api/v1/notifications/:id/read
   * Đánh dấu thông báo đã đọc
   */
  public async markAsRead(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    const item = this.inAppNotifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
    }
    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu thông báo đã đọc.',
    });
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
    const { recipientId, channel, title, body, data } = req.body || {};
    const notificationItem = {
      id: 'ntf_' + Date.now(),
      recipientId: recipientId || 'usr_01hqz789abc',
      channel: channel || 'IN_APP',
      title: title || 'System Alert',
      body: body || 'Notification body sample',
      data: data || null,
      read: false,
      createdAt: new Date(),
    };

    // Lưu vào inbox in-app
    this.inAppNotifications.push(notificationItem);

    // Broadcast tới toàn bộ các kết nối SSE đang mở
    const ssePayload = JSON.stringify({
      type: 'NOTIFICATION',
      notification: notificationItem,
    });
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${ssePayload}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }

    res.status(202).json({
      success: true,
      message: 'Notification delivered via realtime push and queued for delivery.',
      data: {
        ...notificationItem,
        status: 'DELIVERED',
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
}
