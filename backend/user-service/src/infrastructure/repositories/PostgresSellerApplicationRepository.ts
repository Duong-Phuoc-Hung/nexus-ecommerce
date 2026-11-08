import { Pool } from 'pg';
import {
  SellerApplication,
  SellerApplicationDecisionRecord,
  SellerApplicationShopSnapshot,
  SellerApplicationStatus,
  SellerApplicationVersionRecord,
} from '../../domain/entities/SellerApplication';
import {
  ISellerApplicationRepository,
  SellerApplicationSearchCriteria,
  SellerApplicationSearchPage,
} from '../../domain/repositories/ISellerApplicationRepository';
import { InMemorySellerApplicationRepository } from './InMemorySellerApplicationRepository';

interface SellerApplicationRow {
  id: string;
  applicant_id: string;
  applicant_email: string;
  applicant_name: string;
  status: SellerApplicationStatus;
  version: number;
  snapshot: SellerApplicationShopSnapshot | string;
  rejection_reason: string | null;
  versions: SellerApplicationVersionRecord[] | string;
  decision_history: SellerApplicationDecisionRecord[] | string;
  submitted_at: string | Date;
  reviewed_at: string | Date | null;
  reviewed_by: string | null;
  activated_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export class PostgresSellerApplicationRepository implements ISellerApplicationRepository {
  private pool: Pool;
  private tableInitialized: boolean = false;
  private fallback: InMemorySellerApplicationRepository = new InMemorySellerApplicationRepository();
  private useFallback: boolean = false;

  constructor(pool?: Pool) {
    this.pool =
      pool ||
      new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'nexus_user',
        password: process.env.DB_PASSWORD || 'nexus_password',
        database: process.env.DB_NAME || 'nexus_user_db',
        max: 10,
        idleTimeoutMillis: 30000,
      });
  }

  private async ensureTable(): Promise<boolean> {
    if (this.useFallback) return false;
    if (this.tableInitialized) return true;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_seller_applications (
          id VARCHAR(100) PRIMARY KEY,
          applicant_id VARCHAR(100) NOT NULL,
          applicant_email VARCHAR(255) NOT NULL,
          applicant_name VARCHAR(255) NOT NULL,
          status VARCHAR(32) NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          snapshot JSONB NOT NULL,
          rejection_reason TEXT NULL,
          versions JSONB NOT NULL DEFAULT '[]'::jsonb,
          decision_history JSONB NOT NULL DEFAULT '[]'::jsonb,
          submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMP WITH TIME ZONE NULL,
          reviewed_by VARCHAR(100) NULL,
          activated_at TIMESTAMP WITH TIME ZONE NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_seller_apps_applicant_id ON user_seller_applications(applicant_id);
        CREATE INDEX IF NOT EXISTS idx_seller_apps_status ON user_seller_applications(status);
      `);
      this.tableInitialized = true;
      return true;
    } catch {
      this.useFallback = true;
      return false;
    }
  }

  private mapRowToDomain(row: SellerApplicationRow): SellerApplication {
    const snapshot =
      typeof row.snapshot === 'string'
        ? (JSON.parse(row.snapshot) as SellerApplicationShopSnapshot)
        : row.snapshot;

    const versions =
      typeof row.versions === 'string'
        ? (JSON.parse(row.versions) as SellerApplicationVersionRecord[])
        : row.versions || [];

    const decisionHistory =
      typeof row.decision_history === 'string'
        ? (JSON.parse(row.decision_history) as SellerApplicationDecisionRecord[])
        : row.decision_history || [];

    return new SellerApplication({
      id: row.id,
      applicantId: row.applicant_id,
      applicantName: row.applicant_name,
      applicantEmail: row.applicant_email,
      status: row.status,
      version: Number(row.version),
      snapshot,
      rejectionReason: row.rejection_reason,
      submittedAt: new Date(row.submitted_at),
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      reviewedBy: row.reviewed_by,
      activatedAt: row.activated_at ? new Date(row.activated_at) : null,
      versions,
      decisionHistory,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  async findById(id: string): Promise<SellerApplication | null> {
    if (!(await this.ensureTable())) {
      return this.fallback.findById(id);
    }
    const res = await this.pool.query<SellerApplicationRow>(
      `SELECT * FROM user_seller_applications WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToDomain(res.rows[0]);
  }

  async findLatestByApplicantId(applicantId: string): Promise<SellerApplication | null> {
    if (!(await this.ensureTable())) {
      return this.fallback.findLatestByApplicantId(applicantId);
    }
    const res = await this.pool.query<SellerApplicationRow>(
      `SELECT * FROM user_seller_applications WHERE applicant_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [applicantId],
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToDomain(res.rows[0]);
  }

  async search(criteria: SellerApplicationSearchCriteria): Promise<SellerApplicationSearchPage> {
    if (!(await this.ensureTable())) {
      return this.fallback.search(criteria);
    }

    const res = await this.pool.query<SellerApplicationRow>(
      `SELECT * FROM user_seller_applications`,
    );
    const tempRepo = new InMemorySellerApplicationRepository();
    for (const row of res.rows) {
      await tempRepo.save(this.mapRowToDomain(row));
    }
    return tempRepo.search(criteria);
  }

  async save(application: SellerApplication): Promise<void> {
    if (!(await this.ensureTable())) {
      return this.fallback.save(application);
    }

    await this.pool.query(
      `INSERT INTO user_seller_applications (
        id, applicant_id, applicant_email, applicant_name,
        status, version, snapshot, rejection_reason, versions, decision_history,
        submitted_at, reviewed_at, reviewed_by, activated_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7::jsonb, $8, $9::jsonb, $10::jsonb,
        $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT (id) DO UPDATE SET
        applicant_email = EXCLUDED.applicant_email,
        applicant_name = EXCLUDED.applicant_name,
        status = EXCLUDED.status,
        version = EXCLUDED.version,
        snapshot = EXCLUDED.snapshot,
        rejection_reason = EXCLUDED.rejection_reason,
        versions = EXCLUDED.versions,
        decision_history = EXCLUDED.decision_history,
        submitted_at = EXCLUDED.submitted_at,
        reviewed_at = EXCLUDED.reviewed_at,
        reviewed_by = EXCLUDED.reviewed_by,
        activated_at = EXCLUDED.activated_at,
        updated_at = EXCLUDED.updated_at`,
      [
        application.id,
        application.applicantId,
        application.applicantEmail,
        application.applicantName,
        application.status,
        application.version,
        JSON.stringify(application.snapshot),
        application.rejectionReason,
        JSON.stringify(application.versions),
        JSON.stringify(application.decisionHistory),
        application.submittedAt.toISOString(),
        application.reviewedAt ? application.reviewedAt.toISOString() : null,
        application.reviewedBy,
        application.activatedAt ? application.activatedAt.toISOString() : null,
        application.createdAt.toISOString(),
        application.updatedAt.toISOString(),
      ],
    );
  }

  async updateWithVersion(
    application: SellerApplication,
    expectedVersion: number,
  ): Promise<boolean> {
    if (!(await this.ensureTable())) {
      return this.fallback.updateWithVersion(application, expectedVersion);
    }

    const res = await this.pool.query(
      `UPDATE user_seller_applications
       SET status = $1,
           version = $2,
           snapshot = $3::jsonb,
           rejection_reason = $4,
           versions = $5::jsonb,
           decision_history = $6::jsonb,
           submitted_at = $7,
           reviewed_at = $8,
           reviewed_by = $9,
           activated_at = $10,
           updated_at = $11
       WHERE id = $12 AND version = $13`,
      [
        application.status,
        application.version,
        JSON.stringify(application.snapshot),
        application.rejectionReason,
        JSON.stringify(application.versions),
        JSON.stringify(application.decisionHistory),
        application.submittedAt.toISOString(),
        application.reviewedAt ? application.reviewedAt.toISOString() : null,
        application.reviewedBy,
        application.activatedAt ? application.activatedAt.toISOString() : null,
        application.updatedAt.toISOString(),
        application.id,
        expectedVersion,
      ],
    );

    return (res.rowCount ?? 0) > 0;
  }

  async getIdempotentResult<T = unknown>(key: string): Promise<T | null> {
    return this.fallback.getIdempotentResult<T>(key);
  }

  async saveIdempotentResult<T = unknown>(key: string, result: T): Promise<void> {
    return this.fallback.saveIdempotentResult<T>(key, result);
  }

  async acquireActivationLock(userId: string, ttlMs?: number): Promise<boolean> {
    return this.fallback.acquireActivationLock(userId, ttlMs);
  }

  async releaseActivationLock(userId: string): Promise<void> {
    return this.fallback.releaseActivationLock(userId);
  }

  async isInActivationWindow(userId: string): Promise<boolean> {
    return this.fallback.isInActivationWindow(userId);
  }
}
