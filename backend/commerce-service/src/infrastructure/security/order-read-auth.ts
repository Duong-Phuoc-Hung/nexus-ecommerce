import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth';

function getJwtSecrets(): string[] {
  const configured = [process.env.JWT_ACCESS_SECRET, process.env.JWT_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (configured.length) return [configured[0]];
  if (process.env.NODE_ENV === 'production') return [];
  return ['nexus_super_secret_jwt_access_key_min_32_chars_local_dev'];
}

function verifyJwtToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadPart, signature] = parts;
    const tokenHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (tokenHeader.alg !== 'HS256') return null;

    // Danh sách secret (chỉ chấp nhận dev fallback khi KHÔNG phải production)
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

    const role = payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : undefined);
    if (typeof role !== 'string') return null;
    return { ...payload, role: role.toUpperCase() };
  } catch {
    return null;
  }
}

// Bắt buộc đăng nhập với JWT hợp lệ (chống giả mạo header x-user-id / x-user-role)
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader
    .toString()
    .replace(/^Bearer\s+/i, '')
    .trim();

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Vui lòng đăng nhập với tài khoản hợp lệ.',
    });
    return;
  }

  const payload = verifyJwtToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Token xác thực không hợp lệ hoặc đã hết hạn.',
    });
    return;
  }

  (req as AuthenticatedRequest).user = payload;
  return next();
}
