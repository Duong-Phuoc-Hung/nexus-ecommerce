import { Pool } from 'pg';
import {
  SupportCase,
  SupportCasePriority,
  SupportCaseStatus,
} from '../../domain/entities/SupportCase';
import {
  ISupportCaseRepository,
  SupportCaseSearchCriteria,
  SupportCaseSearchPage,
} from '../../domain/repositories/ISupportCaseRepository';
import { loadSeedSupportCases } from '../seeds/fulfillmentSeedLoader';

interface SupportCaseRow {
  id: string;
  type: string;
  order_id: string;
  order_code: string;
  user_id: string;
  customer: string;
  reason: string;
  priority: string;
  status: string;
  resolution_note?: string | null;
  resolved_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export class PostgresSupportCaseRepository implements ISupportCaseRepository {
  private isInitialized = false;

  constructor(private readonly pool: Pool) {}

  /**
   * Nạp 3 ticket mẫu nếu bảng rỗng.
   */
  public async seedIfEmpty(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const countRes = await this.pool.query(
        'SELECT COUNT(*)::int AS count FROM fulfillment_support_cases',
      );
      const count = countRes.rows[0]?.count ?? 0;

      if (count === 0) {
        await this.seedInitialCases();
      }
    } catch (err) {
      console.warn('[PostgresSupportCaseRepository] Seed check warning:', (err as Error).message);
    }
  }

  public async findById(id: string): Promise<SupportCase | null> {
    const cleanId = id.trim();

    const { rows } = await this.pool.query<SupportCaseRow>(
      `SELECT * FROM fulfillment_support_cases 
       WHERE UPPER(id) = UPPER($1) 
       LIMIT 1`,
      [cleanId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToDomain(rows[0]);
  }

  public async search(criteria: SupportCaseSearchCriteria): Promise<SupportCaseSearchPage> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    // 1. Lọc theo userId
    if (criteria.userId && criteria.userId.trim().length > 0) {
      conditions.push(`LOWER(user_id) = LOWER($${paramIdx})`);
      params.push(criteria.userId.trim());
      paramIdx++;
    }

    // 2. Lọc theo status
    if (criteria.status && criteria.status.trim().length > 0) {
      conditions.push(`LOWER(status) = LOWER($${paramIdx})`);
      params.push(criteria.status.trim());
      paramIdx++;
    }

    // 3. Lọc theo priority
    if (criteria.priority && criteria.priority.trim().length > 0) {
      conditions.push(`LOWER(priority) = LOWER($${paramIdx})`);
      params.push(criteria.priority.trim());
      paramIdx++;
    }

    // 4. Lọc theo từ khóa tìm kiếm (query)
    if (criteria.query && criteria.query.trim().length > 0) {
      const q = `%${criteria.query.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(id) LIKE $${paramIdx} OR
        LOWER(order_id) LIKE $${paramIdx} OR
        LOWER(order_code) LIKE $${paramIdx} OR
        LOWER(customer) LIKE $${paramIdx} OR
        LOWER(reason) LIKE $${paramIdx}
      )`);
      params.push(q);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 4. Phân trang
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const offset = (page - 1) * limit;

    // Đếm tổng số bản ghi
    const countSql = `SELECT COUNT(*)::int AS total FROM fulfillment_support_cases ${whereClause}`;
    const countRes = await this.pool.query(countSql, params);
    const total = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Sắp xếp ưu tiên: Cao trước, sau đó sắp xếp theo thời gian mới nhất lên đầu
    const selectSql = `
      SELECT * FROM fulfillment_support_cases
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN priority IN ('Cao', 'HIGH') THEN 1 
          WHEN priority IN ('Trung bình', 'MEDIUM') THEN 2 
          ELSE 3 
        END ASC,
        created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const { rows } = await this.pool.query<SupportCaseRow>(selectSql, [...params, limit, offset]);

    return {
      items: rows.map((r) => this.mapToDomain(r)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(caseItem: SupportCase): Promise<void> {
    const upsertSql = `
      INSERT INTO fulfillment_support_cases (
        id, type, order_id, order_code, user_id, customer, reason,
        priority, status, resolution_note, resolved_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        order_id = EXCLUDED.order_id,
        order_code = EXCLUDED.order_code,
        user_id = EXCLUDED.user_id,
        customer = EXCLUDED.customer,
        reason = EXCLUDED.reason,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        resolution_note = EXCLUDED.resolution_note,
        resolved_by = EXCLUDED.resolved_by,
        updated_at = EXCLUDED.updated_at
    `;

    await this.pool.query(upsertSql, [
      caseItem.id,
      caseItem.type,
      caseItem.orderId,
      caseItem.orderCode,
      caseItem.userId,
      caseItem.customer,
      caseItem.reason,
      caseItem.priority,
      caseItem.status,
      caseItem.resolutionNote || null,
      caseItem.resolvedBy || null,
      caseItem.createdAt,
      caseItem.updatedAt,
    ]);
  }

  private mapToDomain(row: SupportCaseRow): SupportCase {
    return new SupportCase({
      id: row.id,
      type: row.type,
      orderId: row.order_id,
      orderCode: row.order_code,
      userId: row.user_id,
      customer: row.customer,
      reason: row.reason,
      priority: row.priority as SupportCasePriority,
      status: row.status as SupportCaseStatus,
      resolutionNote: row.resolution_note || undefined,
      resolvedBy: row.resolved_by || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private async seedInitialCases(): Promise<void> {
    const samples = loadSeedSupportCases();

    for (const item of samples) {
      await this.save(item);
    }

    console.log(
      `[PostgresSupportCaseRepository] Đã khởi tạo ${samples.length} support cases mẫu từ seed JSON vào PostgreSQL thành công.`,
    );
  }
}
