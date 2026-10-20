import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IPasswordHasher } from '../ports/IPasswordHasher';
import { IEventPublisher } from '../ports/IEventPublisher';
import { RegisterRequestDto, RegisterResponseDto } from '../dtos/RegisterDto';
import { User, UserRole, UserStatus } from '../../domain/entities/User';
import { UserAlreadyExistsException } from '../../domain/exceptions/UserAlreadyExistsException';
import { UserRegisteredEvent } from '../../domain/events/UserRegisteredEvent';

/**
 * Application Use Case: RegisterUseCase
 * Xử lý luồng đăng ký tài khoản mới, kiểm tra trùng lặp và băm mật khẩu (SRS 3.1.1).
 */
export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly eventPublisher?: IEventPublisher,
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

    // 3. Băm mật khẩu an toàn bằng thư viện bcrypt
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // 4. Tạo thực thể User mới
    const now = new Date();
    const generatedId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const role = dto.role && Object.values(UserRole).includes(dto.role) ? dto.role : UserRole.BUYER;

    const newUser = new User({
      id: generatedId,
      email: normalizedEmail,
      fullName: dto.fullName.trim(),
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      reputationScore: 100,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Lưu thực thể vào cơ sở dữ liệu thông qua Repository
    await this.userRepository.save(newUser);

    // 6. Phát tán Domain Event ra RabbitMQ nếu có event publisher
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

    // 7. Trả về kết quả đăng ký
    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      status: newUser.status,
      reputationScore: newUser.reputationScore,
      createdAt: newUser.createdAt,
    };
  }
}
