import { NextFunction, Request, Response } from 'express';
import { InvalidTokenException } from '../../domain/exceptions/InvalidTokenException';
import { authTokenStore } from './AuthTokenStore';
import { JwtPayload, verifyJwtToken } from './auth';

export type AuthenticatedUser = JwtPayload & {
  permissions: string[];
};

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  BUYER: [
    'AUTH.LOGIN',
    'AUTH.LOGOUT',
    'PROFILE.VIEW',
    'PROFILE.UPDATE',
    'PROFILE.CHANGE_PASSWORD',
    'PROFILE.RESET_PASSWORD',
    'CART.VIEW',
    'CHECKOUT.START',
    'ORDER.VIEW',
    'ORDER.CREATE',
    'AUCTION.VIEW',
    'AUCTION.BID',
    'NOTIFICATION.VIEW',
  ],
  SELLER: [
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
  ],
  ADMIN: [
    'AUTH.LOGIN',
    'AUTH.LOGOUT',
    'PROFILE.VIEW',
    'PROFILE.UPDATE',
    'PROFILE.CHANGE_PASSWORD',
    'USER.CREATE',
    'USER.UPDATE',
    'USER.DELETE',
    'USER.VIEW',
    'USER.LIST',
    'ROLE.CREATE',
    'ROLE.UPDATE',
    'ROLE.DELETE',
    'ROLE.VIEW',
    'ROLE.LIST',
    'SYSTEM.CONFIG.VIEW',
    'SYSTEM.CONFIG.UPDATE',
    'SYSTEM.HEALTH.VIEW',
    'EVENT_LOG.VIEW',
    'EVENT_LOG.VIEW_DETAIL',
    'AUDIT_LOG.VIEW',
    'AUCTION.ADMIN_CANCEL',
    'PRODUCT.CREATE',
    'PRODUCT.UPDATE',
    'PRODUCT.DELETE',
    'CATEGORY.CREATE',
    'CATEGORY.UPDATE',
    'CATEGORY.DELETE',
  ],
};

export function getRolePermissions(role?: string): string[] {
  const normalizedRole = (role ?? '').toUpperCase();
  return ROLE_PERMISSIONS[normalizedRole] ?? [];
}

export function hasPermission(role: string | undefined, permission: string): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
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

  if (authTokenStore.isRevoked(token)) {
    res.status(401).json({
      success: false,
      error: 'Token has been revoked.',
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

  const request = req as AuthenticatedRequest;
  request.user = {
    ...payload,
    permissions: payload.permissions ?? getRolePermissions(payload.role),
  };

  next();
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

    const granted =
      hasPermission(user.role, requiredPermission) ||
      user.permissions.includes(requiredPermission) ||
      user.role === 'ADMIN';

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
