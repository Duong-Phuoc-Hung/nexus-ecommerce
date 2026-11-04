import crypto from 'node:crypto';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserAlreadyExistsException } from '../../domain/exceptions/UserAlreadyExistsException';
import { OtpRateLimitException } from '../../domain/exceptions/OtpRateLimitException';
import { RedisOtpStore } from '../../infrastructure/cache/RedisOtpStore';
import { NotificationClient } from '../../infrastructure/notifications/NotificationClient';

export class SendRegistrationOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpStore: RedisOtpStore,
    private readonly notificationClient: NotificationClient,
  ) {}

  public async execute(
    email: string,
    fullName?: string,
  ): Promise<{ success: boolean; message: string; devOtp?: string }> {
    if (!email || !email.trim()) {
      throw new Error('Email không được để trống.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Định dạng email không hợp lệ.');
    }

    // 1. Kiểm tra tài khoản đã tồn tại hay chưa
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new UserAlreadyExistsException('Email này đã được đăng ký trong hệ thống.');
    }

    // 2. Kiểm tra Cooldown (mỗi email chỉ được yêu cầu lại sau 60 giây)
    const cooldown = await this.otpStore.checkCooldown(normalizedEmail);
    if (!cooldown.allowed) {
      throw new OtpRateLimitException(
        `Vui lòng đợi ${cooldown.remainingSeconds} giây trước khi yêu cầu gửi lại mã OTP mới.`,
        cooldown.remainingSeconds,
      );
    }

    // 3. Kiểm tra Rate Limiting (tối đa 5 lần gửi OTP / 1 giờ cho mỗi email)
    const rateLimit = await this.otpStore.checkAndIncrementRateLimit(normalizedEmail, 5, 3600);
    if (!rateLimit.allowed) {
      throw new OtpRateLimitException(
        `Bạn đã yêu cầu gửi OTP quá 5 lần trong vòng 1 giờ. Vui lòng thử lại sau ${rateLimit.remainingMinutes} phút.`,
        rateLimit.remainingMinutes * 60,
      );
    }

    // 4. Sinh mã OTP 6 số ngẫu nhiên
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // 5. Lưu OTP vào Redis với thời hạn 5 phút (300 giây)
    await this.otpStore.saveOtp(normalizedEmail, otpCode, 300);

    // 6. Kích hoạt Cooldown 60 giây cho email này
    await this.otpStore.setCooldown(normalizedEmail, 60);

    // 7. Bắn email qua Notification Service (Gmail SMTP)
    const emailSent = await this.notificationClient.sendOtpEmail(
      normalizedEmail,
      otpCode,
      fullName,
    );
    if (!emailSent && process.env.NODE_ENV !== 'test') {
      throw new Error(
        'Không thể gửi email OTP. Kiểm tra Notification Service (cổng 4006) đã chạy chưa và log SMTP của nó.',
      );
    }

    const response: { success: boolean; message: string; devOtp?: string } = {
      success: true,
      message:
        'Mã xác thực OTP đã được gửi đến hòm thư Gmail của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Spam).',
    };

    // TUYỆT ĐỐI BẢO MẬT: Chỉ xuất devOtp khi đang chạy tự động trong test suite (NODE_ENV === 'test')
    // hoặc khi lập trình viên chủ động bật cờ EXPOSE_DEV_OTP === 'true' trên môi trường dev local
    if (process.env.NODE_ENV === 'test' || process.env.EXPOSE_DEV_OTP === 'true') {
      response.devOtp = otpCode;
    }

    return response;
  }
}
