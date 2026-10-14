import { InvalidTokenException } from '../../domain/exceptions/InvalidTokenException';
import { authTokenStore } from '../../infrastructure/security/AuthTokenStore';
import { verifyJwtToken } from '../../infrastructure/security/auth';

export class LogoutUseCase {
  constructor(private readonly tokenStore = authTokenStore) {}

  public async execute(token: string): Promise<{ success: true; message: string }> {
    const normalized = token?.replace(/^Bearer\s+/i, '').trim();

    if (!normalized) {
      throw new InvalidTokenException();
    }

    const payload = verifyJwtToken(normalized);

    if (!payload) {
      throw new InvalidTokenException();
    }

    this.tokenStore.revoke(normalized);

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }
}
