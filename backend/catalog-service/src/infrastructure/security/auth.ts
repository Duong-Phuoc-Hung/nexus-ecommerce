import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return 'nexus-dev-secret';
}

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
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
    const expectedSignature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${payloadPart}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    ) as AuthenticatedUser;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
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

  // Also support gateway header forwarding if proxy enriches x-user-id / x-user-role
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

export function requireProductPermission(action: 'CREATE' | 'UPDATE' | 'DELETE') {
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

    // ADMIN có mọi quyền
    if (normalizedRole === 'ADMIN') {
      return next();
    }

    // SELLER có quyền CREATE và UPDATE sản phẩm
    if (normalizedRole === 'SELLER') {
      if (action === 'CREATE' || action === 'UPDATE') {
        return next();
      }
    }

    // BUYER hoặc các role khác không có quyền
    res.status(403).json({
      success: false,
      error: `Tài khoản với vai trò '${user.role}' không có quyền thực hiện thao tác '${action}' trên sản phẩm.`,
    });
  };
}
