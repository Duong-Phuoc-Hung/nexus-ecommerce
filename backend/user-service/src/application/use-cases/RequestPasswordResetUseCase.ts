import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { PasswordResetTokenStore } from '../../infrastructure/security/PasswordResetTokenStore';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenStore: PasswordResetTokenStore,
  ) {}

  public async execute(email: string): Promise<string | null> {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const user = await this.userRepository.findByEmail(normalizedEmail);
    return user ? this.tokenStore.issue(user.id) : null;
  }
}
