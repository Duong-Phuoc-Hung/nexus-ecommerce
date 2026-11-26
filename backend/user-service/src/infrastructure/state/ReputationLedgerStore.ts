import type { Pool } from 'pg';
import { generateUuidV7 } from '../security/auth';

export type ReputationTierCode =
  'NEEDS_RECOVERY' | 'AUCTION_ELIGIBLE' | 'STANDARD' | 'GOOD' | 'HIGH_TRUST';

export interface ReputationTierInfo {
  code: ReputationTierCode;
  label: string;
  minScore: number;
  maxScore: number;
  nextTierLabel?: string;
  nextTierScore?: number;
}

export type ReputationRuleCode =
  | 'OPENING_BALANCE'
  | 'ACCOUNT_VERIFIED'
  | 'AUCTION_PAID_ON_TIME'
  | 'ORDER_COMPLETED'
  | 'POSITIVE_REVIEW'
  | 'RECOVERY_GUIDE_COMPLETED'
  | 'AUCTION_PAYMENT_TIMEOUT'
  | 'DELIVERY_REFUSAL_PENALTY'
  | 'BID_COLLUSION_PENALTY'
  | 'ADMIN_MANUAL_ADJUST'
  | 'REVERSAL_COMPENSATION';

export interface ReputationLedgerEntry {
  id: string;
  userId: string;
  ruleCode: ReputationRuleCode;
  policyVersion: string;
  sourceType: 'SYSTEM' | 'AUCTION' | 'ORDER' | 'REVIEW' | 'ADMIN' | 'APPEAL';
  sourceId: string;
  requestedDelta: number;
  appliedDelta: number;
  scoreBefore: number;
  scoreAfter: number;
  reason: string;
  internalNote?: string;
  actorId: string;
  actorRole: string;
  reversalOfId?: string;
  reversed?: boolean;
  createdAt: string;
}

export interface ReputationAppeal {
  id: string;
  userId: string;
  ledgerEntryId: string;
  reason: string;
  evidenceNote?: string;
  status: 'PENDING' | 'APPROVED_REVERSED' | 'REJECTED';
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  compensationEntryId?: string;
  createdAt: string;
}

export interface ReputationMission {
  code: string;
  title: string;
  points: number;
  frequencyLabel: string;
  status: 'AVAILABLE' | 'COMPLETED' | 'LOCKED';
  progressText: string;
  actionLabel?: string;
  actionHref?: string;
  interactiveType?: 'RECOVERY_QUIZ';
}

export const INITIAL_REPUTATION_SCORE = 50;
export const MIN_BID_REPUTATION_SCORE = 50;
export const MIN_SELLER_AUCTION_REPUTATION_SCORE = 50;
export const POLICY_VERSION = '2026.11.v1';

