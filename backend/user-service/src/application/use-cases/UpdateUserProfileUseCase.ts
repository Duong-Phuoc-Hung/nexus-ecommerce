import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';
import { UserProfileDto } from '../dtos/UserProfileDto';

export interface UpdateUserProfileInput {
  fullName?: string;
  phone?: string;
}

/**
 * UseCase: UpdateUserProfileUseCase
 * Cho phép người dùng cập nhật họ tên và số điện thoại của chính mình (SRS 3.1 & P0 #2).
 */
export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(userId: string, input: UpdateUserProfileInput): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (input.fullName !== undefined) {
      const trimmedName = input.fullName.trim();
      if (!trimmedName || trimmedName.length > 100) {
        throw new Error('Họ và tên không được để trống và tối đa 100 ký tự.');
      }
      user.setFullName(trimmedName);
    }

    if (input.phone !== undefined) {
      const trimmedPhone = input.phone.trim();
      const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!vnPhoneRegex.test(trimmedPhone)) {
        throw new Error('Số điện thoại không đúng định dạng Việt Nam.');
      }
      const normalizedPhone = trimmedPhone.startsWith('+84')
        ? '0' + trimmedPhone.slice(3)
        : trimmedPhone;

      if (this.userRepository.findByPhone) {
        const existingPhoneUser = await this.userRepository.findByPhone(normalizedPhone);
        if (existingPhoneUser && existingPhoneUser.id !== user.id) {
          throw new Error('Số điện thoại này đã được đăng ký bởi tài khoản khác.');
        }
      }
      user.setPhone(normalizedPhone);
    }

    await this.userRepository.update(user);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || undefined,
      role: user.role,
      status: user.status,
      reputationScore: user.reputationScore,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
