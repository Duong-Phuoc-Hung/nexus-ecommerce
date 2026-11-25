import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';
import { UserProfileDto } from '../dtos/UserProfileDto';

/**
 * UseCase: GetUserProfileUseCase
 * Ứng dụng nghiệp vụ truy xuất thông tin hồ sơ người dùng.
 * Phụ thuộc vào interface IUserRepository (Dependency Inversion Principle).
 */
export class GetUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(identifier: string, includePrivateFields = false): Promise<UserProfileDto> {
    const trimmed = identifier.trim();
    const user = trimmed.includes('@')
      ? await this.userRepository.findByEmail(trimmed.toLowerCase())
      : await this.userRepository.findById(trimmed);

    if (!user) {
      throw new UserNotFoundException(identifier);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || undefined,
      role: user.role,
      status: user.status,
      reputationScore: user.reputationScore,
      ...(includePrivateFields
        ? {
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            identifyNumber: user.identifyNumber ?? null,
            address: user.address ?? null,
            updatedAt: user.updatedAt.toISOString(),
          }
        : {}),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
