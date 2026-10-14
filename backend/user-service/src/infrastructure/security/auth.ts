import crypto from 'node:crypto';

const JWT_TTL_SECONDS = 60 * 60 * 8;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return 'nexus-dev-secret';
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions?: string[];
  iat: number;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  if (!passwordHash || !passwordHash.includes(':')) {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(':');
  if (!salt || !storedHash) return false;

  const candidate = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

export function createJwtToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
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

export function verifyJwtToken(token: string): JwtPayload | null {
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
    ) as JwtPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
