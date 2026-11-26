import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { GetNotificationDetailUseCase } from '../../../application/use-cases/GetNotificationDetailUseCase';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
} from '../../../domain/entities/Notification';
import { NotificationNotFoundException } from '../../../domain/exceptions/NotificationNotFoundException';
import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { EmailService } from '../../../infrastructure/email/EmailService';
import { WebPushService } from '../../../application/services/WebPushService';
import { PostgresNotificationRepository } from '../../../infrastructure/repositories/PostgresNotificationRepository';
import { RabbitMqEventPublisher } from '../../../infrastructure/messaging/RabbitMqEventPublisher';
import { AuthRequest, isInternalServiceRequest, isStaffOrAdmin } from '../middleware/auth';

export interface NotificationPreferencesDto {
  orderEmail: boolean;
  orderPush: boolean;
  auctionEmail: boolean;
  auctionPush: boolean;
  accountEmail: boolean;
  accountPush: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferencesDto = {
  orderEmail: true,
  orderPush: true,
  auctionEmail: true,
  auctionPush: true,
  accountEmail: true,
  accountPush: true,
};

export class NotificationController {
  private readonly webPushService: WebPushService;
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
  private readonly preferencesByUser: Map<string, NotificationPreferencesDto> = new Map();
  private readonly idempotencyMemory: Map<string, Notification> = new Map();

  constructor(
    private readonly getNotificationDetailUseCase: GetNotificationDetailUseCase,
    private readonly emailService?: EmailService,
    private readonly notificationRepository?: INotificationRepository,
    private readonly eventPublisher?: RabbitMqEventPublisher,
    webPushService?: WebPushService,
  ) {
    this.webPushService = webPushService || new WebPushService();
  }

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
      const normalizedUser = userId.trim().toLowerCase();
      items = items.filter(
        (n) =>
          n.recipientId.trim().toLowerCase() === normalizedUser ||
          n.recipientId.toUpperCase() === 'ALL',
      );
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
   * GET /api/v1/notifications
   * Danh sách thông báo của người dùng hiện tại (Admin/Support có thể lọc theo recipientId hoặc xem toàn bộ)
   */
  public async list(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const staffOrAdmin = isStaffOrAdmin(authUser);
      const requestedRecipient =
        typeof req.query.recipientId === 'string' ? req.query.recipientId.trim() : '';
      const scopeAll = staffOrAdmin && req.query.scope === 'all';
      const targetUserId = staffOrAdmin
        ? requestedRecipient || (scopeAll ? '' : authUser.sub)
        : authUser.sub;

      const category =
        typeof req.query.category === 'string' ? req.query.category.trim().toUpperCase() : '';

      let items: Notification[] = [];
      if (this.notificationRepository) {
        items = targetUserId
          ? await this.notificationRepository.findByRecipientId(targetUserId)
          : await this.notificationRepository.findAll();
      }

      if (category && category !== 'ALL') {
        items = items.filter((n) => n.category === category);
      }

      const serialized = items.map((n) => n.toJSON());
      const unreadCount = serialized.filter((n) => !n.read).length;

      res.status(200).json({
        success: true,
        data: {
          items: serialized,
          unreadCount,
          total: serialized.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tải danh sách thông báo.',
      });
    }
  }

  /**
   * GET /api/v1/notifications/preferences
   */
  public async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      let saved: NotificationPreferencesDto | null = null;
      if (this.notificationRepository instanceof PostgresNotificationRepository) {
        saved = await this.notificationRepository.getPreferences(authUser.sub);
      } else {
        saved = this.preferencesByUser.get(authUser.sub) ?? null;
      }

      res.status(200).json({
        success: true,
        data: {
          ...DEFAULT_PREFERENCES,
          ...(saved || {}),
          orderEmail: true,
          orderPush: true,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tải cấu hình thông báo.',
      });
    }
  }

