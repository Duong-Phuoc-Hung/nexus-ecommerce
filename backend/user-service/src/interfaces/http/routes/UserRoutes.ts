import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth, requirePermission } from '../../../infrastructure/security/authorization';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  // 1. Hồ sơ cá nhân của chính mình (TĨNH - phải đặt TRƯỚC /:id để tránh xung đột)
  router.get('/profile', requireAuth, requirePermission('PROFILE.VIEW'), (req, res) =>
    controller.getProfile(req, res),
  );
  router.patch('/profile', requireAuth, requirePermission('PROFILE.UPDATE'), (req, res) =>
    controller.updateProfile(req, res),
  );

  // 2. Sổ địa chỉ của Buyer (/me/addresses) (TĨNH - phải đặt TRƯỚC /:id để tránh Express coi 'me' là :id)
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
  router.get('/:id', requireAuth, requirePermission('USER.VIEW'), (req, res) =>
    controller.getProfile(req, res),
  );
  router.put('/:id/role', requireAuth, requirePermission('ROLE.UPDATE'), (req, res) =>
    controller.assignRole(req, res),
  );
  router.patch('/:id/status', requireAuth, requirePermission('USER.UPDATE'), (req, res) =>
    controller.updateStatus(req, res),
  );

  return router;
}

export function createAuthRoutes(controller: UserController): Router {
  const router = Router();

  router.post('/register', (req, res) => controller.register(req, res));
  router.post('/login', (req, res) => controller.login(req, res));
  router.post('/logout', requireAuth, (req, res) => controller.logout(req, res));
  router.post('/forgot-password', (req, res) => controller.requestPasswordReset(req, res));
  router.post('/reset-password', (req, res) => controller.resetPassword(req, res));
  router.get('/roles', requireAuth, requirePermission('ROLE.VIEW'), (req, res) =>
    controller.listRoles(req, res),
  );

  return router;
}
