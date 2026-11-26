import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth, requirePermission } from '../../../infrastructure/security/authorization';
import { extractServiceToken } from '../../../infrastructure/security/internal-service-auth';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  // 1. Hồ sơ cá nhân & Uy tín cá nhân (TĨNH - đặt TRƯỚC /:id để tránh xung đột)
  router.get('/profile', requireAuth, requirePermission('PROFILE.VIEW'), (req, res) =>
    controller.getProfile(req, res),
  );
  router.patch('/profile', requireAuth, requirePermission('PROFILE.UPDATE'), (req, res) =>
    controller.updateProfile(req, res),
  );

  // Uy tín & Nhiệm vụ của chính Buyer (/me/reputation)
  router.get('/me/reputation', requireAuth, (req, res) => controller.getMyReputation(req, res));
  router.post('/me/reputation/recovery-complete', requireAuth, (req, res) =>
    controller.completeRecoveryGuide(req, res),
  );
  router.post('/me/reputation/appeals', requireAuth, (req, res) =>
    controller.submitReputationAppeal(req, res),
  );

  // Quản trị khiếu nại uy tín (ADMIN)
  router.get('/admin/reputation/appeals', requireAuth, requirePermission('USER.VIEW'), (req, res) =>
    controller.listReputationAppeals(req, res),
  );
  router.post(
    '/admin/reputation/appeals/:appealId/resolve',
    requireAuth,
    requirePermission('USER.REPUTATION.ADJUST'),
    (req, res) => controller.resolveReputationAppeal(req, res),
  );

  // 2. Sổ địa chỉ của Buyer (/me/addresses) (TĨNH - đặt TRƯỚC /:id)
  router.get('/me/addresses', requireAuth, (req, res) => controller.listAddresses(req, res));
  router.post('/me/addresses', requireAuth, (req, res) => controller.createAddress(req, res));
  router.put('/me/addresses/:addressId/default', requireAuth, (req, res) =>
    controller.setDefaultAddress(req, res),
  );
  router.patch('/me/addresses/:addressId', requireAuth, (req, res) =>
    controller.updateAddress(req, res),
  );
  router.delete('/me/addresses/:addressId', requireAuth, (req, res) =>
    controller.deleteAddress(req, res),
  );

  // 3. Quản lý danh sách & phân quyền người dùng (ADMIN / STAFF) (ĐỘNG - đặt SAU CÙNG)
  router.get('/', requireAuth, requirePermission('USER.VIEW'), (req, res) =>
    controller.listUsers(req, res),
  );
  router.get('/:id/reputation-history', requireAuth, (req, res) =>
    controller.getReputationHistory(req, res),
  );
  router.post(
    '/:id/reputation/events',
    (req, res, next) => {
      const svc = extractServiceToken(req, {
        expectedAudience: 'user-service',
        requiredScope: 'user:reputation:event:record',
        allowedIssuers: ['auction-service', 'commerce-service', 'fulfillment-service'],
        expectedResource: String(req.params.id || '').trim(),
      });
      if (svc) {
        (req as any).serviceAuth = svc;
        return next();
      }
      return requireAuth(req, res, () =>
        requirePermission('USER.REPUTATION.ADJUST')(req, res, next),
      );
    },
    (req, res) => controller.recordReputationEvent(req, res),
  );
  router.get('/:id', requireAuth, requirePermission('USER.VIEW'), (req, res) =>
    controller.getProfile(req, res),
  );
  router.put('/:id/role', requireAuth, requirePermission('ROLE.UPDATE'), (req, res) =>
    controller.assignRole(req, res),
  );
  router.patch('/:id/status', requireAuth, requirePermission('USER.UPDATE'), (req, res) =>
    controller.updateStatus(req, res),
  );
  // Chỉ ADMIN có USER.REPUTATION.ADJUST / REPUTATION.PENALTY.APPLY được điều chỉnh điểm & áp phạt (SRS 2.7)
  router.post(
    '/:id/adjust-reputation',
    requireAuth,
    requirePermission('USER.REPUTATION.ADJUST'),
    (req, res) => controller.adjustReputation(req, res),
  );
  router.post(
    '/:id/restrict-features',
    requireAuth,
    requirePermission('REPUTATION.PENALTY.APPLY'),
    (req, res) => controller.restrictFeatures(req, res),
  );

  return router;
}

export function createSupportUserRoutes(controller: UserController): Router {
  const router = Router();

  router.post(
    '/:userId/adjust-reputation',
    requireAuth,
    requirePermission('USER.REPUTATION.ADJUST'),
    (req, res) => controller.adjustReputation(req, res),
  );
  router.post(
    '/:userId/restrict-features',
    requireAuth,
    requirePermission('REPUTATION.PENALTY.APPLY'),
    (req, res) => controller.restrictFeatures(req, res),
  );

  return router;
}

export function createAuthRoutes(controller: UserController): Router {
  const router = Router();

  router.post('/send-otp', (req, res) => controller.sendRegistrationOtp(req, res));
  router.post('/register', (req, res) => controller.register(req, res));
  router.post('/login', (req, res) => controller.login(req, res));
  router.post('/refresh', (req, res) => controller.refreshToken(req, res));
  router.post('/logout', requireAuth, (req, res) => controller.logout(req, res));
  router.post('/forgot-password', (req, res) => controller.requestPasswordReset(req, res));
  router.post('/reset-password', (req, res) => controller.resetPassword(req, res));
  router.get('/roles', requireAuth, requirePermission('ROLE.VIEW'), (req, res) =>
    controller.listRoles(req, res),
  );

  return router;
}
