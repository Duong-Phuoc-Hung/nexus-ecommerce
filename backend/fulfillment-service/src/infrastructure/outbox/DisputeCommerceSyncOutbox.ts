import crypto from 'node:crypto';
import { PrismaClientWrapper } from '../database/PrismaClient';

export type DisputeOutboxStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'EXHAUSTED';

export interface DisputeSyncOutboxRecord {
  id: string;
  caseId: string;
  orderId: string;
  decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
  refundAmount?: number;
  note: string;
  arbitratorId: string;
  idempotencyKey: string;
  status: DisputeOutboxStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | null;
  nextRetryAt: string;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class DisputeCommerceSyncOutbox {
  private readonly memory = new Map<string, DisputeSyncOutboxRecord>();
  private readonly useInMemory: boolean;

  constructor(options?: { useInMemory?: boolean }) {
    this.useInMemory =
      options?.useInMemory ??
      (process.env.USE_IN_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test');
  }

  private get prisma(): any {
    return PrismaClientWrapper.getInstance();
  }

  public async enqueue(input: {
    caseId: string;
    orderId: string;
    decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
    refundAmount?: number;
    note: string;
    arbitratorId: string;
    idempotencyKey: string;
  }): Promise<DisputeSyncOutboxRecord> {
    const now = new Date().toISOString();
    if (this.useInMemory) {
      const existing = this.memory.get(input.idempotencyKey);
      if (existing) return existing;
      const rec: DisputeSyncOutboxRecord = {
        id: `outbox_${crypto.randomUUID().slice(0, 12)}`,
        ...input,
        status: 'PENDING',
        attemptCount: 0,
        maxAttempts: 10,
        lastError: null,
        nextRetryAt: now,
        syncedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.memory.set(input.idempotencyKey, rec);
      return rec;
    }

    const id = `outbox_${crypto.randomUUID().slice(0, 12)}`;
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO fulfillment_dispute_sync_outbox (
         id, case_id, order_id, decision, refund_amount, note, arbitrator_id,
         idempotency_key, status, attempt_count, max_attempts, next_retry_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',0,10,NOW())
       ON CONFLICT (idempotency_key) DO NOTHING`,
      id,
      input.caseId,
      input.orderId,
      input.decision,
      input.refundAmount ?? null,
      input.note,
      input.arbitratorId,
      input.idempotencyKey,
    );

    const found = await this.findByIdempotencyKey(input.idempotencyKey);
    return (
      found ?? {
        id,
        ...input,
        status: 'PENDING',
        attemptCount: 0,
        maxAttempts: 10,
        lastError: null,
        nextRetryAt: now,
        syncedAt: null,
        createdAt: now,
        updatedAt: now,
      }
    );
  }

  public async markSynced(idempotencyKey: string): Promise<DisputeSyncOutboxRecord | null> {
    const now = new Date().toISOString();
    if (this.useInMemory) {
      const rec = this.memory.get(idempotencyKey);
      if (!rec) return null;
      rec.status = 'SYNCED';
      rec.attemptCount += 1;
      rec.lastError = null;
      rec.syncedAt = now;
      rec.updatedAt = now;
      return { ...rec };
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE fulfillment_dispute_sync_outbox
       SET status = 'SYNCED',
           attempt_count = attempt_count + 1,
           last_error = NULL,
           synced_at = NOW(),
           updated_at = NOW()
       WHERE idempotency_key = $1`,
      idempotencyKey,
    );
    return this.findByIdempotencyKey(idempotencyKey);
  }

  public async markFailed(
    idempotencyKey: string,
    errorMessage: string,
  ): Promise<DisputeSyncOutboxRecord | null> {
    const nowMs = Date.now();
    if (this.useInMemory) {
      const rec = this.memory.get(idempotencyKey);
      if (!rec) return null;
      rec.attemptCount += 1;
      rec.lastError = errorMessage;
      rec.status = rec.attemptCount >= rec.maxAttempts ? 'EXHAUSTED' : 'FAILED';
      const delaySec = Math.min(300, 15 * Math.pow(2, Math.max(0, rec.attemptCount - 1)));
      rec.nextRetryAt = new Date(nowMs + delaySec * 1000).toISOString();
      rec.updatedAt = new Date(nowMs).toISOString();
      return { ...rec };
    }

    const current = await this.findByIdempotencyKey(idempotencyKey);
    const nextAttempts = (current?.attemptCount ?? 0) + 1;
    const maxAttempts = current?.maxAttempts ?? 10;
    const nextStatus: DisputeOutboxStatus = nextAttempts >= maxAttempts ? 'EXHAUSTED' : 'FAILED';
    const delaySec = Math.min(300, 15 * Math.pow(2, Math.max(0, nextAttempts - 1)));
    const nextRetry = new Date(nowMs + delaySec * 1000);

    await this.prisma.$executeRawUnsafe(
      `UPDATE fulfillment_dispute_sync_outbox
       SET status = $2,
           attempt_count = $3,
           last_error = $4,
           next_retry_at = $5,
           updated_at = NOW()
       WHERE idempotency_key = $1`,
      idempotencyKey,
      nextStatus,
      nextAttempts,
      errorMessage,
      nextRetry,
    );
    return this.findByIdempotencyKey(idempotencyKey);
  }

  public async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<DisputeSyncOutboxRecord | null> {
    if (this.useInMemory) {
      const rec = this.memory.get(idempotencyKey);
      return rec ? { ...rec } : null;
    }
    const rows = (await this.prisma.$queryRawUnsafe(
      'SELECT * FROM fulfillment_dispute_sync_outbox WHERE idempotency_key = $1 LIMIT 1',
      idempotencyKey,
    )) as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  public async findLatestByCaseId(caseId: string): Promise<DisputeSyncOutboxRecord | null> {
    if (this.useInMemory) {
      const list = Array.from(this.memory.values())
        .filter((r) => r.caseId === caseId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return list[0] ? { ...list[0] } : null;
    }
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT * FROM fulfillment_dispute_sync_outbox
       WHERE case_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      caseId,
    )) as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  public async listDueRetries(limit = 20): Promise<DisputeSyncOutboxRecord[]> {
    if (this.useInMemory) {
      const now = Date.now();
      return Array.from(this.memory.values())
        .filter(
          (r) =>
            (r.status === 'PENDING' || r.status === 'FAILED') &&
            r.attemptCount < r.maxAttempts &&
            Date.parse(r.nextRetryAt) <= now,
        )
        .slice(0, limit)
        .map((r) => ({ ...r }));
    }
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT * FROM fulfillment_dispute_sync_outbox
       WHERE status IN ('PENDING', 'FAILED')
         AND attempt_count < max_attempts
         AND next_retry_at <= NOW()
       ORDER BY next_retry_at ASC
       LIMIT $1`,
      limit,
    )) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  private mapRow(r: any): DisputeSyncOutboxRecord {
    return {
      id: String(r.id),
      caseId: String(r.case_id),
      orderId: String(r.order_id),
      decision: r.decision,
      refundAmount: r.refund_amount != null ? Number(r.refund_amount) : undefined,
      note: String(r.note || ''),
      arbitratorId: String(r.arbitrator_id || 'usr_support_arbitrator'),
      idempotencyKey: String(r.idempotency_key),
      status: r.status as DisputeOutboxStatus,
      attemptCount: Number(r.attempt_count) || 0,
      maxAttempts: Number(r.max_attempts) || 10,
      lastError: r.last_error ? String(r.last_error) : null,
      nextRetryAt: r.next_retry_at
        ? new Date(r.next_retry_at).toISOString()
        : new Date().toISOString(),
      syncedAt: r.synced_at ? new Date(r.synced_at).toISOString() : null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }
}
