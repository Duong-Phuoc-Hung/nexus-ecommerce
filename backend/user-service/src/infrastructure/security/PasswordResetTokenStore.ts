import crypto from 'node:crypto';

interface StoredResetToken {
  userId: string;
  expiresAt: number;
}

export class PasswordResetTokenStore {
  private readonly tokens = new Map<string, StoredResetToken>();

  public issue(userId: string, ttlMs = 15 * 60 * 1000): string {
    for (const [tokenHash, storedToken] of this.tokens) {
      if (storedToken.expiresAt <= Date.now()) this.tokens.delete(tokenHash);
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hash(token);
    this.tokens.set(tokenHash, { userId, expiresAt: Date.now() + ttlMs });
    return token;
  }

  public consume(token: string): string | null {
    const tokenHash = this.hash(token);
    const storedToken = this.tokens.get(tokenHash);
    this.tokens.delete(tokenHash);

    if (!storedToken || storedToken.expiresAt <= Date.now()) {
      return null;
    }

    return storedToken.userId;
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const passwordResetTokenStore = new PasswordResetTokenStore();