export function clampReputationScore(score: number): number {
  if (!Number.isFinite(score)) return INITIAL_REPUTATION_SCORE;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function classifyReputationTier(score: number): ReputationTierInfo {
  const s = clampReputationScore(score);
  if (s <= 39) {
    return {
      code: 'NEEDS_RECOVERY',
      label: 'Cần khôi phục',
      minScore: 0,
      maxScore: 39,
      nextTierLabel: 'Đang phục hồi',
      nextTierScore: 40,
    };
  }
  if (s <= 49) {
    return {
      code: 'AUCTION_ELIGIBLE',
      label: 'Đang phục hồi',
      minScore: 40,
      maxScore: 49,
      nextTierLabel: 'Tiêu chuẩn',
      nextTierScore: 50,
    };
  }
  if (s <= 74) {
    return {
      code: 'STANDARD',
      label: 'Tiêu chuẩn',
      minScore: 50,
      maxScore: 74,
      nextTierLabel: 'Tốt',
      nextTierScore: 75,
    };
  }
  if (s <= 89) {
    return {
      code: 'GOOD',
      label: 'Tốt',
      minScore: 75,
      maxScore: 89,
      nextTierLabel: 'Uy tín cao',
      nextTierScore: 90,
    };
  }
  return {
    code: 'HIGH_TRUST',
    label: 'Uy tín cao',
    minScore: 90,
    maxScore: 100,
  };
}

export class ReputationLedgerStoreImpl {
  private readonly entriesByUser = new Map<string, ReputationLedgerEntry[]>();
  private readonly idempotencyKeys = new Set<string>();
  private readonly completedTransactionsByUser = new Map<string, number>();
  private readonly appeals = new Map<string, ReputationAppeal>();
  private readonly versions = new Map<string, number>();
  private pool?: Pool;

  public attachPool(pool?: Pool): void {
    this.pool = pool;
  }

  public hasPersistentPool(): boolean {
    return Boolean(this.pool);
  }

  private mapLedgerRow(r: any): ReputationLedgerEntry {
    return {
      id: String(r.id),
      userId: String(r.user_id),
      ruleCode: r.rule_code as ReputationRuleCode,
      policyVersion: String(r.policy_version || POLICY_VERSION),
      sourceType: r.source_type as ReputationLedgerEntry['sourceType'],
      sourceId: String(r.source_id),
      requestedDelta: Number(r.requested_delta) || 0,
      appliedDelta: Number(r.applied_delta) || 0,
      scoreBefore: Number(r.score_before) || 0,
      scoreAfter: Number(r.score_after) || 0,
      reason: String(r.reason || ''),
      internalNote: r.internal_note ? String(r.internal_note) : undefined,
      actorId: String(r.actor_id || 'system'),
      actorRole: String(r.actor_role || 'SYSTEM'),
      reversalOfId: r.reversal_of_id ? String(r.reversal_of_id) : undefined,
      reversed: Boolean(r.reversed),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  }

  private mapAppealRow(r: any): ReputationAppeal {
    return {
      id: String(r.id),
      userId: String(r.user_id),
      ledgerEntryId: String(r.ledger_entry_id),
      reason: String(r.reason || ''),
      evidenceNote: r.evidence_note ? String(r.evidence_note) : undefined,
      status: r.status as ReputationAppeal['status'],
      resolutionNote: r.resolution_note ? String(r.resolution_note) : undefined,
      resolvedBy: r.resolved_by ? String(r.resolved_by) : undefined,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : undefined,
      compensationEntryId: r.compensation_entry_id ? String(r.compensation_entry_id) : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  }

  private async persistEntryToDb(
    entry: ReputationLedgerEntry,
    idempotencyKey?: string,
  ): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO user_reputation_ledger (
           id, user_id, rule_code, policy_version, source_type, source_id, idempotency_key,
           requested_delta, applied_delta, score_before, score_after, reason, internal_note,
           actor_id, actor_role, reversal_of_id, reversed, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          entry.id,
          entry.userId,
          entry.ruleCode,
          entry.policyVersion,
          entry.sourceType,
          entry.sourceId,
          idempotencyKey ?? null,
          entry.requestedDelta,
          entry.appliedDelta,
          entry.scoreBefore,
          entry.scoreAfter,
          entry.reason,
          entry.internalNote ?? null,
          entry.actorId,
          entry.actorRole,
          entry.reversalOfId ?? null,
          Boolean(entry.reversed),
          entry.createdAt,
        ],
      );
      if (entry.ruleCode === 'ORDER_COMPLETED') {
        await this.pool.query(
          `UPDATE user_reputations
           SET total_orders = COALESCE(total_orders, 0) + 1, updated_at = NOW()
           WHERE user_id = $1`,
          [entry.userId],
        );
      }
    } catch (err: any) {
      console.warn('[ReputationLedgerStore] Persist ledger entry warning:', err?.message);
    }
  }

  public async syncUserFromDb(userId: string, currentScore: number): Promise<void> {
    if (!this.pool) {
      this.ensureOpeningBalance(userId, currentScore);
      return;
    }
    try {
      const [ledgerRes, appealsRes, repRes] = await Promise.all([
        this.pool.query(
          `SELECT * FROM user_reputation_ledger
           WHERE user_id = $1
           ORDER BY created_at ASC`,
          [userId],
        ),
        this.pool.query(
          `SELECT * FROM user_reputation_appeals
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId],
        ),
        this.pool.query(
          `SELECT COALESCE(total_orders, 0)::int AS total_orders
           FROM user_reputations
           WHERE user_id = $1
           LIMIT 1`,
          [userId],
        ),
      ]);

      const entries = ledgerRes.rows.map((r) => this.mapLedgerRow(r));
      if (entries.length > 0) {
        this.entriesByUser.set(userId, entries);
        for (const r of ledgerRes.rows) {
          if (r.idempotency_key) this.idempotencyKeys.add(String(r.idempotency_key));
          else
            this.idempotencyKeys.add(
              this.makeKey(String(r.user_id), String(r.rule_code), String(r.source_id)),
            );
        }
        this.versions.set(userId, entries.length);
      } else {
        this.ensureOpeningBalance(userId, currentScore);
      }

      const ledgerCompleted = entries.filter(
        (e) => e.ruleCode === 'ORDER_COMPLETED' && !e.reversed,
      ).length;
      const dbOrders = Number(repRes.rows[0]?.total_orders || 0);
      this.completedTransactionsByUser.set(userId, Math.max(ledgerCompleted, dbOrders));

      for (const r of appealsRes.rows) {
        const appeal = this.mapAppealRow(r);
        this.appeals.set(appeal.id, appeal);
      }
    } catch (err: any) {
      console.warn('[ReputationLedgerStore] syncUserFromDb warning:', err?.message);
      this.ensureOpeningBalance(userId, currentScore);
    }
  }

  public async loadAppealsFromDb(userId?: string): Promise<ReputationAppeal[]> {
    if (!this.pool) return this.listAppeals(userId);
    try {
      const res = userId
        ? await this.pool.query(
            'SELECT * FROM user_reputation_appeals WHERE user_id = $1 ORDER BY created_at DESC',
            [userId],
          )
        : await this.pool.query(
            'SELECT * FROM user_reputation_appeals ORDER BY created_at DESC LIMIT 200',
          );
      const list = res.rows.map((r) => this.mapAppealRow(r));
      for (const a of list) this.appeals.set(a.id, a);
      return list;
    } catch {
      return this.listAppeals(userId);
    }
  }

  public async findAppealByIdAsync(id: string): Promise<ReputationAppeal | undefined> {
    const cached = this.appeals.get(id);
    if (cached || !this.pool) return cached;
    try {
      const res = await this.pool.query(
        'SELECT * FROM user_reputation_appeals WHERE id = $1 LIMIT 1',
        [id],
      );
      if (res.rows.length === 0) return undefined;
      const appeal = this.mapAppealRow(res.rows[0]);
      this.appeals.set(appeal.id, appeal);
      return appeal;
    } catch {
      return undefined;
    }
  }

  public async persistAppeal(appeal: ReputationAppeal): Promise<void> {
    this.appeals.set(appeal.id, appeal);
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO user_reputation_appeals (
         id, user_id, ledger_entry_id, reason, evidence_note, status,
         resolution_note, resolved_by, resolved_at, compensation_entry_id, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         resolution_note = EXCLUDED.resolution_note,
         resolved_by = EXCLUDED.resolved_by,
         resolved_at = EXCLUDED.resolved_at,
         compensation_entry_id = EXCLUDED.compensation_entry_id`,
      [
        appeal.id,
        appeal.userId,
        appeal.ledgerEntryId,
        appeal.reason,
        appeal.evidenceNote ?? null,
        appeal.status,
        appeal.resolutionNote ?? null,
        appeal.resolvedBy ?? null,
        appeal.resolvedAt ?? null,
        appeal.compensationEntryId ?? null,
        appeal.createdAt,
      ],
    );
  }

  public async markEntryReversedInDb(entryId: string): Promise<void> {
    if (!this.pool) return;
    await this.pool.query('UPDATE user_reputation_ledger SET reversed = TRUE WHERE id = $1', [
      entryId,
    ]);
  }

  private makeKey(userId: string, ruleCode: string, sourceId: string): string {
    return `${userId}::${ruleCode}::${sourceId}`;
  }

  public getVersion(userId: string): number {
    return this.versions.get(userId) ?? 1;
  }

  public getCompletedTransactions(userId: string): number {
    return this.completedTransactionsByUser.get(userId) ?? 0;
  }

  public getLedger(userId: string): ReputationLedgerEntry[] {
    return [...(this.entriesByUser.get(userId) || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public ensureOpeningBalance(userId: string, currentScore: number): void {
    const existing = this.entriesByUser.get(userId);
    if (existing && existing.length > 0) return;

    const score = clampReputationScore(currentScore);
    const entry: ReputationLedgerEntry = {
      id: generateUuidV7(),
      userId,
      ruleCode: 'OPENING_BALANCE',
      policyVersion: POLICY_VERSION,
      sourceType: 'SYSTEM',
      sourceId: `opening:${userId}`,
      requestedDelta: 0,
      appliedDelta: 0,
      scoreBefore: score,
      scoreAfter: score,
      reason: 'Số dư đầu kỳ tài khoản',
      actorId: 'system',
      actorRole: 'SYSTEM',
      createdAt: new Date().toISOString(),
    };
    this.entriesByUser.set(userId, [entry]);
    this.versions.set(userId, 1);
    void this.persistEntryToDb(entry, this.makeKey(userId, 'OPENING_BALANCE', entry.sourceId));
  }

  public recordEntry(params: {
    userId: string;
    currentScore: number;
    ruleCode: ReputationRuleCode;
    sourceType: ReputationLedgerEntry['sourceType'];
    sourceId: string;
    requestedDelta: number;
    reason: string;
    internalNote?: string;
    actorId: string;
    actorRole: string;
    reversalOfId?: string;
    allowDuplicateSource?: boolean;
  }): { entry: ReputationLedgerEntry; newScore: number; duplicate: boolean } {
    this.ensureOpeningBalance(params.userId, params.currentScore);

    const idemKey = this.makeKey(params.userId, params.ruleCode, params.sourceId);
    if (!params.allowDuplicateSource && this.idempotencyKeys.has(idemKey)) {
      const existing = (this.entriesByUser.get(params.userId) || []).find(
        (e) => e.ruleCode === params.ruleCode && e.sourceId === params.sourceId,
      );
      if (existing) {
        return { entry: existing, newScore: params.currentScore, duplicate: true };
      }
    }

    // Kiểm tra giới hạn +3/tháng dương lịch (UTC+7) cho đánh giá tích cực (Mục 14)
    if (params.ruleCode === 'POSITIVE_REVIEW') {
      const nowVn = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const monthPrefix = `${nowVn.getUTCFullYear()}-${String(nowVn.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthlyReviewPoints = (this.entriesByUser.get(params.userId) || [])
        .filter((e) => e.ruleCode === 'POSITIVE_REVIEW' && !e.reversed)
        .filter((e) => {
          const dVn = new Date(new Date(e.createdAt).getTime() + 7 * 60 * 60 * 1000);
          const p = `${dVn.getUTCFullYear()}-${String(dVn.getUTCMonth() + 1).padStart(2, '0')}`;
          return p === monthPrefix;
        })
        .reduce((acc, e) => acc + Math.max(0, e.appliedDelta), 0);
      if (monthlyReviewPoints >= 3) {
        throw new Error('Bạn đã đạt tối đa +3 điểm từ đánh giá tích cực trong tháng này.');
      }
    }

    const scoreBefore = clampReputationScore(params.currentScore);
    const scoreAfter = clampReputationScore(scoreBefore + params.requestedDelta);
    const appliedDelta = scoreAfter - scoreBefore;

    const entry: ReputationLedgerEntry = {
      id: generateUuidV7(),
      userId: params.userId,
      ruleCode: params.ruleCode,
      policyVersion: POLICY_VERSION,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      requestedDelta: params.requestedDelta,
      appliedDelta,
      scoreBefore,
      scoreAfter,
      reason: params.reason.trim(),
      internalNote: params.internalNote?.trim() || undefined,
      actorId: params.actorId,
      actorRole: params.actorRole,
      reversalOfId: params.reversalOfId,
      createdAt: new Date().toISOString(),
    };

    const list = this.entriesByUser.get(params.userId) || [];
    list.push(entry);
    this.entriesByUser.set(params.userId, list);
    if (!params.allowDuplicateSource) {
      this.idempotencyKeys.add(idemKey);
    }
    this.versions.set(params.userId, (this.versions.get(params.userId) ?? 1) + 1);

    if (params.ruleCode === 'ORDER_COMPLETED') {
      this.completedTransactionsByUser.set(
        params.userId,
        (this.completedTransactionsByUser.get(params.userId) ?? 0) + 1,
      );
    }

    void this.persistEntryToDb(entry, params.allowDuplicateSource ? undefined : idemKey);
    return { entry, newScore: scoreAfter, duplicate: false };
  }

  /**
   * SEC-05: Ghi bút toán và cập nhật điểm uy tín trong cùng 1 PostgreSQL transaction
   * có khóa dòng (SELECT ... FOR UPDATE) để:
   * 1. Await lưu DB thành công trước khi trả HTTP 200.
   * 2. Chống lost-update khi 2 sourceId khác nhau chạy đồng thời.
   * 3. Chống cộng điểm 2 lần khi cùng sourceId chạy đồng thời đa replica.
   * 4. Nếu DB lỗi -> ROLLBACK, không cập nhật RAM, không lệch score vs ledger.
   */
  public async recordEntryAsync(params: {
    userId: string;
    currentScore: number;
    ruleCode: ReputationRuleCode;
    sourceType: ReputationLedgerEntry['sourceType'];
    sourceId: string;
    requestedDelta: number;
    reason: string;
    internalNote?: string;
    actorId: string;
    actorRole: string;
    reversalOfId?: string;
    allowDuplicateSource?: boolean;
  }): Promise<{ entry: ReputationLedgerEntry; newScore: number; duplicate: boolean }> {
    if (!this.pool) {
      return this.recordEntry(params);
    }

    const idemKey = this.makeKey(params.userId, params.ruleCode, params.sourceId);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Đảm bảo dòng user_reputations tồn tại rồi khóa FOR UPDATE để tuần tự hóa các cập nhật đồng thời
      const initialTier = classifyReputationTier(params.currentScore);
      await client.query(
        `INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [params.userId, initialTier.code, clampReputationScore(params.currentScore)],
      );

      const repLock = await client.query(
        `SELECT score, COALESCE(total_orders, 0)::int AS total_orders
         FROM user_reputations
         WHERE user_id = $1
         FOR UPDATE`,
        [params.userId],
      );
      const lockedScore =
        repLock.rows.length > 0
          ? clampReputationScore(Number(repLock.rows[0].score))
          : clampReputationScore(params.currentScore);

      if (!params.allowDuplicateSource) {
        const dupRes = await client.query(
          `SELECT * FROM user_reputation_ledger
           WHERE user_id = $1 AND rule_code = $2 AND source_id = $3
           LIMIT 1`,
          [params.userId, params.ruleCode, params.sourceId],
        );
        if (dupRes.rows.length > 0) {
          await client.query('COMMIT');
          const existing = this.mapLedgerRow(dupRes.rows[0]);
          this.idempotencyKeys.add(idemKey);
          return { entry: existing, newScore: lockedScore, duplicate: true };
        }
      }

      if (params.ruleCode === 'POSITIVE_REVIEW') {
        const nowVn = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const monthStartUtc = new Date(
          Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), 1) - 7 * 60 * 60 * 1000,
        );
        const monthRes = await client.query(
          `SELECT COALESCE(SUM(GREATEST(0, applied_delta)), 0)::int AS pts
           FROM user_reputation_ledger
           WHERE user_id = $1
             AND rule_code = 'POSITIVE_REVIEW'
             AND reversed = FALSE
             AND created_at >= $2`,
          [params.userId, monthStartUtc.toISOString()],
        );
        if (Number(monthRes.rows[0]?.pts || 0) >= 3) {
          throw new Error('Bạn đã đạt tối đa +3 điểm từ đánh giá tích cực trong tháng này.');
        }
      }

      const scoreBefore = lockedScore;
      const scoreAfter = clampReputationScore(scoreBefore + params.requestedDelta);
      const appliedDelta = scoreAfter - scoreBefore;
      const nextTier = classifyReputationTier(scoreAfter);

      const entry: ReputationLedgerEntry = {
        id: generateUuidV7(),
        userId: params.userId,
        ruleCode: params.ruleCode,
        policyVersion: POLICY_VERSION,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        requestedDelta: params.requestedDelta,
        appliedDelta,
        scoreBefore,
        scoreAfter,
        reason: params.reason.trim(),
        internalNote: params.internalNote?.trim() || undefined,
        actorId: params.actorId,
        actorRole: params.actorRole,
        reversalOfId: params.reversalOfId,
        createdAt: new Date().toISOString(),
      };

      const insertRes = await client.query(
        `INSERT INTO user_reputation_ledger (
           id, user_id, rule_code, policy_version, source_type, source_id, idempotency_key,
           requested_delta, applied_delta, score_before, score_after, reason, internal_note,
           actor_id, actor_role, reversal_of_id, reversed, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          entry.id,
          entry.userId,
          entry.ruleCode,
          entry.policyVersion,
          entry.sourceType,
          entry.sourceId,
          params.allowDuplicateSource ? null : idemKey,
          entry.requestedDelta,
          entry.appliedDelta,
          entry.scoreBefore,
          entry.scoreAfter,
          entry.reason,
          entry.internalNote ?? null,
          entry.actorId,
          entry.actorRole,
          entry.reversalOfId ?? null,
          Boolean(entry.reversed),
          entry.createdAt,
        ],
      );

      if (insertRes.rowCount === 0 && !params.allowDuplicateSource) {
        const dupRes = await client.query(
          `SELECT * FROM user_reputation_ledger
           WHERE user_id = $1 AND rule_code = $2 AND source_id = $3
           LIMIT 1`,
          [params.userId, params.ruleCode, params.sourceId],
        );
        await client.query('COMMIT');
        const existing = dupRes.rows.length > 0 ? this.mapLedgerRow(dupRes.rows[0]) : entry;
        this.idempotencyKeys.add(idemKey);
        return { entry: existing, newScore: lockedScore, duplicate: true };
      }

      const orderInc = params.ruleCode === 'ORDER_COMPLETED' ? 1 : 0;
      const penaltyInc = appliedDelta < 0 ? 1 : 0;
      await client.query(
        `UPDATE user_reputations
         SET score = $2,
             trust_level = $3,
             total_orders = COALESCE(total_orders, 0) + $4,
             total_penalties = COALESCE(total_penalties, 0) + $5,
             updated_at = NOW()
         WHERE user_id = $1`,
        [params.userId, scoreAfter, nextTier.code, orderInc, penaltyInc],
      );

      await client.query('COMMIT');

      // Chỉ cập nhật RAM sau khi COMMIT thành công
      this.ensureOpeningBalance(params.userId, scoreBefore);
      const list = this.entriesByUser.get(params.userId) || [];
      list.push(entry);
      this.entriesByUser.set(params.userId, list);
      if (!params.allowDuplicateSource) {
        this.idempotencyKeys.add(idemKey);
      }
      this.versions.set(params.userId, (this.versions.get(params.userId) ?? 1) + 1);
      if (orderInc > 0) {
        this.completedTransactionsByUser.set(
          params.userId,
          (this.completedTransactionsByUser.get(params.userId) ?? 0) + 1,
        );
      }

      return { entry, newScore: scoreAfter, duplicate: false };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Đảo một bút toán sai và tính lại toàn bộ chuỗi [0, 100] theo đúng thứ tự thời gian (U05)
   */
  public reverseEntryAndRecalculate(params: {
    userId: string;
    currentScore: number;
    targetEntryId: string;
    reason: string;
    actorId: string;
    actorRole: string;
  }): { entry: ReputationLedgerEntry; newScore: number } {
    const list = this.entriesByUser.get(params.userId) || [];
    const target = list.find((e) => e.id === params.targetEntryId);
    if (!target) {
      throw new Error(`Không tìm thấy bút toán "${params.targetEntryId}".`);
    }
    if (target.reversed) {
      throw new Error('Bút toán này đã được đảo trước đó.');
    }

    target.reversed = true;
    void this.markEntryReversedInDb(target.id);

    // Tính lại chuỗi điểm từ bút toán đầu kỳ (bỏ qua các dòng đã reversed)
    const ordered = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const opening = ordered.find((e) => e.ruleCode === 'OPENING_BALANCE');
    let recomputed = opening ? opening.scoreBefore : INITIAL_REPUTATION_SCORE;
    for (const item of ordered) {
      if (item.ruleCode === 'OPENING_BALANCE' || item.reversed) continue;
      recomputed = clampReputationScore(recomputed + item.requestedDelta);
    }

    const compensationDelta = recomputed - clampReputationScore(params.currentScore);
    const { entry, newScore } = this.recordEntry({
      userId: params.userId,
      currentScore: params.currentScore,
      ruleCode: 'REVERSAL_COMPENSATION',
      sourceType: 'APPEAL',
      sourceId: `reverse:${target.id}`,
      requestedDelta: compensationDelta,
      reason: `Đảo bút toán (${target.reason}): ${params.reason}`,
      actorId: params.actorId,
      actorRole: params.actorRole,
      reversalOfId: target.id,
      allowDuplicateSource: true,
    });

    return { entry, newScore };
  }

  public buildMissions(userId: string, score: number, isVerified = true): ReputationMission[] {
    const ledger = this.getLedger(userId);
    const hasCompletedRecovery = ledger.some(
      (e) => e.ruleCode === 'RECOVERY_GUIDE_COMPLETED' && !e.reversed,
    );
    const hasVerifiedBonus = ledger.some((e) => e.ruleCode === 'ACCOUNT_VERIFIED' && !e.reversed);
    const hasPenalty = ledger.some((e) => e.appliedDelta < 0 && !e.reversed);
    const completedOrders = this.getCompletedTransactions(userId);

    const nowVn = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const monthPrefix = `${nowVn.getUTCFullYear()}-${String(nowVn.getUTCMonth() + 1).padStart(2, '0')}`;
    const reviewPtsThisMonth = ledger
      .filter((e) => e.ruleCode === 'POSITIVE_REVIEW' && !e.reversed)
      .filter((e) => {
        const dVn = new Date(new Date(e.createdAt).getTime() + 7 * 60 * 60 * 1000);
        return (
          `${dVn.getUTCFullYear()}-${String(dVn.getUTCMonth() + 1).padStart(2, '0')}` ===
          monthPrefix
        );
      })
      .reduce((acc, e) => acc + Math.max(0, e.appliedDelta), 0);

    const missions: ReputationMission[] = [];

    // Nếu dưới 40 điểm: ưu tiên nhiệm vụ phục hồi và mua đơn thường (không gợi ý thắng đấu giá khi đang bị chặn)
    if (score < MIN_BID_REPUTATION_SCORE) {
      missions.push({
        code: 'RECOVERY_GUIDE_COMPLETED',
        title: 'Hoàn thành hướng dẫn phục hồi quy tắc đấu giá',
        points: 3,
        frequencyLabel: 'Một lần suốt tài khoản khi dưới 40 điểm',
        status: hasCompletedRecovery ? 'COMPLETED' : 'AVAILABLE',
        progressText: hasCompletedRecovery
          ? 'Đã cộng +3 điểm'
          : hasPenalty
            ? 'Sẵn sàng thực hiện ngay'
            : 'Sẵn sàng làm bài kiểm tra nhanh 3 câu hỏi',
        actionLabel: hasCompletedRecovery ? undefined : 'Làm bài phục hồi',
        interactiveType: hasCompletedRecovery ? undefined : 'RECOVERY_QUIZ',
      });
    }

    missions.push({
      code: 'ORDER_COMPLETED',
      title: 'Hoàn tất giao dịch mua hàng',
      points: 3,
      frequencyLabel: 'Mỗi đơn hàng giao thành công (áp dụng cả đơn thường)',
      status: 'AVAILABLE',
      progressText:
        completedOrders > 0
          ? `Đã hoàn tất ${completedOrders} giao dịch`
          : 'Mở khóa bằng cách hoàn tất đơn hàng đầu tiên',
      actionLabel: 'Mua sắm ngay',
      actionHref: '/products',
    });

    if (score >= MIN_BID_REPUTATION_SCORE) {
      missions.push({
        code: 'AUCTION_PAID_ON_TIME',
        title: 'Thanh toán đơn trúng đấu giá đúng hạn (24 giờ)',
        points: 2,
        frequencyLabel: 'Một lần cho mỗi đơn trúng đấu giá',
        status: 'AVAILABLE',
        progressText: 'Cộng tự động khi xác nhận thanh toán đúng hạn',
        actionLabel: 'Xem phiên của tôi',
        actionHref: '/account/auctions',
      });
    }

    missions.push({
      code: 'POSITIVE_REVIEW',
      title: 'Nhận đánh giá tích cực từ đối tác (4–5 sao)',
      points: 1,
      frequencyLabel: 'Tối đa +3 điểm / tháng dương lịch',
      status: reviewPtsThisMonth >= 3 ? 'COMPLETED' : 'AVAILABLE',
      progressText: `Tháng này: ${reviewPtsThisMonth}/3 điểm`,
      actionLabel: 'Đơn hàng của tôi',
      actionHref: '/account/orders',
    });

    missions.push({
      code: 'ACCOUNT_VERIFIED',
      title: 'Xác minh tài khoản chính chủ',
      points: 2,
      frequencyLabel: 'Một lần suốt tài khoản',
      status: hasVerifiedBonus || isVerified ? 'COMPLETED' : 'AVAILABLE',
      progressText: hasVerifiedBonus ? 'Đã cộng +2 điểm' : 'Tài khoản đã xác minh OTP',
    });

    return missions;
  }

  public createAppeal(params: {
    userId: string;
    ledgerEntryId: string;
    reason: string;
    evidenceNote?: string;
  }): ReputationAppeal {
    const ledger = this.entriesByUser.get(params.userId) || [];
    const entry = ledger.find((e) => e.id === params.ledgerEntryId);
    if (!entry) {
      throw new Error('Không tìm thấy dòng lịch sử điểm tương ứng của bạn.');
    }
    const appeal: ReputationAppeal = {
      id: generateUuidV7(),
      userId: params.userId,
      ledgerEntryId: params.ledgerEntryId,
      reason: params.reason.trim(),
      evidenceNote: params.evidenceNote?.trim() || undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.appeals.set(appeal.id, appeal);
    void this.persistAppeal(appeal);
    return appeal;
  }

  public listAppeals(userId?: string): ReputationAppeal[] {
    const all = Array.from(this.appeals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return userId ? all.filter((a) => a.userId === userId) : all;
  }

  public getAppealById(id: string): ReputationAppeal | undefined {
    return this.appeals.get(id);
  }
}

export const reputationLedgerStore = new ReputationLedgerStoreImpl();
