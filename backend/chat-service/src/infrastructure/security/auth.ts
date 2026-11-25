import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedUser {
  sub: string;
  role: string;
  email?: string;
  fullName?: string;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function getCandidateJwtSecrets(): string[] {
  const envSecrets = [process.env.JWT_ACCESS_SECRET, process.env.JWT_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (envSecrets.length) return [envSecrets[0]];
  if (process.env.NODE_ENV === 'production') throw new Error('Missing JWT access secret');
  return ['nexus_super_secret_jwt_access_key_min_32_chars_local_dev'];
}

export function verifyHs256Signature(
  headerB64: string,
  payloadB64: string,
  signatureB64: string,
): boolean {
  const actual = Buffer.from(signatureB64, 'base64url');
  return getCandidateJwtSecrets().some((secret) => {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  });
}

export function verifyJwtToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256') return null;
    if (!verifyHs256Signature(headerB64, payloadB64, signatureB64)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Date.now() / 1000;
    if (
      !Number.isFinite(payload.exp) ||
      payload.exp <= now ||
      (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf > now))
    )
      return null;
    const sub = payload.sub || payload.userId;
    if (typeof sub !== 'string' || !sub.trim()) return null;
    const roles = (Array.isArray(payload.roles) ? payload.roles : [payload.role])
      .filter((role: unknown): role is string => typeof role === 'string')
      .map((role: string) => role.toUpperCase());
    const role = ['ADMIN', 'SUPPORT_STAFF', 'SELLER', 'BUYER'].find((item) => roles.includes(item));
    if (!role) return null;
    return { sub, role, exp: payload.exp, email: payload.email, fullName: payload.fullName };
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
    error: 'Authentication required. Vui lòng đăng nhập với Bearer token hợp lệ.',
  });
}
