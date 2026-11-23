import { Pool, PoolClient } from 'pg';
import { restrictionFeature } from '../../application/dtos/AdminUserDto';
import { PostgresAdminRoleRepository } from './PostgresAdminRoleRepository';
import {
  IUserRepository,
  UserSearchCriteria,
  UserSearchPage,
} from '../../domain/repositories/IUserRepository';
import { User, UserFeatureRestriction, UserRole, UserStatus } from '../../domain/entities/User';

/**
 * Infrastructure Repository: PostgresUserRepository (Database Integration)
 * Kết nối trực tiếp vào cơ sở dữ liệu PostgreSQL thật (nexus_user_db - Cổng 5432)
 * Thay thế InMemoryUserRepository để phục vụ kiểm tra, demo Authentication & RBAC.
 */
export class PostgresUserRepository implements IUserRepository {
  private pool: Pool;
  readonly adminRoles: PostgresAdminRoleRepository;

  constructor(pool?: Pool) {
    const rawHost = process.env.USER_DB_HOST || process.env.DB_HOST || '127.0.0.1';
    const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
    const port = Number(process.env.USER_DB_PORT || process.env.DB_PORT) || 5432;
    const user = process.env.USER_DB_USER || process.env.DB_USER || 'nexus_user';
    const password = process.env.USER_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password';
    const database = process.env.USER_DB_NAME || process.env.DB_NAME || 'nexus_user_db';

    this.pool =
      pool ||
      new Pool({
        host,
        port,
        user,
        password,
        database,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

    this.adminRoles = new PostgresAdminRoleRepository(this.pool);
    this.pool.on('error', (err: Error) => {
      console.error('[PostgresUserRepository Pool Error]:', err.message);
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    const query = `
            SELECT u.id, u.email, u.phone, u.full_name, u.password_hash, u.status,
              u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
              to_char(u.date_of_birth, 'YYYY-MM-DD') as birth_date, u.gender,
             COALESCE(r.role_code, 'BUYER') as role_code,
             COALESCE(rep.score, 100) as reputation_score
      FROM user_users u
      LEFT JOIN user_user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_roles r ON ur.role_id = r.id
      LEFT JOIN user_reputations rep ON u.id = rep.user_id
      WHERE u.email = $1 AND u.is_deleted = false
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [email.trim().toLowerCase()]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  public async findById(id: string): Promise<User | null> {
    const query = `
            SELECT u.id, u.email, u.phone, u.full_name, u.password_hash, u.status,
              u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
              to_char(u.date_of_birth, 'YYYY-MM-DD') as birth_date, u.gender,
             COALESCE(r.role_code, 'BUYER') as role_code,
             COALESCE(rep.score, 100) as reputation_score
      FROM user_users u
      LEFT JOIN user_user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_roles r ON ur.role_id = r.id
      LEFT JOIN user_reputations rep ON u.id = rep.user_id
      WHERE u.id = $1 AND u.is_deleted = false
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  public async findByPhone(phone: string): Promise<User | null> {
    const query = `
            SELECT u.id, u.email, u.phone, u.full_name, u.password_hash, u.status,
              u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
              to_char(u.date_of_birth, 'YYYY-MM-DD') as birth_date, u.gender,
             COALESCE(r.role_code, 'BUYER') as role_code,
             COALESCE(rep.score, 100) as reputation_score
      FROM user_users u
      LEFT JOIN user_user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_roles r ON ur.role_id = r.id
      LEFT JOIN user_reputations rep ON u.id = rep.user_id
      WHERE u.phone = $1 AND u.is_deleted = false
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [phone.trim()]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  public async search(criteria: UserSearchCriteria): Promise<UserSearchPage> {
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['u.is_deleted = false'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.q && criteria.q.trim().length > 0) {
      const qVal = `%${criteria.q.trim()}%`;
      params.push(qVal);
      whereClauses.push(
        `(u.id::text ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR r.role_code ILIKE $${paramIndex})`,
      );
      paramIndex++;
    }

    if (criteria.email && criteria.email.trim().length > 0) {
      params.push(criteria.email.trim().toLowerCase());
      whereClauses.push(`LOWER(u.email) = $${paramIndex}`);
      paramIndex++;
    }

    if (criteria.role && criteria.role.trim().length > 0) {
      params.push(criteria.role.trim().toUpperCase());
      whereClauses.push(`r.role_code = $${paramIndex}`);
      paramIndex++;
    }

    if (criteria.status && criteria.status.trim().length > 0) {
      params.push(criteria.status.trim().toUpperCase());
      whereClauses.push(`u.status = $${paramIndex}`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM user_users u
      LEFT JOIN user_user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_roles r ON ur.role_id = r.id
      ${whereSql};
    `;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / limit) || 1;

    let sortColumn = 'u.created_at';
    switch (criteria.sortBy) {
      case 'fullName':
        sortColumn = 'u.full_name';
        break;
      case 'email':
        sortColumn = 'u.email';
        break;
      case 'reputationScore':
        sortColumn = 'reputation_score';
        break;
      case 'createdAt':
      default:
        sortColumn = 'u.created_at';
        break;
    }
    const sortDirection = criteria.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT u.id, u.email, u.full_name, u.password_hash, u.status,
             u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
              to_char(u.date_of_birth, 'YYYY-MM-DD') as birth_date, u.gender,
             COALESCE(r.role_code, 'BUYER') as role_code,
             COALESCE(rep.score, 100) as reputation_score
      FROM user_users u
      LEFT JOIN user_user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_roles r ON ur.role_id = r.id
      LEFT JOIN user_reputations rep ON u.id = rep.user_id
      ${whereSql}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataResult = await this.pool.query(dataQuery, dataParams);
    const users = dataResult.rows.map((row) => this.mapRowToUser(row));

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(user: User): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const insertUserQuery = `
        INSERT INTO user_users (id, email, phone, password_hash, full_name, identify_number, status, is_deleted, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9)
        RETURNING id;
      `;
      const res = await client.query(insertUserQuery, [
        user.id,
        user.email,
        user.phone || '09' + Math.floor(10000000 + Math.random() * 90000000),
        user.passwordHash,
        user.fullName,
        '001' + Math.floor(100000000 + Math.random() * 900000000),
        user.status,
        user.createdAt,
        user.updatedAt,
      ]);

      const newUserId = res.rows[0].id;

      // Gán role
      const insertRoleQuery = `
        INSERT INTO user_user_roles (user_id, role_id)
        SELECT $1, id FROM user_roles WHERE role_code = $2
        ON CONFLICT DO NOTHING;
      `;
      await client.query(insertRoleQuery, [newUserId, user.role]);

      // Khởi tạo điểm uy tín ban đầu (100 điểm)
      const insertReputationQuery = `
        INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
        VALUES ($1, 'NEWBORN', $2, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await client.query(insertReputationQuery, [newUserId, user.reputationScore || 100]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async update(user: User): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE user_users
         SET full_name = $1, phone = $2, status = $3, password_hash = $4,
             failed_login_attempts = $5, locked_until = $6, updated_at = $7
         WHERE id = $8;`,
        [
          user.fullName,
          user.phone,
          user.status,
          user.passwordHash,
          user.failedLoginAttempts,
          user.lockedUntil,
          new Date(),
          user.id,
        ],
      );
      await client.query('DELETE FROM user_user_roles WHERE user_id = $1;', [user.id]);
      await client.query(
        `INSERT INTO user_user_roles (user_id, role_id)
         SELECT $1, id FROM user_roles WHERE role_code = $2
         ON CONFLICT DO NOTHING;`,
        [user.id, user.role],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateProfileFields(
    user: User,
    fields: Partial<Record<'fullName' | 'phone' | 'dateOfBirth' | 'gender', unknown>>,
  ): Promise<Date> {
    const columns = {
      fullName: 'full_name',
      phone: 'phone',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
    } as const;
    const keys = (Object.keys(columns) as Array<keyof typeof columns>).filter(
      (key) => fields[key] !== undefined,
    );
    if (keys.length === 0) return user.updatedAt;
    const assignments = keys.map((key, index) => columns[key] + ' = $' + (index + 2));
    const result = await this.pool.query(
      'UPDATE user_users SET ' +
        assignments.join(', ') +
        ', updated_at = NOW() WHERE id = $1 AND NOT is_deleted RETURNING updated_at',
      [user.id, ...keys.map((key) => user[key])],
    );
    if (!result.rowCount) throw new Error('Không tìm thấy hồ sơ.');
    return new Date(result.rows[0].updated_at);
  }

  public async delete(id: string): Promise<void> {
    const query = `
      UPDATE user_users
      SET is_deleted = true, updated_at = NOW()
      WHERE id = $1;
    `;
    await this.pool.query(query, [id]);
  }

  public async changePassword(
    userId: string,
    previousHash: string,
    nextHash: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      "UPDATE user_users SET password_hash = $3, updated_at = NOW() WHERE id = $1 AND password_hash = $2 AND status = 'ACTIVE' AND NOT is_deleted",
      [userId, previousHash, nextHash],
    );
    return result.rowCount === 1;
  }

  public async adminProfileFields(userId: string) {
    const { rows } = await this.pool.query<{
      identityNumberMasked: string | null;
      defaultAddress: string | null;
    }>(
      `
      SELECT CASE WHEN u.identity_verified_at IS NOT NULL AND length(trim(u.identify_number)) > 4
          THEN repeat('•', length(trim(u.identify_number)) - 4) || right(trim(u.identify_number), 4)
        END AS "identityNumberMasked",
        COALESCE((SELECT concat_ws(', ', a.street, a.ward_name, a.province_name)
          FROM user_addresses a WHERE a.user_id=u.id AND a.is_default AND NOT a.is_deleted
          ORDER BY a.created_at DESC, a.id DESC LIMIT 1), NULLIF(trim(u.address), '')) AS "defaultAddress"
      FROM user_users u WHERE u.id=$1 AND NOT u.is_deleted
    `,
      [userId],
    );
    return rows[0] ?? null;
  }

  public async adminReputationHistory(userId: string, page: number, limit: number) {
    const { rows } = await this.pool.query<{
      items: unknown[];
      total: number;
    }>(
      `
      WITH events AS (
        SELECT e.id::text, e.action_type AS "actionType", e.delta, e.reason,
          e.score_before AS "scoreBefore", e.score_after AS "scoreAfter",
          e.restricted_features AS "restrictedFeatures", e.duration_days AS "durationDays",
          e.expires_at AS "expiresAt", e.actor_id AS "actorId",
          COALESCE(e.actor_name,a.full_name) AS "actorName", e.created_at AS "createdAt", e.id AS sort_id
        FROM user_reputation_events e LEFT JOIN user_users a ON a.id=e.actor_id
        WHERE e.user_id=$1
      ), page AS (
        SELECT * FROM events ORDER BY "createdAt" DESC, sort_id DESC LIMIT $2 OFFSET $3
      )
      SELECT COALESCE((SELECT jsonb_agg(to_jsonb(page) - 'sort_id' ORDER BY "createdAt" DESC, sort_id DESC) FROM page),
        '[]'::jsonb) AS items, (SELECT count(*)::int FROM events) AS total
    `,
      [userId, limit, (page - 1) * limit],
    );
    const { items, total } = rows[0];
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  public async adjustScore(userId: string, points: number, reason: string, actorId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM user_users WHERE id = $1 FOR UPDATE', [userId]);
      const previous = await client.query('SELECT score FROM user_reputations WHERE user_id = $1', [
        userId,
      ]);
      const oldScore = Number(previous.rows[0]?.score ?? 100);
      const score = Math.min(2147483647, Math.max(0, oldScore + points));
      await client.query(
        'INSERT INTO user_reputations (user_id, score) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()',
        [userId, score],
      );
      await client.query(
        `INSERT INTO user_reputation_events (user_id, delta, reason, actor_id, score_before, score_after, actor_name)
         VALUES ($1,$2,$3,$4::varchar,$5,$6,(SELECT full_name FROM user_users WHERE id=$4::varchar))`,
        [userId, score - oldScore, reason, actorId, oldScore, score],
      );
      const history = (await this.reputationHistory(userId, client)).reverse();
      await client.query('COMMIT');
      return { score, history };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async reputationHistory(userId: string, db: Pool | PoolClient = this.pool) {
    const result = await db.query(
      "SELECT id::text, delta, reason, actor_id, created_at FROM user_reputation_events WHERE user_id = $1 AND action_type = 'ADJUST_SCORE' ORDER BY created_at DESC, id DESC LIMIT 20",
      [userId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      points: Number(row.delta),
      reason: String(row.reason),
      adjustedBy: String(row.actor_id),
      createdAt: new Date(row.created_at),
    }));
  }

  public async saveRestriction(userId: string, restriction: UserFeatureRestriction) {
    await this.pool.query(
      `WITH saved AS (
         INSERT INTO user_feature_restrictions (user_id, feature, duration_days, reason, actor_id, expires_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id, feature) DO UPDATE SET
         duration_days=EXCLUDED.duration_days, reason=EXCLUDED.reason, actor_id=EXCLUDED.actor_id,
         expires_at=EXCLUDED.expires_at, created_at=EXCLUDED.created_at
         RETURNING user_id, duration_days, reason, actor_id, expires_at
       )
       INSERT INTO user_reputation_events (user_id, action_type, delta, restricted_features, duration_days,
         reason, actor_id, actor_name, expires_at)
       SELECT user_id, 'RESTRICT_FEATURE', 0, jsonb_build_array($8::text), duration_days, reason, actor_id,
         (SELECT full_name FROM user_users WHERE id=saved.actor_id), expires_at FROM saved`,
      [
        userId,
        restriction.restriction,
        restriction.durationDays,
        restriction.reason,
        restriction.appliedBy,
        restriction.expiresAt,
        restriction.createdAt,
        restrictionFeature(restriction.restriction),
      ],
    );
    return this.activeRestrictions(userId);
  }

  public async activeRestrictions(userId: string): Promise<UserFeatureRestriction[]> {
    const result = await this.pool.query(
      'SELECT * FROM user_feature_restrictions WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC',
      [userId],
    );
    return result.rows.map((row) => ({
      restriction: row.feature,
      durationDays: row.duration_days,
      reason: row.reason,
      appliedBy: row.actor_id,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
    }));
  }

  public async ratingsSummary(userId: string, sellerOnly: boolean) {
    const { rows } = await this.pool.query(
      `SELECT rating, count(*)::int AS total FROM user_ratings WHERE to_user_id = $1
       AND (NOT $2::boolean OR is_seller_review) GROUP BY rating`,
      [userId, sellerOnly],
    );
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalReviews = 0;
    let stars = 0;
    for (const row of rows) {
      ratingBreakdown[row.rating] = row.total;
      totalReviews += row.total;
      stars += row.total * row.rating;
    }
    return {
      ratingBreakdown,
      totalReviews,
      averageRating: totalReviews === 0 ? null : Number((stars / totalReviews).toFixed(2)),
    };
  }

  public async sellerReviews(
    userId: string,
    page: number,
    limit: number,
    rating?: number,
    admin = false,
  ) {
    const where =
      'to_user_id = $1 AND ($3::boolean OR is_seller_review) AND ($2::smallint IS NULL OR user_ratings.rating = $2)';
    const [count, list] = await Promise.all([
      this.pool.query('SELECT count(*)::int AS total FROM user_ratings WHERE ' + where, [
        userId,
        rating ?? null,
        admin,
      ]),
      this.pool.query(
        `SELECT id::text, CASE WHEN $3::boolean THEN order_id END AS order_id, rating, comment, created_at
         FROM user_ratings WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT $4 OFFSET $5`,
        [userId, rating ?? null, admin, limit, (page - 1) * limit],
      ),
    ]);
    const total = Number(count.rows[0].total);
    return {
      items: list.rows.map((row) => ({
        id: row.id,
        buyerAlias: admin ? 'Người đánh giá ẩn danh' : 'Người mua đã xác minh',
        ...(admin ? { orderId: row.order_id } : {}),
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async addSellerReview(
    sellerId: string,
    buyerId: string,
    orderId: string,
    rating: number,
    comment: string | null,
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO user_ratings (order_id, from_user_id, to_user_id, rating, comment, is_seller_review)
       VALUES ($1,$2,$3,$4,$5,TRUE) ON CONFLICT DO NOTHING
       RETURNING id::text, rating, comment, created_at AS "createdAt"`,
      [orderId, buyerId, sellerId, rating, comment],
    );
    return rows[0] ?? null;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  private mapRowToUser(row: any): User {
    let role = UserRole.BUYER;
    if (row.role_code === 'ADMIN') role = UserRole.ADMIN;
    else if (row.role_code === 'SELLER') role = UserRole.SELLER;
    else if (row.role_code === 'SUPPORT_STAFF') role = UserRole.SUPPORT_STAFF;

    let status = UserStatus.ACTIVE;
    if (row.status === 'SUSPENDED') status = UserStatus.SUSPENDED;
    else if (row.status === 'PENDING_VERIFICATION') status = UserStatus.PENDING_VERIFICATION;

    return new User({
      id: String(row.id),
      email: row.email,
      fullName: row.full_name,
      phone: row.phone || '',
      passwordHash: row.password_hash,
      role: role,
      status: status,
      dateOfBirth: row.birth_date,
      gender: row.gender,
      reputationScore: Number(row.reputation_score ?? 100),
      failedLoginAttempts: Number(row.failed_login_attempts) || 0,
      lockedUntil: row.locked_until ? new Date(row.locked_until) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
