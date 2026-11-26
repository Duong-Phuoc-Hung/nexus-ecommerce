import { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import { InvalidTokenException } from '../../domain/exceptions/InvalidTokenException';
import { authTokenStore } from './AuthTokenStore';
import { JwtPayload, verifyJwtToken } from './auth';

export type AuthenticatedUser = JwtPayload & {
  permissions: string[];
};

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

let permissionPool: Pool | undefined;
const rolePermCache = new Map<string, { permissions: string[]; expiresAtMs: number }>();
const ROLE_PERM_CACHE_TTL_MS = 15_000;

export function attachPermissionPool(pool?: Pool): void {
  permissionPool = pool;
  rolePermCache.clear();
}

export function invalidateRolePermissionsCache(roleCode?: string): void {
  if (roleCode) {
    rolePermCache.delete(roleCode.trim().toUpperCase());
  } else {
    rolePermCache.clear();
  }
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  BUYER: [
    'AUTH.LOGIN',
    'AUTH.LOGOUT',
    'PROFILE.VIEW',
    'PROFILE.UPDATE',
    'PROFILE.CHANGE_PASSWORD',
    'PROFILE.RESET_PASSWORD',
    'PRODUCT.VIEW',
    'PRODUCT.LIST',
    'PRODUCT.SEARCH',
    'CATEGORY.VIEW',
    'CATEGORY.LIST',
    'CART.CREATE',
    'CART.UPDATE',
    'CART.REMOVE_ITEM',
    'CART.VIEW',
    'CHECKOUT.START',
    'ORDER.CREATE',
    'ORDER.CANCEL',
    'ORDER.VIEW',
    'ORDER.LIST',
    'AUCTION.VIEW',
    'AUCTION.LIST',
    'AUCTION.BID',
    'AUCTION.VIEW_BID_HISTORY',
    'SHIPPING.QUOTE',
    'SHIPPING.VIEW_SHIPMENT',
    'REPUTATION.VIEW',
    'REPUTATION.RATE',
    'NOTIFICATION.VIEW',
    'NOTIFICATION.MANAGE_PREFERENCE',
    'SELLER_APPLICATION.SUBMIT',
    'SELLER_APPLICATION.VIEW_OWN',
    'SELLER_APPLICATION.ACTIVATE',
  ],
  SELLER: [
    'REPUTATION.VIEW',
    'AUTH.LOGIN',
    'AUTH.LOGOUT',
    'PROFILE.VIEW',
    'PROFILE.UPDATE',
    'PROFILE.CHANGE_PASSWORD',
    'PRODUCT.VIEW',
    'PRODUCT.CREATE',
    'PRODUCT.UPDATE',
    'AUCTION.CREATE',
    'AUCTION.UPDATE',
    'ORDER.VIEW',
    'ORDER.LIST',
    'NOTIFICATION.VIEW',
    'SELLER_APPLICATION.VIEW_OWN',
  ],
  ADMIN: [
    'AUTH.LOGIN',
    'AUTH.LOGOUT',
    'PROFILE.VIEW',
    'PROFILE.UPDATE',
    'PROFILE.CHANGE_PASSWORD',
    'PROFILE.RESET_PASSWORD',
    'USER.CREATE',
    'USER.UPDATE',
    'USER.DELETE',
    'USER.VIEW',
    'USER.LIST',
    'USER.CHANGE_PASSWORD',
    'USER.REPUTATION.VIEW',
    'USER.REPUTATION.ADJUST',
    'ROLE.CREATE',
    'ROLE.UPDATE',
    'ROLE.DELETE',
    'ROLE.VIEW',
    'ROLE.LIST',
    'SELLER_APPLICATION.VIEW',
    'SELLER_APPLICATION.REVIEW',
    'SELLER_APPLICATION.REVOKE',
    'SYSTEM.CONFIG.VIEW',
    'SYSTEM.CONFIG.UPDATE',
    'SYSTEM.HEALTH.VIEW',
    'EVENT_LOG.VIEW',
    'EVENT_LOG.VIEW_DETAIL',
    'AUDIT_LOG.VIEW',
    'AUCTION.ADMIN_CANCEL',
    'AUCTION.SETTLE',
    'PRODUCT.CREATE',
    'PRODUCT.UPDATE',
    'PRODUCT.DELETE',
    'PRODUCT.VIEW',
    'PRODUCT.LIST',
    'PRODUCT.SEARCH',
    'CATEGORY.CREATE',
    'CATEGORY.UPDATE',
    'CATEGORY.DELETE',
    'CATEGORY.VIEW',
    'CATEGORY.LIST',
    'ORDER.CANCEL',
    'ORDER.VIEW',
    'ORDER.LIST',
    'ORDER.REFUND',
    'AUCTION.CREATE',
    'AUCTION.UPDATE',
    'AUCTION.CANCEL',
    'AUCTION.ADMIN_CANCEL',
    'AUCTION.VIEW',
    'AUCTION.LIST',
    'AUCTION.VIEW_BID_HISTORY',
    'SHIPPING.QUOTE',
    'SHIPPING.CREATE_SHIPMENT',
    'SHIPPING.VIEW_SHIPMENT',
    'SHIPPING.UPDATE_STATUS',
    'SHIPPING.MANUAL_OVERRIDE',
    'REPUTATION.VIEW',
    'REPUTATION.PENALTY.VIEW',
    'REPUTATION.PENALTY.APPLY',
    'NOTIFICATION.VIEW',
    'EVENT_LOG.VIEW',
    'EVENT_LOG.VIEW_DETAIL',
    'AUDIT_LOG.VIEW',
    'SYSTEM.CONFIG.VIEW',
    'SYSTEM.CONFIG.UPDATE',
    'SYSTEM.HEALTH.VIEW',
    'SELLER_APPLICATION.VIEW',
    'SELLER_APPLICATION.REVIEW',
    'SELLER_APPLICATION.REVOKE',
  ],
  SUPPORT_STAFF: [
    'AUTH.LOGIN',
    'AUTH.LOGOUT',
    'PROFILE.VIEW',
    'PROFILE.UPDATE',
    'PROFILE.CHANGE_PASSWORD',
    'PROFILE.RESET_PASSWORD',
    'USER.UPDATE',
    'USER.VIEW',
    'USER.LIST',
    'USER.REPUTATION.VIEW',
    'ROLE.VIEW',
    'ROLE.LIST',
    'PRODUCT.VIEW',
    'PRODUCT.LIST',
    'PRODUCT.SEARCH',
    'CATEGORY.VIEW',
    'CATEGORY.LIST',
    'ORDER.CANCEL',
    'ORDER.VIEW',
    'ORDER.LIST',
    'ORDER.REFUND',
    'AUCTION.VIEW',
    'AUCTION.LIST',
    'AUCTION.VIEW_BID_HISTORY',
    'SHIPPING.QUOTE',
    'SHIPPING.CREATE_SHIPMENT',
    'SHIPPING.VIEW_SHIPMENT',
    'SHIPPING.UPDATE_STATUS',
    'SHIPPING.MANUAL_OVERRIDE',
    'REPUTATION.VIEW',
    'REPUTATION.PENALTY.VIEW',
    'NOTIFICATION.VIEW',
    'EVENT_LOG.VIEW',
    'EVENT_LOG.VIEW_DETAIL',
    'SYSTEM.HEALTH.VIEW',
  ],
};

export function getRolePermissions(role?: string): string[] {
  const normalizedRole = (role ?? '').toUpperCase();
  return ROLE_PERMISSIONS[normalizedRole] ?? [];
}

export async function resolveRolePermissionsAsync(role?: string): Promise<string[]> {
  const normalizedRole = (role ?? '').trim().toUpperCase();
  if (!normalizedRole) return [];

  if (!permissionPool) {
    return ROLE_PERMISSIONS[normalizedRole] ?? [];
  }

  const cached = rolePermCache.get(normalizedRole);
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.permissions;
  }

  try {
    const res = await permissionPool.query(
      `SELECT COALESCE(ARRAY_AGG(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), ARRAY[]::text[]) AS permissions
       FROM user_roles r
       LEFT JOIN user_role_privileges urp ON urp.role_id = r.id
       LEFT JOIN user_privileges p ON p.id = urp.privilege_id
       WHERE UPPER(r.role_code) = $1
       GROUP BY r.id`,
      [normalizedRole],
    );
    if (res.rows.length > 0 && Array.isArray(res.rows[0].permissions)) {
      const dbPerms = res.rows[0].permissions.map((c: unknown) => String(c));
      {
        rolePermCache.set(normalizedRole, {
          permissions: dbPerms,
          expiresAtMs: Date.now() + ROLE_PERM_CACHE_TTL_MS,
        });
        return dbPerms;
      }
    }
  } catch (error) {
    throw error;
  }
  return [];
}

