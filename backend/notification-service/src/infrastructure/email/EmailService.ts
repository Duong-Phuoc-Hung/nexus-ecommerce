import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Đảm bảo nạp biến môi trường từ .env
dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
} catch {}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;
  private isConfigured: boolean = false;

  constructor() {
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;

    this.fromEmail = process.env.SMTP_FROM_EMAIL || user || 'no-reply@nexus.vn';
    this.fromName = process.env.SMTP_FROM_NAME || 'Nexus E-Commerce & Auction';

    if (user && pass) {
      if (host) {
        this.transporter = nodemailer.createTransport({
          host,
          port: port || 587,
          secure: port === 465,
          auth: { user, pass },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
        });
      }
      this.isConfigured = true;
    } else {
      // Fallback in-memory json transport for tests or unconfigured environments
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.isConfigured = false;
    }
  }

  public async sendEmail(
    options: SendEmailOptions,
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const recipient = options.to.trim().toLowerCase();
      // Bỏ qua gửi SMTP thật đối với các domain test / mock để tránh bị Google Mailer Daemon báo lỗi bounce
      const isMockDomain =
        /@(nexus\.vn|example\.com|test\.com|localhost)$/i.test(recipient) ||
        recipient.endsWith('.test') ||
        recipient.endsWith('.local');

      if (isMockDomain) {
        console.log(`[EmailService] 🧪 Bỏ qua gửi SMTP thật tới domain thử nghiệm (${recipient}).`);
        return { success: true, messageId: `<mock-${Date.now()}@nexus.local>` };
      }

      if (!this.isConfigured) {
        console.error(
          '[EmailService] ❌ Thông tin xác thực SMTP (SMTP_USER / SMTP_PASS) chưa được cấu hình qua biến môi trường.',
        );
        return { success: false };
      }

      const fromHeader = `"${this.fromName}" <${this.fromEmail}>`;
      const info = await this.transporter.sendMail({
        from: fromHeader,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]+>/g, ''),
      });

      console.log(`[EmailService] ✅ Email sent to ${options.to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] ❌ Failed to send email to ${options.to}:`, error.message);
      return { success: false };
    }
  }

  /**
   * Gửi email mã OTP xác thực khi đăng ký
   */
  public async sendOtpEmail(
    toEmail: string,
    otpCode: string,
    recipientName?: string,
  ): Promise<boolean> {
    const name = recipientName ? recipientName.trim() : 'Quý khách';
    const subject = `🔐 [Nexus] Mã xác thực OTP đăng ký tài khoản: ${otpCode}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">NEXUS</h1>
          <p style="color: #6b7280; margin: 4px 0 0; font-size: 13px;">E-Commerce & Real-Time Auction Platform</p>
        </div>

        <h3 style="color: #1f2937; margin-top: 0;">Xin chào ${name},</h3>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Bạn vừa yêu cầu đăng ký tài khoản mới trên hệ thống Nexus. Dưới đây là mã xác thực dùng một lần (OTP) của bạn:
        </p>

        <div style="background-color: #f3f4f6; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1d4ed8; font-family: monospace;">${otpCode}</span>
          <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin: 10px 0 0;">Mã có hiệu lực trong vòng 5 phút (300 giây)</p>
        </div>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
          ⚠️ <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã này với bất kỳ ai, kể cả nhân viên của Nexus. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Nexus E-Commerce Platform © 2026. Mọi quyền được bảo lưu.
        </p>
      </div>
    `;

    const res = await this.sendEmail({ to: toEmail, subject, html });
    return res.success;
  }

  /**
   * Gửi email chào mừng khi đăng ký tài khoản thành công
   */
  public async sendWelcomeEmail(toEmail: string, fullName: string): Promise<boolean> {
    const name = fullName ? fullName.trim() : 'Quý khách';
    const subject = `🎉 Chào mừng ${name} gia nhập Nexus E-Commerce & Auction!`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">NEXUS</h1>
          <p style="color: #6b7280; margin: 4px 0 0; font-size: 13px;">E-Commerce & Real-Time Auction Platform</p>
        </div>

        <div style="text-align: center; padding: 15px 0;">
          <span style="font-size: 48px;">🎊</span>
          <h2 style="color: #111827; margin: 10px 0 5px; font-size: 22px;">Đăng Ký Tài Khoản Thành Công!</h2>
          <p style="color: #16a34a; font-weight: 600; font-size: 15px; margin: 0;">Tài khoản của bạn đã được kích hoạt và sẵn sàng hoạt động.</p>
        </div>

        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 16px; margin: 25px 0;">
          <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Tài khoản:</strong> ${toEmail}</p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #334155;"><strong>Họ và tên:</strong> ${name}</p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #334155;"><strong>Trạng thái:</strong> <span style="color: #16a34a; font-weight: bold;">HOẠT ĐỘNG (ACTIVE)</span></p>
        </div>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
          Bây giờ bạn đã có thể tham gia vào các phiên đấu giá trực tiếp, đặt giá thầu cạnh tranh hoặc mua sắm các sản phẩm công nghệ độc quyền trên sàn Nexus.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/auctions" style="background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; display: inline-block;">
            Khám Phá Sàn Đấu Giá Ngay →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Nếu bạn cần hỗ trợ, vui lòng phản hồi email này hoặc liên hệ hotline Nexus Support.<br />
          Nexus E-Commerce Platform © 2026.
        </p>
      </div>
    `;

    const res = await this.sendEmail({ to: toEmail, subject, html });
    return res.success;
  }

  /**
   * Gửi email thông báo chung
   */
  public async sendCustomNotification(
    toEmail: string,
    title: string,
    body: string,
  ): Promise<boolean> {
    const subject = `📢 [Nexus] ${title}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: 800;">NEXUS</h1>
        </div>
        <h3 style="color: #1f2937; margin-top: 0;">${title}</h3>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">${body}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Nexus E-Commerce Platform © 2026.
        </p>
      </div>
    `;

    const res = await this.sendEmail({ to: toEmail, subject, html });
    return res.success;
  }
}
