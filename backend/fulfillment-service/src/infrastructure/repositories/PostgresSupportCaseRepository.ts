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
  private isInitializing = false;

  constructor(private readonly pool: Pool) {}

  /**
   * Đảm bảo bảng fulfillment_support_cases tồn tại và nạp 3 ticket mẫu nếu bảng rỗng.
   */
  public async ensureSchemaAndSeed(): Promise<void> {
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS fulfillment_support_cases (
          id VARCHAR(50) PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          order_id VARCHAR(100) NOT NULL,
          order_code VARCHAR(100) NOT NULL,
          user_id VARCHAR(50) NOT NULL,
          customer VARCHAR(100) NOT NULL,
          reason TEXT NOT NULL,
          priority VARCHAR(30) NOT NULL DEFAULT 'Trung bình',
          status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          resolution_note TEXT,
          resolved_by VARCHAR(50),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_support_case_user ON fulfillment_support_cases (user_id);
        CREATE INDEX IF NOT EXISTS idx_support_case_order ON fulfillment_support_cases (order_id);
        CREATE INDEX IF NOT EXISTS idx_support_case_status ON fulfillment_support_cases (status);
        CREATE INDEX IF NOT EXISTS idx_support_case_priority ON fulfillment_support_cases (priority);
        CREATE INDEX IF NOT EXISTS idx_support_case_created_at ON fulfillment_support_cases (created_at DESC);
      `);

      const countRes = await this.pool.query(
        'SELECT COUNT(*)::int AS count FROM fulfillment_support_cases',
      );
      const count = countRes.rows[0]?.count ?? 0;

      if (count === 0) {
        await this.seedInitialCases();
      }

      this.isInitialized = true;
    } catch (err) {
      console.error(
        '[PostgresSupportCaseRepository] Schema init/seed warning:',
        (err as Error).message,
      );
    } finally {
      this.isInitializing = false;
    }
  }

  public async findById(id: string): Promise<SupportCase | null> {
    await this.ensureSchemaAndSeed();
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
    await this.ensureSchemaAndSeed();

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
    await this.ensureSchemaAndSeed();

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
    const now = Date.now();
    const samples = [
      new SupportCase({
        id: 'CS-4021',
        type: 'Yêu cầu hoàn tiền',
        orderId: 'ord_01hqz555abc',
        orderCode: 'NX-ORD-8021',
        userId: 'usr_01hqz789abc',
        customer: 'Minh Anh',
        reason: 'Sản phẩm chưa đúng mô tả',
        priority: 'Cao',
        status: 'PENDING',
        createdAt: new Date(now - 12 * 60 * 1000), // 12 phút trước
      }),
      new SupportCase({
        id: 'CS-4018',
        type: 'Khiếu nại giao hàng',
        orderId: 'ord_01hqz888def',
        orderCode: 'NX-ORD-8017',
        userId: 'usr_buyer_02',
        customer: 'Quốc Bảo',
        reason: 'Đơn hàng giao chậm',
        priority: 'Trung bình',
        status: 'PENDING',
        createdAt: new Date(now - 46 * 60 * 1000), // 46 phút trước
      }),
      new SupportCase({
        id: 'CS-4012',
        type: 'Tranh chấp giao dịch',
        orderId: 'ord_01hqz999ghi',
        orderCode: 'NX-ORD-8009',
        userId: 'usr_buyer_03',
        customer: 'Thu Hà',
        reason: 'Cần xác nhận trạng thái đơn',
        priority: 'Thấp',
        status: 'PENDING',
        createdAt: new Date(now - 2 * 60 * 60 * 1000), // 2 giờ trước
      }),
    ];

    for (const item of samples) {
      await this.save(item);
    }

    console.log(
      '[PostgresSupportCaseRepository] Đã khởi tạo 3 support cases mẫu vào PostgreSQL thành công.',
    );
  }
}
