export class AuthTokenStore {
  private readonly revokedTokens = new Set<string>();
  private readonly tokensByUser = new Map<string, Set<string>>();

  public track(token: string, userId: string): void {
    const normalized = token.trim();
    if (!normalized) return;

    const userTokens = this.tokensByUser.get(userId) ?? new Set<string>();
    userTokens.add(normalized);
    this.tokensByUser.set(userId, userTokens);
  }

  public revoke(token: string): void {
    const normalized = token.trim();
    if (!normalized) return;
    this.revokedTokens.add(normalized);
  }

  public revokeUserTokens(userId: string): void {
    const userTokens = this.tokensByUser.get(userId);
    if (!userTokens) return;

    for (const token of userTokens) {
      this.revokedTokens.add(token);
    }
    this.tokensByUser.delete(userId);
  }

  public isRevoked(token: string): boolean {
    return this.revokedTokens.has(token.trim());
  }
}

export const authTokenStore = new AuthTokenStore();
