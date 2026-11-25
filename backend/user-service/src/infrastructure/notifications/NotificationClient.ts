export class NotificationClient {
  constructor(private readonly customBaseUrl?: string) {}

  private getBaseUrl(): string {
    return (
      this.customBaseUrl ||
      process.env.NOTIFICATION_SERVICE_URL ||
      `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`
    );
  }

  /**
   * Gọi Notification Service để gửi email OTP qua Gmail
   */
  public async sendOtpEmail(email: string, otp: string, fullName?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/notifications/email/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-email-delivery-key': process.env.EMAIL_DELIVERY_SECRET || '',
        },
        body: JSON.stringify({ email, otp, fullName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[NotificationClient] Gửi OTP thất bại (${response.status}):`, errorText);
        return false;
      }
      // Notification Service trả 200 kèm success:false khi SMTP lỗi
      const body = (await response.json().catch(() => ({}))) as { success?: boolean };
      if (body.success === false) {
        console.warn(
          '[NotificationClient] Notification Service không gửi được email OTP (lỗi SMTP).',
        );
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
      const response = await fetch(`${this.getBaseUrl()}/api/v1/notifications/email/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-email-delivery-key': process.env.EMAIL_DELIVERY_SECRET || '',
        },
        body: JSON.stringify({ email, fullName }),
      });
      return response.ok;
    } catch (err: any) {
      console.warn('[NotificationClient] Lỗi gửi welcome email:', err.message);
      return false;
    }
  }

  /**
   * Gọi Notification Service để gửi email khôi phục mật khẩu
   */
  public async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    fullName?: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/api/v1/notifications/email/password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-email-delivery-key': process.env.EMAIL_DELIVERY_SECRET || '',
          },
          body: JSON.stringify({ email, resetToken, fullName }),
        },
      );
      return response.ok;
    } catch (err: any) {
      console.warn('[NotificationClient] Lỗi gửi password reset email:', err.message);
      return false;
    }
  }
}

export const defaultNotificationClient = new NotificationClient();