export function hasPermission(role: string | undefined, permission: string): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

export function verifiedAdmin(req: Request): boolean {
  const token = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return Boolean(
    token && !authTokenStore.isRevoked(token) && verifyJwtToken(token, true)?.role === 'ADMIN',
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader
    .toString()
    .replace(/^Bearer\s+/i, '')
    .trim();

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
    return;
  }

  const payload = verifyJwtToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: new InvalidTokenException().message,
    });
    return;
  }

  if (authTokenStore.isRevoked(token, payload)) {
    res.status(401).json({
      success: false,
      error: 'Token has been revoked.',
    });
    return;
  }

  const finishAuth = (resolvedPermissions?: string[]) => {
    const request = req as AuthenticatedRequest;
    request.user = {
      ...payload,
      permissions: resolvedPermissions ?? payload.permissions ?? getRolePermissions(payload.role),
    };
    next();
  };

  if (authTokenStore.hasPersistentPool() || permissionPool) {
    void Promise.all([
      authTokenStore.hasPersistentPool()
        ? authTokenStore.isRevokedAsync(token, payload)
        : Promise.resolve(false),
      permissionPool ? resolveRolePermissionsAsync(payload.role) : Promise.resolve(undefined),
    ])
      .then(([revoked, dynamicPerms]) => {
        if (revoked) {
          res.status(401).json({
            success: false,
            error: 'Token has been revoked.',
          });
          return;
        }
        finishAuth(dynamicPerms);
      })
      .catch(() => {
        res.status(503).json({
          success: false,
          error: 'Session verification unavailable.',
        });
      });
    return;
  }

  finishAuth();
}

export function requirePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const request = req as AuthenticatedRequest;
    const user = request.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    const granted = permissionPool
      ? user.permissions.includes(requiredPermission)
      : hasPermission(user.role, requiredPermission) ||
        user.permissions.includes(requiredPermission);

    if (!granted) {
      res.status(403).json({
        success: false,
        error: `Forbidden: missing permission "${requiredPermission}".`,
      });
      return;
    }

    next();
  };
}
