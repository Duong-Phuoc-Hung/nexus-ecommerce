import { Router } from 'express';
import { AuctionController } from '../controllers/AuctionController';
import {
  optionalAuth,
  requireAuth,
  requireSellerOrAdmin,
} from '../../../infrastructure/security/auth';
import {
  requireAuth as requireAuctionAdminAuth,
  optionalAuth as optionalAuctionAdminAuth,
  requireAuctionCancel,
  requireAdminOrSupportStaff,
} from '../../../infrastructure/security/auction-admin-auth';

export function createAuctionRoutes(controller: AuctionController): Router {
  const router = Router();

  router.get('/', optionalAuctionAdminAuth, (req, res) => controller.getActive(req, res));
  router.get('/obligations/:userId', (req, res) => controller.getUserObligations(req, res));
  router.get('/:id', optionalAuctionAdminAuth, (req, res) => controller.getById(req, res));
  router.post('/', requireAuth, requireSellerOrAdmin, (req, res) => controller.create(req, res));
  router.get('/:id/bids', (req, res) => controller.getBidHistory(req, res));
  router.post('/:id/bids', optionalAuth, (req, res) => controller.placeBid(req, res));
  router.post('/:id/buy-now', requireAuth, (req, res) => controller.buyNow(req, res));
  router.put('/:id', requireAuth, requireSellerOrAdmin, (req, res) => controller.update(req, res));
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
