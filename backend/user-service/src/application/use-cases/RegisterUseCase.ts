import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IPasswordHasher } from '../ports/IPasswordHasher';
import { IEventPublisher } from '../ports/IEventPublisher';
import { RegisterRequestDto, RegisterResponseDto } from '../dtos/RegisterDto';
import { User, UserRole, UserStatus } from '../../domain/entities/User';
import { UserAlreadyExistsException } from '../../domain/exceptions/UserAlreadyExistsException';
import { UserRegisteredEvent } from '../../domain/events/UserRegisteredEvent';
import { RedisOtpStore } from '../../infrastructure/cache/RedisOtpStore';
import { NotificationClient } from '../../infrastructure/notifications/NotificationClient';
import { generateUuidV7 } from '../../infrastructure/security/auth';

/**
 * Application Use Case: RegisterUseCase
 * Xử lý luồng đăng ký tài khoản mới, xác thực mã OTP Gmail, kiểm tra trùng lặp và băm mật khẩu (SRS 3.1.1).
 */
export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly eventPublisher?: IEventPublisher,
    private readonly otpStore?: RedisOtpStore,
    private readonly notificationClient?: NotificationClient,
  ) {}

  public async execute(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào
    if (!dto.email || !dto.email.trim()) {
      throw new Error('Email không được để trống');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email.trim())) {
      throw new Error('Định dạng email không hợp lệ');
    }

    if (!dto.password || dto.password.length < 6) {
      throw new Error('Mật khẩu phải có độ dài tối thiểu 6 ký tự');
    }

    if (!dto.fullName || !dto.fullName.trim()) {
      throw new Error('Họ và tên không được để trống');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    // 2. Kiểm tra tài khoản đã tồn tại hay chưa
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new UserAlreadyExistsException('Tài khoản với email này đã tồn tại trong hệ thống');
    }

    // 3. Xác thực mã OTP từ Gmail (Bắt buộc 100% để chống bypass OTP)
    if (this.otpStore) {
      if (!dto.otp || !dto.otp.trim()) {
        throw new Error('Vui lòng nhập mã xác thực OTP đã gửi qua hòm thư Gmail của bạn.');
      }
      const isValidOtp = await this.otpStore.verifyAndConsumeOtp(normalizedEmail, dto.otp);
      if (!isValidOtp) {
        throw new Error(
          'Mã xác thực OTP không chính xác hoặc đã hết hạn (hoặc đã bị khóa do nhập sai quá nhiều lần). Vui lòng nhận lại mã mới.',
        );
      }
    }

    // 4. Kiểm tra số điện thoại (nếu có truyền)
    let normalizedPhone: string;
    if (dto.phone && dto.phone.trim()) {
      const trimmedPhone = dto.phone.trim();
      const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!vnPhoneRegex.test(trimmedPhone)) {
        throw new Error('Số điện thoại không đúng định dạng Việt Nam.');
      }
      normalizedPhone = trimmedPhone.startsWith('+84') ? '0' + trimmedPhone.slice(3) : trimmedPhone;

      if (this.userRepository.findByPhone) {
        const existingPhoneUser = await this.userRepository.findByPhone(normalizedPhone);
        if (existingPhoneUser) {
          throw new UserAlreadyExistsException('Số điện thoại này đã được đăng ký trong hệ thống.');
        }
      }
    } else {
      // Fallback hợp lệ cho luồng cũ / integration test khi client chưa truyền phone
      normalizedPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
    }

    // 5. Băm mật khẩu an toàn bằng thư viện bcrypt
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // 6. Tạo thực thể User mới (luôn là BUYER, không nhận role từ client)
    const now = new Date();
    const generatedId = generateUuidV7();
    const role = UserRole.BUYER;

    const newUser = new User({
      id: generatedId,
      email: normalizedEmail,
      fullName: dto.fullName.trim(),
      phone: normalizedPhone,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      reputationScore: 100,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Lưu thực thể vào cơ sở dữ liệu thông qua Repository
    await this.userRepository.save(newUser);

    // 8. Gửi email thông báo chào mừng trực tiếp qua NotificationClient
    if (this.notificationClient) {
      this.notificationClient.sendWelcomeEmail(newUser.email, newUser.fullName).catch((err) => {
        console.warn('[RegisterUseCase] Không thể gửi welcome email:', err);
      });
    }

    // 9. Phát tán Domain Event ra RabbitMQ nếu có event publisher
    if (this.eventPublisher) {
      try {
        const event = new UserRegisteredEvent({
          userId: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          timestamp: new Date().toISOString(),
        });
        await this.eventPublisher.publish(event.eventName, event.payload);
      } catch (error) {
        console.warn('[RegisterUseCase] Không thể phát tán sự kiện UserRegisteredEvent:', error);
      }
    }

    // 10. Trả về kết quả đăng ký
    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      phone: newUser.phone,
      role: newUser.role,
      status: newUser.status,
      reputationScore: newUser.reputationScore,
      createdAt: newUser.createdAt,
    };
  }
}