  /**
   * PUT / PATCH /api/v1/notifications/preferences
   */
  public async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      let current: NotificationPreferencesDto = DEFAULT_PREFERENCES;
      if (this.notificationRepository instanceof PostgresNotificationRepository) {
        current =
          (await this.notificationRepository.getPreferences(authUser.sub)) || DEFAULT_PREFERENCES;
      } else {
        current = this.preferencesByUser.get(authUser.sub) || DEFAULT_PREFERENCES;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const updated: NotificationPreferencesDto = {
        // SRS 3.2: Thông báo giao dịch/đơn hàng luôn bật để đảm bảo SLA giao nhận
        orderEmail: true,
        orderPush: true,
        auctionEmail:
          typeof body.auctionEmail === 'boolean' ? body.auctionEmail : current.auctionEmail,
        auctionPush: typeof body.auctionPush === 'boolean' ? body.auctionPush : current.auctionPush,
        accountEmail:
          typeof body.accountEmail === 'boolean' ? body.accountEmail : current.accountEmail,
        accountPush: typeof body.accountPush === 'boolean' ? body.accountPush : current.accountPush,
      };

      if (this.notificationRepository instanceof PostgresNotificationRepository) {
        await this.notificationRepository.savePreferences(authUser.sub, updated);
      } else {
        this.preferencesByUser.set(authUser.sub, updated);
      }

      res.status(200).json({
        success: true,
        message: 'Đã lưu tùy chọn thông báo.',
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể lưu cấu hình thông báo.',
      });
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  public async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      if (!this.notificationRepository) {
        res.status(200).json({ success: true, data: { id: req.params.id, read: true } });
        return;
      }

      const id = String(req.params.id || '').trim();
      const notification = await this.notificationRepository.findById(id);
      if (!notification) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy thông báo "${id}".`,
        });
        return;
      }

      if (!isStaffOrAdmin(authUser) && notification.recipientId !== authUser.sub) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền thao tác trên thông báo của người dùng khác.',
        });
        return;
      }

      notification.markAsRead();
      await this.notificationRepository.update(notification);

      const foundInMem = this.inAppNotifications.find((n) => n.id === id);
      if (foundInMem) {
        foundInMem.read = true;
      }

      res.status(200).json({
        success: true,
        data: notification.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể đánh dấu đã đọc.',
      });
    }
  }

  /**
   * POST /api/v1/notifications/read-all
   */
  public async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      for (const item of this.inAppNotifications) {
        if (item.recipientId === authUser.sub || item.recipientId === 'ALL') {
          item.read = true;
        }
      }
      if (!this.notificationRepository) {
        res.status(200).json({ success: true, data: { updatedCount: 0 } });
        return;
      }

      if (this.notificationRepository instanceof PostgresNotificationRepository) {
        const updatedCount = await this.notificationRepository.markAllReadForRecipient(
          authUser.sub,
        );
        res.status(200).json({ success: true, data: { updatedCount } });
        return;
      }

      const list = await this.notificationRepository.findByRecipientId(authUser.sub);
      let updatedCount = 0;
      for (const item of list) {
        if (!item.read) {
          item.markAsRead();
          await this.notificationRepository.update(item);
          updatedCount += 1;
        }
      }

      res.status(200).json({
        success: true,
        data: { updatedCount },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể đánh dấu tất cả thông báo đã đọc.',
      });
    }
  }

  /**
   * GET /api/v1/notifications/:id
   * Kiểm tra quyền sở hữu recipientId (chỉ chính chủ hoặc Admin/Support mới được xem)
   */
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const id = String(req.params.id || '').trim();
      const notification = await this.getNotificationDetailUseCase.execute(id);

      if (!isStaffOrAdmin(authUser) && notification.recipientId !== authUser.sub) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền xem thông báo của người dùng khác.',
        });
        return;
      }

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
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser || !isStaffOrAdmin(authUser)) {
        res.status(403).json({
          success: false,
          error: 'Chỉ quản trị viên hoặc nhân viên hỗ trợ mới được gửi thông báo hệ thống.',
        });
        return;
      }

      const { recipientId, recipientEmail, channel, category, title, body, href } = req.body || {};
      const now = new Date();
      const id = `ntf_${crypto.randomUUID().slice(0, 12)}`;
      const resolvedRecipient = String(recipientId || authUser.sub).trim();
      const resolvedChannel = Object.values(NotificationChannel).includes(channel)
        ? channel
        : NotificationChannel.IN_APP;
      const resolvedCategory =
        category === 'ORDER' || category === 'AUCTION' || category === 'ACCOUNT'
          ? category
          : 'ACCOUNT';

      if (this.notificationRepository) {
        const entity = new Notification({
          id,
          recipientId: resolvedRecipient,
          recipientEmail: typeof recipientEmail === 'string' ? recipientEmail : undefined,
          channel: resolvedChannel,
          category: resolvedCategory,
          title: title || 'Thông báo từ Nexus',
          body: body || 'Bạn có cập nhật mới từ hệ thống.',
          status: NotificationStatus.SENT,
          href: typeof href === 'string' ? href : undefined,
          sentAt: now,
          createdAt: now,
          updatedAt: now,
        });
        await this.notificationRepository.save(entity);
      }

      this.inAppNotifications.push({
        id,
        recipientId: resolvedRecipient,
        channel: resolvedChannel,
        title: title || 'Thông báo từ Nexus',
        body: body || 'Bạn có cập nhật mới từ hệ thống.',
        data: req.body?.data,
        read: false,
        createdAt: now,
      });

      if (this.eventPublisher) {
        await this.eventPublisher.publish(
          'NotificationDispatched',
          {
            notificationId: id,
            recipientId: resolvedRecipient,
            channel: resolvedChannel,
            category: resolvedCategory,
            title: title || 'Thông báo từ Nexus',
            dispatchedBy: authUser.sub,
          },
          'notification-service',
        );
      }

      res.status(202).json({
        success: true,
        message: 'Notification queued for delivery',
        data: {
          id,
          notificationId: id,
          recipientId: resolvedRecipient,
          channel: resolvedChannel,
          category: resolvedCategory,
          title: title || 'Thông báo từ Nexus',
          body: body || 'Bạn có cập nhật mới từ hệ thống.',
          status: 'SENT',
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể gửi thông báo.',
      });
    }
  }

  /**
   * POST /api/v1/notifications/internal/dispatch
   * Idempotent internal dispatch (dùng cho hóa đơn điện tử T19 và sự kiện từ các microservice)
   */
  public async dispatchInternal(req: Request, res: Response): Promise<void> {
    try {
      if (!isInternalServiceRequest(req)) {
        res.status(403).json({ success: false, error: 'Forbidden: internal service access only.' });
        return;
      }

      const { recipientId, recipientEmail, channel, category, title, body, href, idempotencyKey } =
        req.body || {};
      const resolvedKey = String(idempotencyKey || req.headers['idempotency-key'] || '').trim();

      if (!recipientId || !title || !body) {
        res.status(400).json({
          success: false,
          error: 'recipientId, title and body are required.',
        });
        return;
      }

      if (resolvedKey) {
        if (this.notificationRepository instanceof PostgresNotificationRepository) {
          const existing = await this.notificationRepository.findByIdempotencyKey(resolvedKey);
          if (existing) {
            res.status(200).json({
              success: true,
              deduplicated: true,
              data: existing.toJSON(),
            });
            return;
          }
        } else if (this.idempotencyMemory.has(resolvedKey)) {
          res.status(200).json({
            success: true,
            deduplicated: true,
            data: this.idempotencyMemory.get(resolvedKey)!.toJSON(),
          });
          return;
        }
      }

      const now = new Date();
      const id = `ntf_${crypto.randomUUID().slice(0, 12)}`;
      const resolvedChannel = Object.values(NotificationChannel).includes(channel)
        ? channel
        : NotificationChannel.IN_APP;
      const resolvedCategory =
        category === 'ORDER' || category === 'AUCTION' || category === 'ACCOUNT'
          ? category
          : 'ORDER';

      const entity = new Notification({
        id,
        recipientId: String(recipientId).trim(),
        recipientEmail: typeof recipientEmail === 'string' ? recipientEmail : undefined,
        channel: resolvedChannel,
        category: resolvedCategory,
        title: String(title).trim(),
        body: String(body).trim(),
        status: NotificationStatus.SENT,
        href: typeof href === 'string' ? href : undefined,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      });

      if (this.notificationRepository instanceof PostgresNotificationRepository) {
        await this.notificationRepository.save(entity, resolvedKey || undefined);
      } else if (this.notificationRepository) {
        await this.notificationRepository.save(entity);
        if (resolvedKey) {
          this.idempotencyMemory.set(resolvedKey, entity);
        }
      }

      if (this.eventPublisher) {
        await this.eventPublisher.publish(
          'NotificationDispatched',
          {
            eventId: resolvedKey ? `evt_ntf_${resolvedKey}` : undefined,
            notificationId: id,
            recipientId: entity.recipientId,
            channel: resolvedChannel,
            category: resolvedCategory,
            title: entity.title,
          },
          'notification-service',
        );
      }

      res.status(201).json({
        success: true,
        deduplicated: false,
        data: entity.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể điều phối thông báo nội bộ.',
      });
    }
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
   * POST /api/v1/notifications/email/password-reset
   */
  public async sendPasswordResetEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, resetToken, fullName } = req.body || {};
      if (!email || !resetToken) {
        res.status(400).json({ success: false, error: 'Email and resetToken are required.' });
        return;
      }

      if (!this.emailService) {
        res.status(500).json({ success: false, error: 'EmailService is not configured.' });
        return;
      }

      const greeting = fullName ? `Xin chào ${fullName},` : 'Xin chào,';
      const frontendUrl = (
        process.env.FRONTEND_URL ||
        process.env.WEB_APP_URL ||
        'http://localhost:3000'
      ).replace(/\/$/, '');
      const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
      const success = await this.emailService.sendCustomNotification(
        email,
        '[Nexus] Yêu cầu đặt lại mật khẩu tài khoản',
        `${greeting}\n\nNhấn vào liên kết sau để đặt lại mật khẩu (hiệu lực 15 phút):\n${resetLink}\n\nHoặc nhập trực tiếp mã đặt lại mật khẩu: ${resetToken}\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
      );
      res.status(200).json({
        success,
        message: success
          ? 'Email đặt lại mật khẩu đã được gửi.'
          : 'Gửi email đặt lại mật khẩu thất bại.',
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
