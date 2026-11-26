import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

function getJwtSecrets(): string[] {
  return [
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_SECRET,
    'nexus_super_secret_jwt_access_key_min_32_chars_local_dev',
    'nexus-dev-secret',
  ].filter(Boolean) as string[];
}

export function verifyJwtToken(token: string, strict = false): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadPart, signature] = parts;
    const configuredSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const secrets = strict
      ? configuredSecret
        ? [configuredSecret]
        : process.env.NODE_ENV === 'production'
          ? []
          : ['nexus_super_secret_jwt_access_key_min_32_chars_local_dev']
      : getJwtSecrets();

    let isValid = false;
    for (const secret of secrets) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payloadPart}`)
        .digest('base64url');

      if (
        Buffer.from(expectedSignature).length === Buffer.from(signature).length &&
        crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
      ) {
        isValid = true;
        break;
      }
    }

    if (!isValid) return null;

    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token hết hạn
    }

    const userId = payload.sub || payload.userId || payload.id;
    const roles = Array.isArray(payload.roles)
      ? payload.roles
          .filter((role: unknown): role is string => typeof role === 'string')
          .map((role: string) => role.toUpperCase())
      : [];
    if (
      strict &&
      (typeof payload.sub !== 'string' ||
        !payload.sub.trim() ||
        !Number.isFinite(payload.exp) ||
        payload.exp <= Math.floor(Date.now() / 1000))
    ) {
      return null;
    }
    const role = payload.role || roles[0] || 'BUYER';

    return {
      id: String(userId),
      email: payload.email || '',
      role: String(role).toUpperCase(),
      roles,
      fullName: payload.fullName || payload.name || 'Nexus Seller',
    };
  } catch {
    return null;
  }
}

export function verifiedAccessUser(req: Request): AuthenticatedUser | null {
  const token = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return token ? verifyJwtToken(token, true) : null;
}

export function requireModerationAuth(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = verifiedAccessUser(req);
    if (!user) {
      res
        .status(401)
        .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' } });
      return;
    }
    if (!allowed.includes(user.role) && !user.roles?.some((role) => allowed.includes(role))) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện thao tác này.' },
      });
      return;
    }
    (req as AuthenticatedRequest).user = user;
    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 1. Kiểm tra qua JWT Token
  if (token) {
    const user = verifyJwtToken(token);
    if (user) {
      (req as AuthenticatedRequest).user = user;
      return next();
    }
  }

  // 2. Dự phòng: Đọc header chuyển tiếp từ API Gateway (x-user-id, x-user-role)
  const forwardedId = req.headers['x-user-id'];
  const forwardedRole = req.headers['x-user-role'];
  if (forwardedId && typeof forwardedId === 'string') {
    (req as AuthenticatedRequest).user = {
      id: forwardedId,
      email: (req.headers['x-user-email'] as string) || '',
      role: ((forwardedRole as string) || 'BUYER').toUpperCase(),
      fullName: (req.headers['x-user-name'] as string) || 'Nexus Seller',
    };
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Vui lòng đăng nhập tài khoản Seller để thực hiện thao tác này.',
  });
}

export function requireSellerOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' });
    return;
  }

  if (user.role === 'SELLER' || user.role === 'ADMIN') {
    return next();
  }

  res.status(403).json({
    success: false,
    error: `Tài khoản với vai trò '${user.role}' không có quyền đăng bán sản phẩm. Cần quyền SELLER hoặc ADMIN.`,
  });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const user = verifyJwtToken(token);
    if (user) {
      (req as AuthenticatedRequest).user = user;
      return next();
    }
  }
  const forwardedId = req.headers['x-user-id'];
  const forwardedRole = req.headers['x-user-role'];
  if (forwardedId && typeof forwardedId === 'string') {
    (req as AuthenticatedRequest).user = {
      id: forwardedId,
      email: (req.headers['x-user-email'] as string) || '',
      role: ((forwardedRole as string) || 'BUYER').toUpperCase(),
      fullName: (req.headers['x-user-name'] as string) || 'Nexus Seller',
    };
  }
  next();
}
