import { Router } from 'express';
import { AuctionController } from '../controllers/AuctionController';
import { requireAuth, requireSellerOrAdmin } from '../../../infrastructure/security/auth';
import {
  requireAuth as requireAuctionAdminAuth,
  optionalAuth as optionalAuctionAdminAuth,
  requireAuctionCancel,
  requireSettlementPermission,
  requireAdminOrSupportStaff,
} from '../../../infrastructure/security/auction-admin-auth';
import { extractServiceToken } from '../../../infrastructure/security/internal-service-auth';

export function createAuctionRoutes(controller: AuctionController): Router {
  const router = Router();

  // Route tĩnh đặt TRƯỚC /:id
  router.get('/', optionalAuctionAdminAuth, (req, res) => controller.getActive(req, res));
  router.get('/my', requireAuth, (req, res) => controller.getMyAuctions(req, res));
  router.get(
    '/internal/settlement/:auctionId',
    (req, res, next) => {
      const svc = extractServiceToken(req, {
        expectedAudience: 'auction-service',
        requiredScope: 'auction:settlement:read',
        allowedIssuers: ['commerce-service'],
        expectedResource: String(req.params.auctionId || '').trim(),
      });
      if (!svc) {
        res.status(401).json({
          success: false,
          error: 'Valid scoped service credential (auction:settlement:read) required.',
        });
        return;
      }
      next();
    },
    (req, res) => controller.getInternalSettlement(req, res),
  );
  router.get(
    '/obligations/:userId',
    (req, res, next) => {
      const svc = extractServiceToken(req, {
        expectedAudience: 'auction-service',
        requiredScope: 'auction:obligations:read',
        allowedIssuers: ['user-service'],
        expectedResource: String(req.params.userId || '').trim(),
      });
      if (svc) {
        (req as any).serviceAuth = svc;
        return next();
      }
      return requireAuctionAdminAuth(req, res, next);
    },
    (req, res) => controller.getUserObligations(req, res),
  );

  // Route động theo :id
  router.get('/:id/timeline', optionalAuctionAdminAuth, (req, res) =>
    controller.getTimeline(req, res),
  );
  router.get('/:id/bids', optionalAuctionAdminAuth, (req, res) =>
    controller.getBidHistory(req, res),
  );
  router.get('/:id', optionalAuctionAdminAuth, (req, res) => controller.getById(req, res));

  // Mutations (bắt buộc xác thực JWT, không nhận bidderId từ body)
  router.post('/', requireAuth, requireSellerOrAdmin, (req, res) => controller.create(req, res));
  router.post('/:id/bids', requireAuth, (req, res) => controller.placeBid(req, res));
  router.post('/:id/buy-now', requireAuth, (req, res) => controller.buyNow(req, res));
  router.post('/:id/checkout', requireAuth, (req, res) => controller.checkout(req, res));
  router.post('/:id/settle', requireAuctionAdminAuth, requireSettlementPermission, (req, res) =>
    controller.settle(req, res),
  );
  router.put('/:id', requireAuth, requireSellerOrAdmin, (req, res) => controller.update(req, res));

  // Hủy phiên: SELLER chủ phiên hoặc ADMIN (AUCTION.ADMIN_CANCEL); Support bị từ chối 403
  router.post('/:id/cancel', requireAuctionAdminAuth, requireAuctionCancel, (req, res) =>
    controller.cancel(req, res),
  );
  router.post(
    '/:id/emergency-stop',
    requireAuctionAdminAuth,
    requireAdminOrSupportStaff,
    (req, res) => controller.cancel(req, res),
  );
  router.delete('/:id', requireAuctionAdminAuth, requireSellerOrAdmin, (req, res) =>
    controller.cancel(req, res),
  );

  return router;
}
