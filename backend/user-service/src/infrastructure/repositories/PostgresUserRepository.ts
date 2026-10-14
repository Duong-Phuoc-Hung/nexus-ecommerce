import { Pool } from 'pg';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
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

  public async save(user: User): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const insertUserQuery = `
        INSERT INTO user_users (email, phone, password_hash, full_name, identify_number, status, is_deleted, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
        RETURNING id;
      `;
      const res = await client.query(insertUserQuery, [
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
