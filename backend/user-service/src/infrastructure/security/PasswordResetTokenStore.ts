import crypto from 'node:crypto';
import type { Pool } from 'pg';

interface StoredResetToken {
  userId: string;
  expiresAt: number;
}

export class PasswordResetTokenStore {
  private readonly tokens = new Map<string, StoredResetToken>();
  private pool?: Pool;
  private tableReady = false;

  public attachPool(pool?: Pool): void {
    this.pool = pool;
    this.tableReady = false;
  }

  private async ensureTable(): Promise<void> {
    if (!this.pool || this.tableReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS user_password_reset_tokens (
        token_hash VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    this.tableReady = true;
  }

  public issue(userId: string, ttlMs = 15 * 60 * 1000): string {
    for (const [tokenHash, storedToken] of this.tokens) {
      if (storedToken.expiresAt <= Date.now()) this.tokens.delete(tokenHash);
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hash(token);
    const expiresAtMs = Date.now() + ttlMs;
    this.tokens.set(tokenHash, { userId, expiresAt: expiresAtMs });

    if (this.pool) {
      void this.persistToken(tokenHash, userId, new Date(expiresAtMs));
    }
    return token;
  }

  public async issueAsync(userId: string, ttlMs = 15 * 60 * 1000): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hash(token);
    const expiresAtMs = Date.now() + ttlMs;
    this.tokens.set(tokenHash, { userId, expiresAt: expiresAtMs });

    if (this.pool) {
      await this.persistToken(tokenHash, userId, new Date(expiresAtMs));
    }
    return token;
  }

  private async persistToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    if (!this.pool) return;
    try {
      await this.ensureTable();
      await this.pool.query(
        `DELETE FROM user_password_reset_tokens WHERE expires_at <= NOW() OR user_id = $1`,
        [userId],
      );
      await this.pool.query(
        `INSERT INTO user_password_reset_tokens (token_hash, user_id, expires_at, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [tokenHash, userId, expiresAt],
      );
    } catch (err: any) {
      console.warn('[PasswordResetTokenStore] Failed to persist reset token:', err?.message);
    }
  }

  public consume(token: string): string | null {
    const tokenHash = this.hash(token);
    const storedToken = this.tokens.get(tokenHash);
    this.tokens.delete(tokenHash);

    if (this.pool) {
      void this.ensureTable()
        .then(() =>
          this.pool?.query(`DELETE FROM user_password_reset_tokens WHERE token_hash = $1`, [
            tokenHash,
          ]),
        )
        .catch(() => {});
    }

    if (!storedToken || storedToken.expiresAt <= Date.now()) {
      return null;
    }

    return storedToken.userId;
  }

  public async consumeAsync(token: string): Promise<string | null> {
    const tokenHash = this.hash(token);
    const storedToken = this.tokens.get(tokenHash);
    this.tokens.delete(tokenHash);

    if (this.pool) {
      try {
        await this.ensureTable();
        const res = await this.pool.query(
          `DELETE FROM user_password_reset_tokens
           WHERE token_hash = $1 AND expires_at > NOW()
           RETURNING user_id`,
          [tokenHash],
        );
        if (res.rows.length > 0) {
          return String(res.rows[0].user_id);
        }
        return null;
      } catch (err: any) {
        console.warn('[PasswordResetTokenStore] consumeAsync DB error:', err?.message);
      }
    }

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
