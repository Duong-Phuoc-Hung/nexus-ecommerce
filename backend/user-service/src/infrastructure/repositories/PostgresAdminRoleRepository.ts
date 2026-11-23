import type { Pool, PoolClient } from 'pg';
import { AdminApiError, RoleSettings } from '../../application/dtos/AdminUserDto';
import { getRolePermissions, ROLE_PERMISSIONS } from '../security/authorization';

function systemRole(code: string) {
  return Object.hasOwn(ROLE_PERMISSIONS, code);
}

function missing() {
  return new AdminApiError(404, 'ROLE_NOT_FOUND', 'Không tìm thấy vai trò.');
}

type RoleRow = {
  role: string;
  name: string;
  description: string | null;
  stored_permissions: string[];
  userCount: number;
};

export class PostgresAdminRoleRepository {
  constructor(private readonly pool: Pool) {}

  async list(db: Pool | PoolClient = this.pool, code?: string) {
    const { rows } = await db.query<RoleRow>(
      `
      SELECT r.role_code AS role, r.role_name AS name, r.description,
        ARRAY(SELECT p.code FROM user_role_privileges rp JOIN user_privileges p ON p.id=rp.privilege_id
          WHERE rp.role_id=r.id ORDER BY p.code) AS stored_permissions,
        (SELECT count(*)::int FROM user_user_roles ur WHERE ur.role_id=r.id) AS "userCount"
      FROM user_roles r WHERE ($1::text IS NULL OR r.role_code=$1) ORDER BY r.role_code
    `,
      [code ?? null],
    );
    return rows.map(({ stored_permissions, ...row }) => ({
      ...row,
      code: row.role,
      system: systemRole(row.role),
      permissions: systemRole(row.role) ? getRolePermissions(row.role) : stored_permissions,
    }));
  }

  async create(code: string, settings: RoleSettings) {
    if (systemRole(code))
      throw new AdminApiError(409, 'ROLE_ALREADY_EXISTS', 'Mã vai trò đã tồn tại.');
    return this.transaction(async (db) => {
      const { rows } = await db.query<{ id: string }>(
        `
        INSERT INTO user_roles (role_code, role_name, description) VALUES ($1,$2,$3)
        ON CONFLICT (role_code) DO NOTHING RETURNING id
      `,
        [code, settings.name, settings.description],
      );
      if (!rows[0]) throw new AdminApiError(409, 'ROLE_ALREADY_EXISTS', 'Mã vai trò đã tồn tại.');
      await this.replacePermissions(db, rows[0].id, settings.permissions);
      return (await this.list(db, code))[0];
    });
  }

  async update(code: string, settings: RoleSettings) {
    return this.transaction(async (db) => {
      const id = await this.lock(db, code);
      if (systemRole(code)) {
        const current = getRolePermissions(code);
        if (
          settings.permissions.length !== current.length ||
          settings.permissions.some((permission) => !current.includes(permission))
        ) {
          throw new AdminApiError(
            403,
            'SYSTEM_ROLE_LOCKED',
            'Không thể sửa quyền của vai trò hệ thống.',
          );
        }
      } else {
        await this.replacePermissions(db, id, settings.permissions);
      }
      await db.query(
        `
        UPDATE user_roles SET role_name=$2, description=$3, updated_at=now() WHERE id=$1
      `,
        [id, settings.name, settings.description],
      );
      return (await this.list(db, code))[0];
    });
  }

  async delete(code: string) {
    if (systemRole(code)) {
      throw new AdminApiError(403, 'SYSTEM_ROLE_LOCKED', 'Không thể xóa vai trò hệ thống.');
    }
    await this.transaction(async (db) => {
      const id = await this.lock(db, code);
      const users = await db.query('SELECT 1 FROM user_user_roles WHERE role_id=$1 LIMIT 1', [id]);
      if (users.rowCount)
        throw new AdminApiError(409, 'ROLE_IN_USE', 'Vai trò đang được gán cho người dùng.');
      await db.query('DELETE FROM user_roles WHERE id=$1', [id]);
    });
  }

  private async lock(db: PoolClient, code: string) {
    const { rows } = await db.query<{ id: string }>(
      'SELECT id FROM user_roles WHERE role_code=$1 FOR UPDATE',
      [code],
    );
    if (!rows[0]) throw missing();
    return rows[0].id;
  }

  private async replacePermissions(db: PoolClient, roleId: string, permissions: string[]) {
    await db.query('DELETE FROM user_role_privileges WHERE role_id=$1', [roleId]);
    const inserted = await db.query(
      `
      INSERT INTO user_role_privileges (role_id, privilege_id)
      SELECT $1, id FROM user_privileges WHERE code=ANY($2::text[])
    `,
      [roleId, permissions],
    );
    if (inserted.rowCount !== permissions.length) {
      throw new AdminApiError(
        400,
        'INVALID_ROLE_PERMISSION',
        'Danh sách chứa quyền chưa được định nghĩa.',
      );
    }
  }

  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const result = await work(db);
      await db.query('COMMIT');
      return result;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      db.release();
    }
  }
}
