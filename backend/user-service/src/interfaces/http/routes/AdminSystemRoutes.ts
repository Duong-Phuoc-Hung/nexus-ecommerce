import crypto from 'node:crypto';
import { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { IPasswordHasher } from '../../../application/ports/IPasswordHasher';
import { authTokenStore } from '../../../infrastructure/security/AuthTokenStore';
import {
  AuthenticatedUser,
  invalidateRolePermissionsCache,
  requireAuth,
  requirePermission,
} from '../../../infrastructure/security/authorization';

type AuthReq = Request & { user?: AuthenticatedUser };

const DEFAULT_SYSTEM_CONFIG: Record<string, number> = {
  auctionMinDurationMin: 60,
  auctionMaxDurationHours: 168,
  auctionMaxActivePerSeller: 5,
  orderPaymentTtlMin: 30,
  auctionPaymentTtlHours: 24,
  cartReserveMin: 15,
  minReputationBid: 50,
  minReputationAuction: 50,
  nonPaymentPenalty: 10,
  maxLoginFailures: 5,
  maxProductImages: 8,
  maxCategoryDepth: 3,
};

const liveSystemConfigCache: Record<string, number> = { ...DEFAULT_SYSTEM_CONFIG };

export function getLiveSystemConfigValue(key: string, fallback: number): number {
  const val = liveSystemConfigCache[key];
  return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
}

const CORE_ROLES = new Set(['ADMIN', 'BUYER', 'SELLER', 'SUPPORT_STAFF']);
const DEFAULT_READ_ONLY_PRIVILEGES = [
  'PROFILE.VIEW',
  'PRODUCT.VIEW',
  'PRODUCT.LIST',
  'CATEGORY.VIEW',
  'CATEGORY.LIST',
];
const ALLOWED_GENDERS = new Set(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']);
const ALLOWED_STATUSES = new Set(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(phone.replace(/[\s-]/g, ''));
}

function isValidIdentifyNumber(idNo: string): boolean {
  return /^[0-9A-Za-z]{9,20}$/.test(idNo);
}

function isValidDateOfBirth(dob: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const parsed = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== dob) return false;
  return parsed.getTime() <= Date.now();
}

function validateStrongPassword(password: string): string | null {
  if (
    password.length < 8 ||
    password.length > 64 ||
    Buffer.byteLength(password) > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return 'Mật khẩu cần 8–64 ký tự, tối đa 72 byte, gồm chữ hoa, chữ thường và chữ số.';
  }
  return null;
}

export function createAdminSystemRoutes(pool: Pool, passwordHasher: IPasswordHasher): Router {
  const router = Router();
  let configTableReady = false;

  async function ensureConfigTable(): Promise<void> {
    if (configTableReady) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_system_configs (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value DOUBLE PRECISION NOT NULL,
        updated_by VARCHAR(36),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    for (const [k, v] of Object.entries(DEFAULT_SYSTEM_CONFIG)) {
      await pool.query(
        `INSERT INTO user_system_configs (config_key, config_value)
         VALUES ($1, $2) ON CONFLICT (config_key) DO NOTHING`,
        [k, v],
      );
    }
    configTableReady = true;
  }

  async function writeAuditLog(
    actorId: string | null,
    action: string,
    targetResource: string,
    targetId: string,
    details: string,
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO user_audit_logs (actor_id, action, target_resource, target_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [actorId, action, targetResource, targetId, details],
      );
    } catch (err) {
      console.warn('[user-service] writeAuditLog warning:', err);
    }
  }

  // 1. GET /api/v1/audit-logs
  router.get(
    '/audit-logs',
    requireAuth,
    requirePermission('AUDIT_LOG.VIEW'),
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50) || 50));
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const params: any[] = [];
        let where = '';
        if (q) {
          params.push(`%${q}%`);
          where = `WHERE a.action ILIKE $1 OR a.target_resource ILIKE $1 OR a.target_id ILIKE $1 OR COALESCE(a.details,'') ILIKE $1`;
        }
        params.push(limit);

        const result = await pool.query(
          `SELECT a.id::text AS id, a.actor_id, u.email AS actor_email, u.full_name AS actor_name,
                  a.action, a.target_resource, a.target_id, a.details, a.created_at
           FROM user_audit_logs a
           LEFT JOIN user_users u ON u.id = a.actor_id
           ${where}
           ORDER BY a.created_at DESC, a.id DESC
           LIMIT $${params.length}`,
          params,
        );

        res.status(200).json({
          success: true,
          data: result.rows.map((r) => ({
            id: String(r.id),
            actorId: r.actor_id || 'SYSTEM',
            actor: r.actor_name || r.actor_email || r.actor_id || 'Hệ thống',
            action: r.action,
            resource: r.target_resource,
            targetResource: r.target_resource,
            targetId: r.target_id,
            details: r.details || '',
            createdAt: r.created_at
              ? new Date(r.created_at).toISOString()
              : new Date().toISOString(),
          })),
        });
      } catch (err) {
        console.error('[user-service] GET /audit-logs error:', err);
        res.status(500).json({ success: false, error: 'Không thể tải nhật ký kiểm toán.' });
      }
    },
  );

  // 2. GET /api/v1/system/config
  router.get(
    '/system/config',
    requireAuth,
    requirePermission('SYSTEM.CONFIG.VIEW'),
    async (_req: Request, res: Response) => {
      try {
        await ensureConfigTable();
        const result = await pool.query(
          'SELECT config_key, config_value, updated_by, updated_at FROM user_system_configs',
        );
        const config: Record<string, number> = { ...DEFAULT_SYSTEM_CONFIG };
        for (const r of result.rows) {
          const val = Number(r.config_value);
          if (Number.isFinite(val)) {
            config[String(r.config_key)] = val;
            liveSystemConfigCache[String(r.config_key)] = val;
          }
        }
        res.status(200).json({ success: true, data: config });
      } catch (err) {
        console.error('[user-service] GET /system/config error:', err);
        res.status(500).json({ success: false, error: 'Không thể tải cấu hình hệ thống.' });
      }
    },
  );

  // 3. PUT /api/v1/system/config
  router.put(
    '/system/config',
    requireAuth,
    requirePermission('SYSTEM.CONFIG.UPDATE'),
    async (req: Request, res: Response) => {
      try {
        await ensureConfigTable();
        const actor = (req as AuthReq).user;
        const incoming = (req.body?.config ?? req.body ?? {}) as Record<string, unknown>;
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

        const updatedKeys: string[] = [];
        for (const [k, rawVal] of Object.entries(incoming)) {
          if (!(k in DEFAULT_SYSTEM_CONFIG)) continue;
          const num = Number(rawVal);
          if (!Number.isFinite(num) || num < 0) {
            res
              .status(400)
              .json({ success: false, error: `Giá trị cấu hình không hợp lệ cho ${k}.` });
            return;
          }
          await pool.query(
            `INSERT INTO user_system_configs (config_key, config_value, updated_by, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (config_key) DO UPDATE
             SET config_value = EXCLUDED.config_value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
            [k, num, actor?.sub || null],
          );
          updatedKeys.push(`${k}=${num}`);
        }

        if (updatedKeys.length > 0) {
          await writeAuditLog(
            actor?.sub || null,
            'UPDATE_SYSTEM_CONFIG',
            'SYSTEM_CONFIG',
            'global',
            `${updatedKeys.join(', ')}${reason ? ` | Lý do: ${reason}` : ''}`,
          );
        }

        const result = await pool.query('SELECT config_key, config_value FROM user_system_configs');
        const config: Record<string, number> = { ...DEFAULT_SYSTEM_CONFIG };
        for (const r of result.rows) {
          const val = Number(r.config_value);
          if (Number.isFinite(val)) {
            config[String(r.config_key)] = val;
            liveSystemConfigCache[String(r.config_key)] = val;
          }
        }

        res.status(200).json({ success: true, data: config });
      } catch (err) {
        console.error('[user-service] PUT /system/config error:', err);
        res.status(500).json({ success: false, error: 'Không thể lưu cấu hình hệ thống.' });
      }
    },
  );

  // 4. POST /api/v1/users (Admin tạo tài khoản mới — SRS 3.1.1 A-F133-02/04: validate đầy đủ & atomic transaction)
  router.post(
    '/users',
    requireAuth,
    requirePermission('USER.CREATE'),
    async (req: Request, res: Response) => {
      const client = await pool.connect();
      try {
        const actor = (req as AuthReq).user;
        const b = req.body || {};
        const email = String(b.email || '')
          .trim()
          .toLowerCase();
        const fullName = String(b.fullName || b.name || '').trim();
        const phone = String(b.phone || '').trim();
        const identifyNumber = String(b.identifyNumber || '').trim();
        const gender = String(b.gender || '')
          .trim()
          .toUpperCase();
        const dateOfBirth = String(b.dateOfBirth || '').trim();
        const address = String(b.address || '').trim();
        const password = String(b.password || '');
        const roleCode = String(b.role || 'BUYER')
          .trim()
          .toUpperCase();

        if (!email || !isValidEmail(email)) {
          res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
          return;
        }
        if (!fullName || fullName.length < 2 || fullName.length > 100) {
          res.status(400).json({ success: false, error: 'Họ tên phải từ 2 đến 100 ký tự.' });
          return;
        }
        if (!phone || !isValidPhone(phone)) {
          res.status(400).json({ success: false, error: 'Số điện thoại phải gồm 9–15 chữ số.' });
          return;
        }
        if (!identifyNumber || !isValidIdentifyNumber(identifyNumber)) {
          res
            .status(400)
            .json({ success: false, error: 'Số CCCD/CMND phải từ 9–20 ký tự hợp lệ.' });
          return;
        }
        if (!gender || !ALLOWED_GENDERS.has(gender)) {
          res
            .status(400)
            .json({ success: false, error: 'Giới tính không hợp lệ (MALE, FEMALE, OTHER).' });
          return;
        }
        if (!dateOfBirth || !isValidDateOfBirth(dateOfBirth)) {
          res.status(400).json({
            success: false,
            error: 'Ngày sinh không hợp lệ (định dạng YYYY-MM-DD và không vượt quá hiện tại).',
          });
          return;
        }
        if (!address || address.length < 4 || address.length > 255) {
          res
            .status(400)
            .json({ success: false, error: 'Địa chỉ liên hệ phải từ 4 đến 255 ký tự.' });
          return;
        }
        const pwdError = validateStrongPassword(password);
        if (pwdError) {
          res.status(400).json({ success: false, error: pwdError });
          return;
        }

        const roleCheck = await client.query(
          'SELECT id, role_code FROM user_roles WHERE UPPER(role_code) = $1 LIMIT 1',
          [roleCode],
        );
        if (roleCheck.rows.length === 0) {
          res.status(400).json({ success: false, error: `Vai trò "${roleCode}" không tồn tại.` });
          return;
        }
        const roleId = roleCheck.rows[0].id;
        const canonicalRole = String(roleCheck.rows[0].role_code);

        const id = crypto.randomUUID();
        const passwordHash = await passwordHasher.hash(password);

        await client.query('BEGIN');
        await client.query(
          `INSERT INTO user_users (id, email, phone, password_hash, full_name, identify_number, gender, date_of_birth, address, status, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', false)`,
          [id, email, phone, passwordHash, fullName, identifyNumber, gender, dateOfBirth, address],
        );

        await client.query(
          `INSERT INTO user_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, roleId],
        );

        await client.query(
          `INSERT INTO user_reputations (user_id, trust_level, score, total_orders, total_penalties)
           VALUES ($1, 'NEWBORN', 50, 0, 0) ON CONFLICT (user_id) DO NOTHING`,
          [id],
        );

        await client.query(
          `INSERT INTO user_audit_logs (actor_id, action, target_resource, target_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            actor?.sub || null,
            'CREATE_USER',
            'USER',
            id,
            `Tạo tài khoản ${email} (${canonicalRole})`,
          ],
        );
        await client.query('COMMIT');

        res.status(201).json({
          success: true,
          data: {
            id,
            email,
            fullName,
            name: fullName,
            phone,
            identifyNumber,
            gender,
            dateOfBirth,
            address,
            role: canonicalRole,
            status: 'ACTIVE',
          },
        });
      } catch (err: any) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore rollback error
        }
        if (err?.code === '23505') {
          res.status(409).json({ success: false, error: 'Email hoặc số điện thoại đã tồn tại.' });
          return;
        }
        console.error('[user-service] POST /users error:', err);
        res.status(500).json({ success: false, error: 'Không thể tạo tài khoản người dùng.' });
      } finally {
        client.release();
      }
    },
  );

  // 5. PATCH /api/v1/users/:id (Admin cập nhật đầy đủ hồ sơ người dùng — SRS A-F136-02)
  router.patch(
    '/users/:id',
    requireAuth,
    requirePermission('USER.UPDATE'),
    async (req: Request, res: Response) => {
      try {
        const actor = (req as AuthReq).user;
        const id = String(req.params.id || '').trim();
        const b = req.body || {};
        const cur = await pool.query(
          `SELECT id, email, phone, full_name, identify_number, gender,
                  to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, address, status
           FROM user_users WHERE id = $1 AND is_deleted = false`,
          [id],
        );
        if (cur.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
          return;
        }
        const row = cur.rows[0];
        const fullName =
          b.fullName !== undefined || b.name !== undefined
            ? String(b.fullName ?? b.name).trim()
            : row.full_name;
        const email = b.email !== undefined ? String(b.email).trim().toLowerCase() : row.email;
        const phone = b.phone !== undefined ? String(b.phone).trim() : row.phone;
        const identifyNumber =
          b.identifyNumber !== undefined ? String(b.identifyNumber).trim() : row.identify_number;
        const gender =
          b.gender !== undefined && b.gender !== null && String(b.gender).trim() !== ''
            ? String(b.gender).trim().toUpperCase()
            : row.gender;
        const dateOfBirth =
          b.dateOfBirth !== undefined &&
          b.dateOfBirth !== null &&
          String(b.dateOfBirth).trim() !== ''
            ? String(b.dateOfBirth).trim()
            : row.date_of_birth;
        const address = b.address !== undefined ? String(b.address).trim() : row.address;
        const status = b.status !== undefined ? String(b.status).trim().toUpperCase() : row.status;

        if (!fullName || fullName.length < 2) {
          res.status(400).json({ success: false, error: 'Họ tên không hợp lệ.' });
          return;
        }
        if (!isValidEmail(email)) {
          res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
          return;
        }
        if (!isValidPhone(phone)) {
          res.status(400).json({ success: false, error: 'Số điện thoại không hợp lệ.' });
          return;
        }
        if (b.identifyNumber !== undefined && !isValidIdentifyNumber(identifyNumber)) {
          res.status(400).json({ success: false, error: 'Số CCCD/CMND không hợp lệ.' });
          return;
        }
        if (gender && !ALLOWED_GENDERS.has(gender)) {
          res.status(400).json({ success: false, error: 'Giới tính không hợp lệ.' });
          return;
        }
        if (dateOfBirth && !isValidDateOfBirth(dateOfBirth)) {
          res.status(400).json({ success: false, error: 'Ngày sinh không hợp lệ.' });
          return;
        }
        if (!ALLOWED_STATUSES.has(status)) {
          res.status(400).json({ success: false, error: 'Trạng thái tài khoản không hợp lệ.' });
          return;
        }

        await pool.query(
          `UPDATE user_users
           SET full_name = $2, email = $3, phone = $4, identify_number = $5,
               gender = $6, date_of_birth = $7, address = $8, status = $9, updated_at = NOW()
           WHERE id = $1`,
          [
            id,
            fullName,
            email,
            phone,
            identifyNumber,
            gender || null,
            dateOfBirth || null,
            address || null,
            status,
          ],
        );

        const changes: string[] = [];
        if (fullName !== row.full_name) changes.push(`fullName: ${row.full_name} -> ${fullName}`);
        if (email !== row.email) changes.push(`email: ${row.email} -> ${email}`);
        if (phone !== row.phone) changes.push(`phone: ${row.phone} -> ${phone}`);
        if (gender !== row.gender) changes.push(`gender: ${row.gender ?? '-'} -> ${gender ?? '-'}`);
        if (dateOfBirth !== row.date_of_birth)
          changes.push(`dob: ${row.date_of_birth ?? '-'} -> ${dateOfBirth ?? '-'}`);
        if (address !== row.address) changes.push(`address updated`);
        if (status !== row.status) changes.push(`status: ${row.status} -> ${status}`);

        await writeAuditLog(
          actor?.sub || null,
          'UPDATE_USER',
          'USER',
          id,
          changes.length > 0 ? changes.join('; ') : `Cập nhật hồ sơ (${fullName}, ${status})`,
        );

        res.status(200).json({
          success: true,
          data: {
            id,
            email,
            fullName,
            name: fullName,
            phone,
            identifyNumber,
            gender: gender || null,
            dateOfBirth: dateOfBirth || null,
            address: address || null,
            status,
          },
        });
      } catch (err: any) {
        if (err?.code === '23505') {
          res
            .status(409)
            .json({ success: false, error: 'Email hoặc số điện thoại đã được sử dụng.' });
          return;
        }
        console.error('[user-service] PATCH /users/:id error:', err);
        res.status(500).json({ success: false, error: 'Không thể cập nhật tài khoản.' });
      }
    },
  );

  // 6. DELETE /api/v1/users/:id (Admin xóa mềm tài khoản)
  router.delete(
    '/users/:id',
    requireAuth,
    requirePermission('USER.DELETE'),
    async (req: Request, res: Response) => {
      try {
        const actor = (req as AuthReq).user;
        const id = String(req.params.id || '').trim();
        if (actor?.sub === id) {
          res
            .status(400)
            .json({ success: false, error: 'Không thể tự xóa tài khoản quản trị đang đăng nhập.' });
          return;
        }
        const updated = await pool.query(
          `UPDATE user_users SET is_deleted = true, status = 'SUSPENDED', updated_at = NOW()
           WHERE id = $1 AND is_deleted = false RETURNING id, email`,
          [id],
        );
        if (updated.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
          return;
        }
        authTokenStore.revokeUserTokens(id);
        await writeAuditLog(
          actor?.sub || null,
          'DELETE_USER',
          'USER',
          id,
          `Xóa mềm tài khoản ${updated.rows[0].email}`,
        );
        res.status(200).json({ success: true, data: { id, deleted: true } });
      } catch (err) {
        console.error('[user-service] DELETE /users/:id error:', err);
        res.status(500).json({ success: false, error: 'Không thể xóa tài khoản.' });
      }
    },
  );

  // 7. POST /api/v1/users/:id/change-password (Admin đặt lại mật khẩu — SRS A-F148-04: USER.CHANGE_PASSWORD & không trùng mật khẩu cũ)
  router.post(
    '/users/:id/change-password',
    requireAuth,
    requirePermission('USER.CHANGE_PASSWORD'),
    async (req: Request, res: Response) => {
      try {
        const actor = (req as AuthReq).user;
        const id = String(req.params.id || '').trim();
        const newPassword = String(req.body?.newPassword || req.body?.password || '');
        const pwdError = validateStrongPassword(newPassword);
        if (pwdError) {
          res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: pwdError });
          return;
        }

        const existing = await pool.query(
          'SELECT id, password_hash FROM user_users WHERE id = $1 AND is_deleted = false LIMIT 1',
          [id],
        );
        if (existing.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
          return;
        }

        const isSamePassword = await passwordHasher.compare(
          newPassword,
          existing.rows[0].password_hash,
        );
        if (isSamePassword) {
          res.status(400).json({
            success: false,
            code: 'PASSWORD_REUSED',
            error: 'Mật khẩu mới phải khác mật khẩu hiện tại của tài khoản.',
          });
          return;
        }

        const hash = await passwordHasher.hash(newPassword);
        await pool.query(
          'UPDATE user_users SET password_hash = $2, updated_at = NOW() WHERE id = $1 AND is_deleted = false',
          [id, hash],
        );
        authTokenStore.revokeUserTokens(id);
        await writeAuditLog(
          actor?.sub || null,
          'ADMIN_RESET_PASSWORD',
          'USER',
          id,
          'Admin đặt lại mật khẩu tài khoản và thu hồi phiên đăng nhập',
        );
        res.status(200).json({ success: true, data: { id, updated: true } });
      } catch (err) {
        console.error('[user-service] POST /users/:id/change-password error:', err);
        res.status(500).json({ success: false, error: 'Không thể đặt lại mật khẩu.' });
      }
    },
  );

  // 8. Role CRUD: POST/PUT/DELETE /api/v1/auth/roles (SRS A-F152-02 & A-F155-02: persist user_role_privileges + default READ_ONLY + audit diff)
  router.post(
    '/auth/roles',
    requireAuth,
    requirePermission('ROLE.CREATE'),
    async (req: Request, res: Response) => {
      const client = await pool.connect();
      try {
        const actor = (req as AuthReq).user;
        const code = String(req.body?.code || req.body?.roleCode || '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_');
        const name = String(req.body?.name || req.body?.roleName || code).trim();
        const description = String(req.body?.description || '').trim();
        if (!code || code.length < 2) {
          res.status(400).json({ success: false, error: 'Mã vai trò không hợp lệ.' });
          return;
        }

        const rawPerms: unknown = req.body?.permissions;
        const requestedPerms =
          Array.isArray(rawPerms) && rawPerms.length > 0
            ? Array.from(
                new Set(rawPerms.map((p) => String(p).trim().toUpperCase()).filter(Boolean)),
              )
            : [...DEFAULT_READ_ONLY_PRIVILEGES];

        const privRes = await client.query(
          'SELECT id, code FROM user_privileges WHERE code = ANY($1::text[])',
          [requestedPerms],
        );
        const foundCodes = new Set(privRes.rows.map((r) => String(r.code)));
        const unknownCodes = requestedPerms.filter((p) => !foundCodes.has(p));
        if (unknownCodes.length > 0) {
          res.status(400).json({
            success: false,
            error: `Quyền không hợp lệ: ${unknownCodes.join(', ')}`,
          });
          return;
        }

        await client.query('BEGIN');
        const created = await client.query(
          `INSERT INTO user_roles (role_code, role_name, description)
           VALUES ($1, $2, $3) RETURNING id::text, role_code, role_name, description`,
          [code, name, description || null],
        );
        const r = created.rows[0];

        for (const priv of privRes.rows) {
          await client.query(
            `INSERT INTO user_role_privileges (role_id, privilege_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [r.id, priv.id],
          );
        }

        const persistedPermissions = privRes.rows.map((p) => String(p.code)).sort();
        await client.query(
          `INSERT INTO user_audit_logs (actor_id, action, target_resource, target_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            actor?.sub || null,
            'CREATE_ROLE',
            'ROLE',
            code,
            `Tạo vai trò ${name} với ${persistedPermissions.length} quyền (${persistedPermissions.join(', ')})`,
          ],
        );
        await client.query('COMMIT');
        invalidateRolePermissionsCache(code);

        res.status(201).json({
          success: true,
          data: {
            id: r.id,
            code: r.role_code,
            role: r.role_code,
            name: r.role_name,
            description: r.description || '',
            permissions: persistedPermissions,
          },
        });
      } catch (err: any) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore
        }
        if (err?.code === '23505') {
          res.status(409).json({ success: false, error: 'Mã vai trò này đã tồn tại.' });
          return;
        }
        console.error('[user-service] POST /auth/roles error:', err);
        res.status(500).json({ success: false, error: 'Không thể tạo vai trò mới.' });
      } finally {
        client.release();
      }
    },
  );

  router.put(
    '/auth/roles/:code',
    requireAuth,
    requirePermission('ROLE.UPDATE'),
    async (req: Request, res: Response) => {
      const client = await pool.connect();
      try {
        const actor = (req as AuthReq).user;
        const code = String(req.params.code || '')
          .trim()
          .toUpperCase();
        const name = req.body?.name ?? req.body?.roleName;
        const description = req.body?.description;
        const hasPermissionsUpdate = Array.isArray(req.body?.permissions);

        const existingRes = await client.query(
          `SELECT r.id::text AS id, r.role_code, r.role_name, COALESCE(r.description, '') AS description,
                  COALESCE(ARRAY_AGG(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), ARRAY[]::text[]) AS permissions
           FROM user_roles r
           LEFT JOIN user_role_privileges urp ON urp.role_id = r.id
           LEFT JOIN user_privileges p ON p.id = urp.privilege_id
           WHERE UPPER(r.role_code) = $1
           GROUP BY r.id, r.role_code, r.role_name, r.description`,
          [code],
        );
        if (existingRes.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Không tìm thấy vai trò.' });
          return;
        }
        const prev = existingRes.rows[0];
        const prevPerms: string[] = Array.isArray(prev.permissions)
          ? prev.permissions.map(String)
          : [];

        let nextPrivRows: Array<{ id: string; code: string }> = [];
        if (hasPermissionsUpdate) {
          const requestedPerms = Array.from(
            new Set(
              (req.body.permissions as unknown[])
                .map((p) => String(p).trim().toUpperCase())
                .filter(Boolean),
            ),
          );
          if (requestedPerms.length > 0) {
            const privRes = await client.query(
              'SELECT id::text, code FROM user_privileges WHERE code = ANY($1::text[])',
              [requestedPerms],
            );
            const foundCodes = new Set(privRes.rows.map((r) => String(r.code)));
            const unknownCodes = requestedPerms.filter((p) => !foundCodes.has(p));
            if (unknownCodes.length > 0) {
              res.status(400).json({
                success: false,
                error: `Quyền không hợp lệ: ${unknownCodes.join(', ')}`,
              });
              return;
            }
            nextPrivRows = privRes.rows;
          }
        }

        await client.query('BEGIN');
        const updated = await client.query(
          `UPDATE user_roles
           SET role_name = COALESCE($2, role_name),
               description = COALESCE($3, description),
               updated_at = NOW()
           WHERE id = $1
           RETURNING id::text, role_code, role_name, description`,
          [
            prev.id,
            name ? String(name).trim() : null,
            description !== undefined ? String(description).trim() : null,
          ],
        );
        const r = updated.rows[0];

        let persistedPermissions = prevPerms;
        if (hasPermissionsUpdate) {
          await client.query('DELETE FROM user_role_privileges WHERE role_id = $1', [prev.id]);
          for (const priv of nextPrivRows) {
            await client.query(
              `INSERT INTO user_role_privileges (role_id, privilege_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [prev.id, priv.id],
            );
          }
          persistedPermissions = nextPrivRows.map((p) => String(p.code)).sort();
        }

        const added = persistedPermissions.filter((p) => !prevPerms.includes(p));
        const removed = prevPerms.filter((p) => !persistedPermissions.includes(p));
        const diffSummary = [
          r.role_name !== prev.role_name ? `name: ${prev.role_name} -> ${r.role_name}` : null,
          added.length > 0 ? `+perms(${added.join(',')})` : null,
          removed.length > 0 ? `-perms(${removed.join(',')})` : null,
        ]
          .filter(Boolean)
          .join(' | ');

        await client.query(
          `INSERT INTO user_audit_logs (actor_id, action, target_resource, target_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            actor?.sub || null,
            'UPDATE_ROLE',
            'ROLE',
            code,
            diffSummary || `Cập nhật vai trò ${code}`,
          ],
        );
        await client.query('COMMIT');
        invalidateRolePermissionsCache(code);

        res.status(200).json({
          success: true,
          data: {
            id: r.id,
            code: r.role_code,
            role: r.role_code,
            name: r.role_name,
            description: r.description || '',
            permissions: persistedPermissions,
          },
        });
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore
        }
        console.error('[user-service] PUT /auth/roles/:code error:', err);
        res.status(500).json({ success: false, error: 'Không thể cập nhật vai trò.' });
      } finally {
        client.release();
      }
    },
  );

  router.delete(
    '/auth/roles/:code',
    requireAuth,
    requirePermission('ROLE.DELETE'),
    async (req: Request, res: Response) => {
      try {
        const actor = (req as AuthReq).user;
        const code = String(req.params.code || '')
          .trim()
          .toUpperCase();
        if (CORE_ROLES.has(code)) {
          res
            .status(400)
            .json({ success: false, error: 'Không thể xóa vai trò lõi của hệ thống.' });
          return;
        }
        const assigned = await pool.query(
          `SELECT COUNT(*)::int AS cnt
           FROM user_user_roles ur
           JOIN user_roles r ON r.id = ur.role_id
           JOIN user_users u ON u.id = ur.user_id
           WHERE UPPER(r.role_code) = $1 AND u.is_deleted = false`,
          [code],
        );
        if (Number(assigned.rows[0]?.cnt || 0) > 0) {
          res.status(409).json({
            success: false,
            error: 'Không thể xóa vai trò đang được gán cho tài khoản hoạt động.',
          });
          return;
        }
        const deleted = await pool.query(
          'DELETE FROM user_roles WHERE UPPER(role_code) = $1 RETURNING role_code',
          [code],
        );
        if (deleted.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Không tìm thấy vai trò.' });
          return;
        }
        await writeAuditLog(actor?.sub || null, 'DELETE_ROLE', 'ROLE', code, `Xóa vai trò ${code}`);
        res.status(200).json({ success: true, data: { code, deleted: true } });
      } catch (err) {
        console.error('[user-service] DELETE /auth/roles/:code error:', err);
        res.status(500).json({ success: false, error: 'Không thể xóa vai trò.' });
      }
    },
  );

  return router;
}
