import { INotificationClient } from '../../application/checkout/ports';

/**
 * Client kết nối tới Notification Service (SRS 3.2 & 3.4).
 * Hỗ trợ gửi thông báo real-time in-app (SSE) và email xác nhận/tiến trình đơn hàng.
 * Thực thi an toàn theo cơ chế non-blocking (không chặn luồng checkout/cập nhật đơn).
 */
export class CommerceNotificationClient implements INotificationClient {
  constructor(
    private readonly baseUrl = process.env.NOTIFICATION_SERVICE_URL ||
      `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`,
  ) {}

  private getInternalHeaders(): Record<string, string> {
    const secret =
      process.env.INTERNAL_SERVICE_SECRET?.trim() ||
      process.env.INTERNAL_SERVICE_JWT_SECRET?.trim() ||
      'nexus-internal-service-key';
    return {
      'Content-Type': 'application/json',
      'x-internal-service-key': secret,
    };
  }

  public async sendInAppNotification(params: {
    recipientId: string;
    channel?: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      const orderId = typeof params.data?.orderId === 'string' ? params.data.orderId : undefined;
      const res = await fetch(`${this.baseUrl}/api/v1/notifications/internal/dispatch`, {
        method: 'POST',
        headers: this.getInternalHeaders(),
        body: JSON.stringify({
          recipientId: params.recipientId,
          channel: 'IN_APP',
          category: 'ORDER',
          title: params.title,
          body: params.body,
          href: orderId ? `/orders/${encodeURIComponent(orderId)}` : undefined,
        }),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch (err: any) {
      console.warn(
        '[CommerceNotificationClient] Gửi in-app notification thất bại:',
        err?.message || err,
      );
      return false;
    }
  }

  public async sendOrderConfirmationEmail(params: {
    email: string;
    title: string;
    body: string;
    recipientId?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/notifications/internal/dispatch`, {
        method: 'POST',
        headers: this.getInternalHeaders(),
        body: JSON.stringify({
          recipientId: params.recipientId || params.email,
          recipientEmail: params.email,
          channel: 'EMAIL',
          category: 'ORDER',
          title: params.title,
          body: params.body,
        }),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch (err: any) {
      console.warn(
        '[CommerceNotificationClient] Gửi email thông báo đơn hàng thất bại:',
        err?.message || err,
      );
      return false;
    }
  }
}
