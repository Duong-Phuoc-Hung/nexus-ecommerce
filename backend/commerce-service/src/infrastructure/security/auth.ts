import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { extractServiceToken, NexusServiceId, ServiceTokenClaims } from './internal-service-auth';

function getJwtSecrets(): string[] {
  const configured = [process.env.JWT_ACCESS_SECRET, process.env.JWT_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (configured.length) return [configured[0]];
  if (process.env.NODE_ENV === 'production') return [];
  return ['nexus_super_secret_jwt_access_key_min_32_chars_local_dev'];
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
  serviceAuth?: ServiceTokenClaims;
}

export function verifyJwtToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadPart, signature] = parts;
    const tokenHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (tokenHeader.alg !== 'HS256') return null;

    // Danh sách secret dự phòng (Access secret, Secret chung, Dev fallback)
    const candidateSecrets = getJwtSecrets();

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

    if (
      typeof payload.sub !== 'string' ||
      !payload.sub.trim() ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() / 1000
    ) {
      return null;
    }

    // Chuẩn hóa role từ roles array nếu cần
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

  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) {
      (req as AuthenticatedRequest).user = payload;
      return next();
    }
  }

  res.status(401).json({
    success: false,
    error: 'Authentication required. Vui lòng đăng nhập với tài khoản hợp lệ.',
  });
}

/**
 * Cho phép HOẶC user JWT hợp lệ (tiếp tục kiểm tra quyền user ở middleware sau),
 * HOẶC scoped S2S JWT có đúng audience/scope/issuer/resource.
 * Tuyệt đối KHÔNG ánh xạ service credential thành ADMIN hay SUPPORT_STAFF.
 */
export function requireAuthOrScopedService(options: {
  requiredScope: string | string[];
  allowedIssuers: NexusServiceId[];
  resourceResolver?: (req: Request) => string | undefined;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const expectedResource = options.resourceResolver ? options.resourceResolver(req) : undefined;
    const svc = extractServiceToken(req, {
      expectedAudience: 'commerce-service',
      requiredScope: options.requiredScope,
      allowedIssuers: options.allowedIssuers,
      expectedResource,
    });
    if (svc) {
      (req as AuthenticatedRequest).serviceAuth = svc;
      return next();
    }
    requireAuth(req, res, next);
  };
}

export function requireScopedServiceOnly(options: {
  requiredScope: string | string[];
  allowedIssuers: NexusServiceId[];
  resourceResolver?: (req: Request) => string | undefined;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const expectedResource = options.resourceResolver ? options.resourceResolver(req) : undefined;
    const svc = extractServiceToken(req, {
      expectedAudience: 'commerce-service',
      requiredScope: options.requiredScope,
      allowedIssuers: options.allowedIssuers,
      expectedResource,
    });
    if (!svc) {
      res.status(401).json({
        success: false,
        error: 'Valid scoped service credential required.',
      });
      return;
    }
    (req as AuthenticatedRequest).serviceAuth = svc;
    next();
  };
}

export function requireOrderPermission(
  action:
    | 'VIEW'
    | 'LIST'
    | 'CANCEL'
    | 'REFUND'
    | 'DISPATCH'
    | 'REQUEST_REFUND'
    | 'UPDATE_STATUS'
    | 'CONFIRM_RECEIPT',
) {
  const actionScopeMap: Record<string, string[]> = {
    LIST: ['order:eligibility:read'],
    REFUND: ['order:refund:execute', 'order:refund:cancel'],
    REQUEST_REFUND: ['order:refund:request'],
    UPDATE_STATUS: ['order:status:sync'],
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.serviceAuth) {
      const allowedScopes = actionScopeMap[action] || [];
      if (allowedScopes.includes(authReq.serviceAuth.scope)) {
        return next();
      }
      res.status(403).json({
        success: false,
        error: `Service scope '${authReq.serviceAuth.scope}' is not authorized for order action '${action}'.`,
      });
      return;
    }

    const user = authReq.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    const normalizedRole = (user.role || '').toUpperCase();

    // 1. ADMIN và SUPPORT_STAFF có toàn quyền xem, tìm kiếm, hủy đơn, bàn giao, cập nhật trạng thái và hoàn tiền khiếu nại
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPPORT_STAFF') {
      return next();
    }

    // 2. SELLER có quyền VIEW, LIST, DISPATCH và UPDATE_STATUS đơn hàng của gian hàng mình
    if (normalizedRole === 'SELLER') {
      if (
        action === 'VIEW' ||
        action === 'LIST' ||
        action === 'DISPATCH' ||
        action === 'UPDATE_STATUS'
      ) {
        return next();
      }
    }

    // 3. BUYER có quyền VIEW, LIST, CANCEL, REQUEST_REFUND và CONFIRM_RECEIPT đơn hàng của chính mình (OrderController đã ép buộc buyerId = user.sub chống IDOR)
    if (normalizedRole === 'BUYER') {
      if (
        action === 'VIEW' ||
        action === 'LIST' ||
        action === 'CANCEL' ||
        action === 'REQUEST_REFUND' ||
        action === 'CONFIRM_RECEIPT'
      ) {
        return next();
      }
    }

    res.status(403).json({
      success: false,
      error: `Tài khoản với vai trò '${user.role}' không có quyền thực hiện thao tác '${action}' trên đơn hàng.`,
    });
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Vui lòng đăng nhập với tài khoản hợp lệ.',
    });
    return;
  }

  const role = (user.role || '').toUpperCase();
  if (role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error:
        'Quyền truy cập bị từ chối. Chỉ tài khoản với vai trò ADMIN mới có quyền thực hiện thao tác này.',
    });
    return;
  }

  next();
}
