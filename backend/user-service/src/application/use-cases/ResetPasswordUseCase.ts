import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { hashPassword } from '../../infrastructure/security/auth';
import { AuthTokenStore } from '../../infrastructure/security/AuthTokenStore';
import { PasswordResetTokenStore } from '../../infrastructure/security/PasswordResetTokenStore';

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenStore: PasswordResetTokenStore,
    private readonly authTokenStore: AuthTokenStore,
  ) {}

  public async execute(token: string, newPassword: string): Promise<void> {
    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      throw new Error('Password must be at least 12 characters.');
    }
    if (!token?.trim()) {
      throw new Error('A valid password reset token is required.');
    }

    const userId = this.tokenStore.consume(token.trim());
    if (!userId) {
      throw new Error('Password reset token is invalid or expired.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Password reset token is invalid or expired.');
    }

    user.setPasswordHash(hashPassword(newPassword));
    await this.userRepository.update(user);
    this.authTokenStore.revokeUserTokens(user.id);
  }
}
