import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { JwtPayload } from './auth';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthTokenStore {
  private readonly revokedTokens = new Set<string>();
  private readonly tokensByUser = new Map<string, Set<string>>();
  private readonly userCutoffMs = new Map<string, number>();
  private pool?: Pool;

  constructor(pool?: Pool) {
    this.pool = pool;
  }

  public attachPool(pool?: Pool): void {
    this.pool = pool;
  }

  public hasPersistentPool(): boolean {
    return Boolean(this.pool);
  }

  public track(token: string, userId: string): void {
    const normalized = token.trim();
    if (!normalized) return;

    const userTokens = this.tokensByUser.get(userId) ?? new Set<string>();
    userTokens.add(normalized);
    this.tokensByUser.set(userId, userTokens);
  }

  public revoke(token: string, userId?: string, expiresAtMs?: number): Promise<void> {
    const normalized = token.trim();
    if (!normalized) return Promise.resolve();
    this.revokedTokens.add(normalized);

    if (!this.pool) return Promise.resolve();
    const tokenHash = hashToken(normalized);
    const expiresAt =
      typeof expiresAtMs === 'number' && Number.isFinite(expiresAtMs)
        ? new Date(expiresAtMs)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

    return this.pool
      .query(
        `INSERT INTO user_revoked_tokens (token_hash, user_id, revoked_at, expires_at)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (token_hash) DO NOTHING`,
        [tokenHash, userId ?? null, expiresAt],
      )
      .then(() => undefined)
      .catch((err) => {
        console.warn('[AuthTokenStore] Failed to persist revoked token:', err?.message);
      });
  }

  public revokeUserTokens(userId: string): Promise<void> {
    const userTokens = this.tokensByUser.get(userId);
    if (userTokens) {
      for (const token of userTokens) {
        this.revokedTokens.add(token);
      }
      this.tokensByUser.delete(userId);
    }

    const cutoffMs = Date.now();
    this.userCutoffMs.set(userId, cutoffMs);

    if (!this.pool) return Promise.resolve();
    return this.pool
      .query(
        `INSERT INTO user_session_cutoffs (user_id, revoked_before_ms, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET revoked_before_ms = GREATEST(user_session_cutoffs.revoked_before_ms, EXCLUDED.revoked_before_ms),
             updated_at = NOW()`,
        [userId, cutoffMs],
      )
      .then(() => undefined)
      .catch((err) => {
        console.warn('[AuthTokenStore] Failed to persist session cutoff:', err?.message);
      });
  }

  public isRevoked(token: string, payload?: Pick<JwtPayload, 'sub' | 'iat' | 'iatMs'>): boolean {
    const normalized = token.trim();
    if (this.revokedTokens.has(normalized)) return true;

    if (payload?.sub) {
      const localCutoff = this.userCutoffMs.get(payload.sub);
      if (localCutoff !== undefined) {
        const issuedMs =
          typeof payload.iatMs === 'number' ? payload.iatMs : (payload.iat || 0) * 1000;
        if (issuedMs < localCutoff) return true;
      }
    }
    return false;
  }

  public async isRevokedAsync(
    token: string,
    payload?: Pick<JwtPayload, 'sub' | 'iat' | 'iatMs'>,
  ): Promise<boolean> {
    if (this.isRevoked(token, payload)) return true;
    if (!this.pool) return false;

    const normalized = token.trim();
    const tokenHash = hashToken(normalized);

    try {
      const revokedRes = await this.pool.query(
        'SELECT 1 FROM user_revoked_tokens WHERE token_hash = $1 LIMIT 1',
        [tokenHash],
      );
      if (revokedRes.rows.length > 0) {
        this.revokedTokens.add(normalized);
        return true;
      }

      if (payload?.sub) {
        const cutoffRes = await this.pool.query(
          'SELECT revoked_before_ms FROM user_session_cutoffs WHERE user_id = $1 LIMIT 1',
          [payload.sub],
        );
        if (cutoffRes.rows.length > 0) {
          const cutoffMs = Number(cutoffRes.rows[0].revoked_before_ms);
          if (Number.isFinite(cutoffMs)) {
            this.userCutoffMs.set(payload.sub, cutoffMs);
            const issuedMs =
              typeof payload.iatMs === 'number' ? payload.iatMs : (payload.iat || 0) * 1000;
            if (issuedMs < cutoffMs) return true;
          }
        }
      }
    } catch (err: any) {
      console.warn('[AuthTokenStore] Persistent revocation lookup warning:', err?.message);
    }

    return false;
  }
}

export const authTokenStore = new AuthTokenStore();
