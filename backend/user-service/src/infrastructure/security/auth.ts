import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_TTL_SECONDS = 60 * 60 * 8;

function getJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return 'nexus_super_secret_jwt_access_key_min_32_chars_local_dev';
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions?: string[];
  iat: number;
  iatMs?: number;
  exp: number;
}

export function hashPassword(password: string): string {
  // Mặc định băm bằng BCrypt 10 rounds chuẩn bảo mật công nghiệp
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  if (!password || !passwordHash) {
    return false;
  }

  // 1. Hỗ trợ chuẩn BCrypt ($2a$, $2b$) tương thích tuyệt đối với PostgreSQL demo seed accounts
  if (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(password, passwordHash);
    } catch {
      return false;
    }
  }

  // 2. Hỗ trợ chuẩn PBKDF2 (salt:hash)
  if (passwordHash.includes(':')) {
    const [salt, storedHash] = passwordHash.split(':');
    if (!salt || !storedHash) return false;

    const candidate = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
    } catch {
      return false;
    }
  }

  return false;
}

export function createJwtToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iatMs'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

  const nowMs = Date.now();
  const now = Math.floor(nowMs / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      iatMs: nowMs,
      exp: now + JWT_TTL_SECONDS,
    }),
  ).toString('base64url');

  const signingInput = `${header}.${body}`;
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

export function verifyJwtToken(token: string, _strict = true): JwtPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    const subject = decoded.sub || decoded.userId;
    if (
      decoded.type === 'refresh' ||
      (_strict && typeof decoded.sub !== 'string') ||
      typeof subject !== 'string' ||
      !subject.trim() ||
      !Number.isFinite(decoded.exp) ||
      decoded.exp! <= Date.now() / 1000
    ) {
      return null;
    }
    const role =
      decoded.role ||
      (Array.isArray(decoded.roles) && decoded.roles.length > 0 ? decoded.roles[0] : 'BUYER');
    return {
      sub: subject,
      email: decoded.email || '',
      role,
      permissions: decoded.privileges || decoded.permissions,
      iat: Number(decoded.iat) || Math.floor(Date.now() / 1000),
      iatMs:
        typeof decoded.iatMs === 'number' && Number.isFinite(decoded.iatMs)
          ? decoded.iatMs
          : undefined,
      exp: decoded.exp!,
    };
  } catch {
    return null;
  }
}

/**
 * Sinh chuỗi UUID v7 chuẩn RFC 9562 (Time-ordered UUID)
 * - 48 bit đầu: Unix timestamp theo mili-giây (sắp xếp được theo thời gian)
 * - Version 7 (0b0111) & Variant 1 (0b10)
 */
export function generateUuidV7(): string {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');
  const rand = crypto.randomBytes(10);
  rand[0] = (rand[0] & 0x0f) | 0x70;
  rand[2] = (rand[2] & 0x3f) | 0x80;
  const randHex = rand.toString('hex');
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-${randHex.slice(0, 4)}-${randHex.slice(4, 8)}-${randHex.slice(8, 20)}`;
}
