export class NotificationClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NOTIFICATION_SERVICE_URL ||
      `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`;
  }

  /**
   * Gọi Notification Service để gửi email OTP qua Gmail
   */
  public async sendOtpEmail(email: string, otp: string, fullName?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/notifications/email/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, fullName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[NotificationClient] Gửi OTP thất bại (${response.status}):`, errorText);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[NotificationClient] Không kết nối được Notification Service:', err.message);
      return false;
    }
  }

  /**
   * Gọi Notification Service để gửi email chào mừng
   */
  public async sendWelcomeEmail(email: string, fullName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/notifications/email/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      });
      return response.ok;
    } catch (err: any) {
      console.warn('[NotificationClient] Lỗi gửi welcome email:', err.message);
      return false;
    }
  }
}

export const defaultNotificationClient = new NotificationClient();
