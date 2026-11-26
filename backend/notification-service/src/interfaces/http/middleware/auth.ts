import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { extractServiceToken } from './internal-service-auth';

export interface NotificationAuthUser {
  sub: string;
  email?: string;
  role: string;
  roles: string[];
  permissions: string[];
}

export type AuthRequest = Request & { user?: NotificationAuthUser };

const ADMIN_ROLES = new Set(['ADMIN', 'SUPPORT_STAFF']);

function getCandidateSecrets(): string[] {
  const configured = [process.env.JWT_ACCESS_SECRET, process.env.JWT_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (configured.length) return [configured[0]];
  if (process.env.NODE_ENV === 'production') return [];
  return ['nexus_super_secret_jwt_access_key_min_32_chars_local_dev'];
}

export function verifyBearerToken(
  authHeader?: string,
  secrets = getCandidateSecrets(),
): NotificationAuthUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signature] = parts;
  let validSignature = false;
  for (const secret of secrets) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${headerPart}.${payloadPart}`)
      .digest('base64url');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      validSignature = true;
      break;
    }
  }
  if (!validSignature) return null;

  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256') return null;
    const decoded = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (!Number.isFinite(decoded?.exp) || decoded.exp <= Date.now() / 1000) {
      return null;
    }
    const sub = decoded?.sub || decoded?.userId || decoded?.id;
    if (typeof sub !== 'string' || !sub.trim()) return null;

    const roles: string[] = Array.isArray(decoded?.roles)
      ? decoded.roles.map((r: unknown) => String(r).toUpperCase())
      : decoded?.role
        ? [String(decoded.role).toUpperCase()]
        : ['BUYER'];
    const primaryRole = roles[0] || 'BUYER';
    const permissions: string[] = Array.isArray(decoded?.permissions)
      ? decoded.permissions.map(String)
      : Array.isArray(decoded?.privileges)
        ? decoded.privileges.map(String)
        : [];

    return {
      sub,
      email: typeof decoded?.email === 'string' ? decoded.email : undefined,
      role: primaryRole,
      roles,
      permissions,
    };
  } catch {
    return null;
  }
}

export function isStaffOrAdmin(user?: NotificationAuthUser): boolean {
  if (!user) return false;
  return ADMIN_ROLES.has(user.role) || user.roles.some((r) => ADMIN_ROLES.has(r));
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
    return;
  }
  (req as AuthRequest).user = user;
  next();
}

export function requireEventLogPermission(permission: 'EVENT_LOG.VIEW' | 'EVENT_LOG.VIEW_DETAIL') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }
    const allowed =
      isStaffOrAdmin(user) ||
      user.permissions.includes(permission) ||
      user.permissions.includes('EVENT_LOG.VIEW');

    if (!allowed) {
      res.status(403).json({
        success: false,
        error: `Forbidden: missing permission "${permission}".`,
      });
      return;
    }
    next();
  };
}

export function isInternalServiceRequest(
  req: Request,
  requiredScope: 'notification:dispatch' | 'event-log:record' = 'notification:dispatch',
): boolean {
  const svc = extractServiceToken(req, {
    expectedAudience: 'notification-service',
    requiredScope,
    allowedIssuers: [
      'commerce-service',
      'fulfillment-service',
      'user-service',
      'auction-service',
      'chat-service',
    ],
  });
  if (svc) {
    return true;
  }

  // Fallback chỉ cho phép khi môi trường chủ động cấu hình INTERNAL_SERVICE_SECRET (không dùng default trong production)
  const configured = process.env.INTERNAL_SERVICE_SECRET?.trim();
  const expected =
    configured || (process.env.NODE_ENV === 'production' ? '' : 'nexus-internal-service-key');
  const provided =
    req.headers['x-internal-service-key'] || req.headers['x-internal-service-secret'];
  if (expected && typeof provided === 'string' && provided.length === expected.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}
