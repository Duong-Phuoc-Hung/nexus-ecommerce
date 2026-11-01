import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

function getJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET or JWT_SECRET must be configured in production.');
  }
  return 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';
}

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function verifyJwtToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadPart, signature] = parts;

    const candidateSecrets = [
      process.env.JWT_ACCESS_SECRET,
      process.env.JWT_SECRET,
      'nexus_super_secret_jwt_access_key_min_32_chars_local_dev',
      'nexus-dev-secret',
    ].filter(Boolean) as string[];

    let validSignature = false;
    for (const secret of candidateSecrets) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payloadPart}`)
        .digest('base64url');

      if (
        Buffer.from(expectedSignature).length === Buffer.from(signature).length &&
        crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
      ) {
        validSignature = true;
        break;
      }
    }

    if (!validSignature) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    ) as AuthenticatedUser;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!payload.role && Array.isArray(payload.roles) && payload.roles.length > 0) {
      payload.role = payload.roles[0];
    }

    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader
    .toString()
    .replace(/^Bearer\s+/i, '')
    .trim();

  const forwardedUserId = req.headers['x-user-id'];
  const forwardedRole = req.headers['x-user-role'];

  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) {
      (req as AuthenticatedRequest).user = payload;
      return next();
    }
  }

  if (forwardedUserId && typeof forwardedUserId === 'string') {
    (req as AuthenticatedRequest).user = {
      sub: forwardedUserId,
      email: (req.headers['x-user-email'] as string) || '',
      role: (forwardedRole as string) || 'BUYER',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Authentication required. Vui lòng đăng nhập với tài khoản hợp lệ.',
  });
}

export function requireShipmentPermission(
  action: 'VIEW' | 'LIST' | 'UPDATE_STATUS' | 'MANUAL_OVERRIDE',
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    const normalizedRole = (user.role || '').toUpperCase();

    // 1. ADMIN và SUPPORT_STAFF có toàn quyền xem, tìm kiếm, cập nhật trạng thái và can thiệp thủ công vận đơn
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPPORT_STAFF') {
      return next();
    }

    // 2. Đối tác vận chuyển (CARRIER_AGENT) có quyền VIEW, LIST và UPDATE_STATUS
    if (normalizedRole === 'CARRIER_AGENT' || normalizedRole === 'CARRIER') {
      if (action === 'VIEW' || action === 'LIST' || action === 'UPDATE_STATUS') {
        return next();
      }
    }

    // 3. SELLER có quyền VIEW và LIST vận đơn liên quan tới shop của mình
    if (normalizedRole === 'SELLER') {
      if (action === 'VIEW' || action === 'LIST') {
        return next();
      }
    }

    // 4. BUYER có quyền VIEW vận đơn đơn hàng của mình
    if (normalizedRole === 'BUYER') {
      if (action === 'VIEW') {
        return next();
      }
    }

    res.status(403).json({
      success: false,
      error: `Tài khoản với vai trò '${user.role}' không có quyền thực hiện thao tác '${action}' trên vận đơn vận chuyển.`,
    });
  };
}

export function requireInventoryPermission(action: 'VIEW' | 'ADJUST') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Vui lòng đăng nhập.',
      });
      return;
    }

    const normalizedRole = (user.role || '').toUpperCase();

    // 1. ADMIN có toàn quyền tra cứu và điều chỉnh tồn kho
    if (normalizedRole === 'ADMIN') {
      return next();
    }

    // 2. SELLER có quyền tra cứu (VIEW) và điều chỉnh tồn kho hàng hóa (ADJUST)
    if (normalizedRole === 'SELLER') {
      return next();
    }

    // 3. SUPPORT_STAFF có quyền tra cứu tồn kho (VIEW) phục vụ giải quyết khiếu nại khách hàng
    if (normalizedRole === 'SUPPORT_STAFF') {
      if (action === 'VIEW') {
        return next();
      }
    }

    res.status(403).json({
      success: false,
      error: `Tài khoản với vai trò '${user.role}' không có quyền thực hiện thao tác '${action}' trên phân hệ tồn kho.`,
    });
  };
}

export function requireSupportCasePermission(action: 'VIEW' | 'RESOLVE') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Vui lòng đăng nhập.',
      });
      return;
    }

    const normalizedRole = (user.role || '').toUpperCase();

    // SUPPORT_STAFF và ADMIN có toàn quyền xem và giải quyết khiếu nại (SRS 2.3, 3.1.2)
    if (normalizedRole === 'SUPPORT_STAFF' || normalizedRole === 'ADMIN') {
      return next();
    }

    res.status(403).json({
      success: false,
      error: `Tài khoản với vai trò '${user.role}' không có quyền thực hiện '${action}' trên hồ sơ khiếu nại hỗ trợ.`,
    });
  };
}
