import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserAlreadyExistsException } from '../../domain/exceptions/UserAlreadyExistsException';
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

    // 2. Sinh mã OTP 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Lưu OTP vào Redis với thời hạn 5 phút (300 giây)
    await this.otpStore.saveOtp(normalizedEmail, otpCode, 300);

    // 4. Bắn email qua Notification Service (Gmail SMTP)
    await this.notificationClient.sendOtpEmail(normalizedEmail, otpCode, fullName);

    const response: { success: boolean; message: string; devOtp?: string } = {
      success: true,
      message:
        'Mã xác thực OTP đã được gửi đến hòm thư Gmail của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Spam).',
    };

    // Trong môi trường dev/test, trả kèm mã để dễ dàng kiểm thử tự động
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      response.devOtp = otpCode;
    }

    return response;
  }
}
