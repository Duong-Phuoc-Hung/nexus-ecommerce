import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth, requirePermission } from '../../../infrastructure/security/authorization';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  router.get('/profile', requireAuth, requirePermission('PROFILE.VIEW'), (req, res) =>
    controller.getProfile(req, res),
  );
  router.get('/', requireAuth, requirePermission('USER.VIEW'), (req, res) =>
    controller.getProfile(req, res),
  );
  router.get('/:id', requireAuth, requirePermission('USER.VIEW'), (req, res) =>
    controller.getProfile(req, res),
  );
  router.put('/:id/role', requireAuth, requirePermission('ROLE.UPDATE'), (req, res) =>
    controller.assignRole(req, res),
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
