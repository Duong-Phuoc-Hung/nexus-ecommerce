import { NextFunction, Request, Response, Router } from 'express';
import {
  AdminApiError,
  restrictionFeature,
  RoleSettings,
  trustTier,
} from '../../../application/dtos/AdminUserDto';
import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { PostgresUserRepository } from '../../../infrastructure/repositories/PostgresUserRepository';
import {
  requireAuth,
  requirePermission,
  verifiedAdmin,
} from '../../../infrastructure/security/authorization';

function handle(status: number, action: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      const data = await action(req);
      if (status === 204) res.status(status).end();
      else res.status(status).json({ success: true, data });
    } catch (error) {
      if (error instanceof AdminApiError) {
        res.status(error.status).json({ success: false, code: error.code, error: error.message });
      } else if (error instanceof UserNotFoundException) {
        res.status(404).json({ success: false, code: 'USER_NOT_FOUND', error: error.message });
      } else {
        console.error('[Admin User API]', error);
        res
          .status(500)
          .json({ success: false, code: 'INTERNAL_ERROR', error: 'Không thể xử lý yêu cầu.' });
      }
    }
  };
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!verifiedAdmin(req)) {
    res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Yêu cầu quyền Admin.' });
    return;
  }
  next();
}

function pageNumber(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value) ||
    Number(value) < 1 ||
    Number(value) > max
  ) {
    throw new AdminApiError(400, 'INVALID_PAGINATION', 'Tham số phân trang không hợp lệ.');
  }
  return Number(value);
}

function invalid(field: string): never {
  throw new AdminApiError(400, 'VALIDATION_ERROR', `Trường ${field} không hợp lệ.`);
}

function roleCode(value: unknown): string {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!/^[A-Z][A-Z0-9_]{1,49}$/.test(code)) return invalid('code');
  return code;
}

function roleSettings(value: unknown): RoleSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('body');
  const input = value as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 100) return invalid('name');

  if (
    input.description != null &&
    (typeof input.description !== 'string' || input.description.trim().length > 255)
  ) {
    return invalid('description');
  }
  if (!Array.isArray(input.permissions) || input.permissions.length > 200) {
    return invalid('permissions');
  }
  const permissions = input.permissions.map((permission: unknown) => {
    if (typeof permission !== 'string' || !/^[A-Z0-9_.]{1,100}$/.test(permission)) {
      return invalid('permissions');
    }
    return permission;
  });
  return {
    name,
    description: typeof input.description === 'string' ? input.description.trim() || null : null,
    permissions: [...new Set(permissions)],
  };
}

export function createAdminRoleRoutes(repository: PostgresUserRepository): Router {
  const router = Router();
  const roles = repository.adminRoles;
  router.get(
    '/roles',
    requireAuth,
    requirePermission('ROLE.VIEW'),
    handle(200, async (req) => {
      const all = await roles.list();
      return verifiedAdmin(req) ? all : all.filter((role) => role.system);
    }),
  );
  router.post(
    '/roles',
    requireAuth,
    requireAdmin,
    requirePermission('ROLE.CREATE'),
    handle(201, (req) => roles.create(roleCode(req.body?.code), roleSettings(req.body))),
  );
  router.put(
    '/roles/:code',
    requireAuth,
    requireAdmin,
    requirePermission('ROLE.UPDATE'),
    handle(200, (req) => roles.update(roleCode(req.params.code), roleSettings(req.body))),
  );
  router.delete(
    '/roles/:code',
    requireAuth,
    requireAdmin,
    requirePermission('ROLE.DELETE'),
    handle(204, (req) => roles.delete(roleCode(req.params.code))),
  );
  return router;
}

export function createAdminUserRoutes(
  repository: PostgresUserRepository,
  profile: GetUserProfileUseCase,
): Router {
  const router = Router();
  router.get(
    '/:id/reputation-history',
    requireAuth,
    requireAdmin,
    requirePermission('USER.REPUTATION.VIEW'),
    handle(200, async (req) => {
      const userId = String(req.params.id);
      const page = pageNumber(req.query.page, 1, 100_000);
      const limit = pageNumber(req.query.limit, 20, 100);
      if (!(await repository.findById(userId))) throw new UserNotFoundException(userId);
      return repository.adminReputationHistory(userId, page, limit);
    }),
  );

  router.get(
    '/:id',
    (req, res, next) => {
      if (String(req.params.id).toLowerCase() === 'profile' || !verifiedAdmin(req))
        return next('route');
      requireAuth(req, res, next);
    },
    requirePermission('USER.VIEW'),
    handle(200, async (req) => {
      const identifier =
        typeof req.query.email === 'string' ? req.query.email : String(req.params.id);
      const user = await profile.execute(identifier, true);
      const [fields, restrictions, ratings] = await Promise.all([
        repository.adminProfileFields(user.id),
        repository.activeRestrictions(user.id),
        repository.ratingsSummary(user.id, false),
      ]);
      if (!fields) throw new UserNotFoundException(user.id);
      return {
        ...user,
        ...fields,
        ...trustTier(user.reputationScore),
        activeRestrictions: restrictions.map((r) => ({
          feature: restrictionFeature(r.restriction),
          reason: r.reason,
          expiresAt: r.expiresAt,
        })),
        stats: {
          averageRatingReceived: ratings.averageRating,
          totalRatingsReceived: ratings.totalReviews,
          completedTransactions: null,
          failedTransactions: null,
          successRate: null,
        },
      };
    }),
  );
  return router;
}
