import { Router } from 'express';
import { SellerApplicationController } from '../controllers/SellerApplicationController';
import { requireAuth, requirePermission } from '../../../infrastructure/security/authorization';

export function createBuyerSellerApplicationRoutes(
  controller: SellerApplicationController,
): Router {
  const router = Router();

  // Internal endpoint for commerce-service / auction-service race-window check
  router.get('/internal/activation-status/:userId', (req, res) =>
    controller.getInternalActivationStatus(req, res),
  );

  // Buyer / Authenticated User endpoints
  router.get('/me', requireAuth, (req, res) => controller.getMyApplication(req, res));

  router.post('/', requireAuth, requirePermission('SELLER_APPLICATION.SUBMIT'), (req, res) =>
    controller.submitApplication(req, res),
  );

  router.post(
    '/:id/resubmit',
    requireAuth,
    requirePermission('SELLER_APPLICATION.SUBMIT'),
    (req, res) => controller.resubmitApplication(req, res),
  );

  router.post(
    '/:id/withdraw',
    requireAuth,
    requirePermission('SELLER_APPLICATION.SUBMIT'),
    (req, res) => controller.withdrawApplication(req, res),
  );

  router.get(
    '/:id/activation-eligibility',
    requireAuth,
    requirePermission('SELLER_APPLICATION.ACTIVATE'),
    (req, res) => controller.checkActivationEligibility(req, res),
  );

  router.post('/:id/activate', requireAuth, (req, res) => controller.activateSeller(req, res));

  return router;
}

export function createAdminSellerApplicationRoutes(
  controller: SellerApplicationController,
): Router {
  const router = Router();

  router.get('/', requireAuth, requirePermission('SELLER_APPLICATION.VIEW'), (req, res) =>
    controller.listApplicationsForAdmin(req, res),
  );

  router.get('/:id', requireAuth, requirePermission('SELLER_APPLICATION.VIEW'), (req, res) =>
    controller.getApplicationDetailForAdmin(req, res),
  );

  router.post(
    '/:id/approve',
    requireAuth,
    requirePermission('SELLER_APPLICATION.REVIEW'),
    (req, res) => controller.approveApplication(req, res),
  );

  router.post(
    '/:id/reject',
    requireAuth,
    requirePermission('SELLER_APPLICATION.REVIEW'),
    (req, res) => controller.rejectApplication(req, res),
  );

  router.post(
    '/:id/revoke-approval',
    requireAuth,
    requirePermission('SELLER_APPLICATION.REVOKE'),
    (req, res) => controller.revokeApproval(req, res),
  );

  return router;
}
