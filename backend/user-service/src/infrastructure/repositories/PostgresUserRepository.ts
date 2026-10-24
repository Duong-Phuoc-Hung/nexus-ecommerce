import { Pool } from 'pg';
import {
  IUserRepository,
  UserSearchCriteria,
  UserSearchPage,
} from '../../domain/repositories/IUserRepository';
import { User, UserRole, UserStatus } from '../../domain/entities/User';

/**
 * Infrastructure Repository: PostgresUserRepository (Database Integration)
 * Kết nối trực tiếp vào cơ sở dữ liệu PostgreSQL thật (nexus_user_db - Cổng 5432)
 * Thay thế InMemoryUserRepository để phục vụ kiểm tra, demo Authentication & RBAC.
 */
export class PostgresUserRepository implements IUserRepository {
  private pool: Pool;

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

  public async findByEmail(email: string): Promise<User | null> {
    const query = `
            SELECT u.id, u.email, u.full_name, u.password_hash, u.status,
              u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
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
            SELECT u.id, u.email, u.full_name, u.password_hash, u.status,
              u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
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
        '09' + Math.floor(10000000 + Math.random() * 90000000),
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
         SET full_name = $1, status = $2, password_hash = $3,
             failed_login_attempts = $4, locked_until = $5, updated_at = $6
         WHERE id = $7;`,
        [
          user.fullName,
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

  public async delete(id: string): Promise<void> {
    const query = `
      UPDATE user_users
      SET is_deleted = true, updated_at = NOW()
      WHERE id = $1;
    `;
    await this.pool.query(query, [id]);
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
      passwordHash: row.password_hash,
      role: role,
      status: status,
      reputationScore: Number(row.reputation_score) || 100,
      failedLoginAttempts: Number(row.failed_login_attempts) || 0,
      lockedUntil: row.locked_until ? new Date(row.locked_until) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
