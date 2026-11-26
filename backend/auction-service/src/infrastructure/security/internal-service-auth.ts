import crypto from 'node:crypto';
import type { Request } from 'express';

export type NexusServiceId =
  | 'user-service'
  | 'catalog-service'
  | 'commerce-service'
  | 'auction-service'
  | 'fulfillment-service'
  | 'notification-service'
  | 'chat-service';

export interface ServiceActorClaim {
  sub: string;
  role: string;
}

export interface ServiceTokenClaims {
  typ: 'nexus-s2s';
  iss: NexusServiceId;
  aud: NexusServiceId;
  sub: string;
  scope: string;
  res?: string;
  act?: ServiceActorClaim;
  jti: string;
  iat: number;
  exp: number;
}

export const SERVICE_AUTH_HEADER = 'x-service-authorization';
const MAX_TTL_SECONDS = 120;
const DEFAULT_TTL_SECONDS = 60;
function resolveS2SSecret(): string | null {
  return (
    process.env.INTERNAL_SERVICE_JWT_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'nexus-internal-service-s2s-secret-key-32chars' : null)
  );
}

export function signServiceToken(params: {
  issuer: NexusServiceId;
  audience: NexusServiceId;
  scope: string;
  resource?: string;
  actor?: ServiceActorClaim;
  ttlSeconds?: number;
}): string {
  const secret = resolveS2SSecret();
  if (!secret) {
    throw new Error(
      'INTERNAL_SERVICE_JWT_SECRET is required in production for S2S authentication.',
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.min(Math.max(1, params.ttlSeconds ?? DEFAULT_TTL_SECONDS), MAX_TTL_SECONDS);

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const claims: ServiceTokenClaims = {
    typ: 'nexus-s2s',
    iss: params.issuer,
    aud: params.audience,
    sub: `svc:${params.issuer}`,
    scope: params.scope,
    ...(params.resource ? { res: params.resource } : {}),
    ...(params.actor ? { act: params.actor } : {}),
    jti: crypto.randomBytes(12).toString('hex'),
    iat: now,
    exp: now + ttl,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function buildServiceAuthHeader(params: {
  issuer: NexusServiceId;
  audience: NexusServiceId;
  scope: string;
  resource?: string;
  actor?: ServiceActorClaim;
  ttlSeconds?: number;
}): Record<string, string> {
  return {
    [SERVICE_AUTH_HEADER]: `Bearer ${signServiceToken(params)}`,
  };
}

export interface VerifyServiceTokenOptions {
  expectedAudience: NexusServiceId;
  requiredScope: string | string[];
  allowedIssuers?: NexusServiceId[];
  expectedResource?: string;
}

export function verifyServiceToken(
  rawHeader: string | string[] | undefined,
  options: VerifyServiceTokenOptions,
): ServiceTokenClaims | null {
  const secret = resolveS2SSecret();
  if (!secret) return null;

  const headerVal = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!headerVal || typeof headerVal !== 'string') return null;

  const token = headerVal.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const [headerPart, payloadPart, sigPart] = parts;
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as {
      alg?: string;
    };
    if (header.alg !== 'HS256') return null;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerPart}.${payloadPart}`)
      .digest('base64url');
    const a = Buffer.from(sigPart);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const claims = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    ) as ServiceTokenClaims;

    const now = Math.floor(Date.now() / 1000);
    if (claims.typ !== 'nexus-s2s') return null;
    if (!claims.iss || !claims.aud || !claims.scope || !claims.jti) return null;
    if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp)) return null;
    if (claims.exp <= now || claims.exp - claims.iat > MAX_TTL_SECONDS) return null;
    if (claims.aud !== options.expectedAudience) return null;

    const scopes = Array.isArray(options.requiredScope)
      ? options.requiredScope
      : [options.requiredScope];
    if (!scopes.includes(claims.scope)) return null;

    if (options.allowedIssuers && !options.allowedIssuers.includes(claims.iss)) {
      return null;
    }
    if (options.expectedResource !== undefined) {
      if (!claims.res || claims.res !== options.expectedResource) {
        return null;
      }
    }

    return claims;
  } catch {
    return null;
  }
}

export function extractServiceToken(
  req: Request,
  options: VerifyServiceTokenOptions,
): ServiceTokenClaims | null {
  return verifyServiceToken(req.headers[SERVICE_AUTH_HEADER], options);
}
