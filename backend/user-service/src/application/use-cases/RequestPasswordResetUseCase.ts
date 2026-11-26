import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { NotificationClient } from '../../infrastructure/notifications/NotificationClient';
import { PasswordResetTokenStore } from '../../infrastructure/security/PasswordResetTokenStore';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenStore: PasswordResetTokenStore,
    private readonly notificationClient?: NotificationClient,
  ) {}

  public async execute(email: string): Promise<string | null> {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) return null;

    const token = await this.tokenStore.issueAsync(user.id);
    if (this.notificationClient) {
      await this.notificationClient
        .sendPasswordResetEmail(user.email, token, user.fullName)
        .catch(() => false);
    }
    return token;
  }
}
