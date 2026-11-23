import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundException } from '../../domain/exceptions/UserNotFoundException';
import { UserProfileDto } from '../dtos/UserProfileDto';

/**
 * UseCase: GetUserProfileUseCase
 * Ứng dụng nghiệp vụ truy xuất thông tin hồ sơ người dùng theo chuẩn SRS A01 & A04.
 * Phụ thuộc vào interface IUserRepository (Dependency Inversion Principle).
 */
export class GetUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(identifier: string): Promise<UserProfileDto> {
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
      identifyNumber: user.identifyNumber || undefined,
      gender: user.gender || undefined,
      dateOfBirth: user.dateOfBirth
        ? user.dateOfBirth instanceof Date
          ? user.dateOfBirth.toISOString().split('T')[0]
          : String(user.dateOfBirth).split('T')[0]
        : undefined,
      address: user.address || undefined,
      reputationHistory: user.reputationHistory.map((h) => ({
        points: h.points,
        reason: h.reason,
        adjustedBy: h.adjustedBy,
        createdAt: h.createdAt instanceof Date ? h.createdAt.toISOString() : String(h.createdAt),
      })),
      restrictions: user.restrictions.map((r) => ({
        restriction: r.restriction,
        durationDays: r.durationDays,
        reason: r.reason,
        appliedBy: r.appliedBy,
        expiresAt: r.expiresAt instanceof Date ? r.expiresAt.toISOString() : String(r.expiresAt),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      })),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
