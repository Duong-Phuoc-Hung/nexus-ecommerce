import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

function getJwtSecrets(): string[] {
  const configured = [process.env.JWT_ACCESS_SECRET, process.env.JWT_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (configured.length) return [configured[0]];
  if (process.env.NODE_ENV === 'production') return [];
  return ['nexus_super_secret_jwt_access_key_min_32_chars_local_dev'];
}

// Xác thực chữ ký và tính hợp lệ của JWT token
export function verifyJwtToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadPart, signature] = parts;
    if (JSON.parse(Buffer.from(header, 'base64url').toString()).alg !== 'HS256') return null;
    const secrets = getJwtSecrets();

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
    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    const userId = payload.sub || payload.userId || payload.id;
    if (typeof userId !== 'string' || !userId.trim()) return null;
    const role = payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : 'BUYER');

    return {
      id: String(userId),
      email: payload.email || '',
      role: String(role).toUpperCase(),
      permissions: Array.isArray(payload.privileges)
        ? payload.privileges
        : Array.isArray(payload.permissions)
          ? payload.permissions
          : [],
      fullName: payload.fullName || payload.name || 'Nexus User',
    };
  } catch {
    return null;
  }
}

// Bắt buộc đăng nhập với JWT token hợp lệ (từ chối header giả mạo x-user-id / x-user-role)
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Vui lòng đăng nhập để thực hiện thao tác này.',
    });
    return;
  }

  const user = verifyJwtToken(token);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Token xác thực không hợp lệ hoặc đã hết hạn.',
    });
    return;
  }

  (req as AuthenticatedRequest).user = user;
  return next();
}

// Phân quyền dừng khẩn cấp / hủy phiên: ADMIN, SUPPORT_STAFF hoặc SELLER (chủ phiên)
export function requireSettlementPermission(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (user?.role === 'ADMIN' && user.permissions?.includes('AUCTION.SETTLE')) {
    next();
    return;
  }
  res.status(403).json({ success: false, error: 'Thiếu quyền chốt phiên đấu giá.' });
}

export function requireAuctionCancel(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' });
    return;
  }

  if (user.role === 'SELLER' || user.role === 'ADMIN' || user.role === 'SUPPORT_STAFF') {
    return next();
  }

  res.status(403).json({
    success: false,
    error: `Tài khoản với vai trò '${user.role}' không có quyền hủy hoặc dừng khẩn cấp phiên đấu giá.`,
  });
}

// Phân quyền dừng khẩn cấp phiên đấu giá: Chỉ ADMIN hoặc SUPPORT_STAFF (SELLER tuyệt đối không có quyền)
export function requireAdminOrSupportStaff(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' });
    return;
  }

  if (user.role === 'ADMIN' || user.role === 'SUPPORT_STAFF') {
    return next();
  }

  res.status(403).json({
    success: false,
    error: `Tài khoản với vai trò '${user.role}' không có quyền dừng khẩn cấp phiên đấu giá. Chỉ ADMIN hoặc SUPPORT_STAFF mới có quyền thực hiện.`,
  });
}

// Đọc thông tin user tùy chọn nếu có token JWT hợp lệ
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const user = verifyJwtToken(token);
    if (user) {
      (req as AuthenticatedRequest).user = user;
    }
  }
  next();
}
