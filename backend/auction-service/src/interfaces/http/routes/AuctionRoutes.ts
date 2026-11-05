import { Router } from 'express';
import { AuctionController } from '../controllers/AuctionController';
import {
  requireAuth,
  requireSellerOrAdmin,
  optionalAuth,
} from '../../../infrastructure/security/auth';

export function createAuctionRoutes(controller: AuctionController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.getActive(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/', requireAuth, requireSellerOrAdmin, (req, res) => controller.create(req, res));
  router.get('/:id/bids', (req, res) => controller.getBidHistory(req, res));
  router.post('/:id/bids', optionalAuth, (req, res) => controller.placeBid(req, res));
  router.post('/:id/buy-now', requireAuth, (req, res) => controller.buyNow(req, res));
  router.put('/:id', requireAuth, requireSellerOrAdmin, (req, res) => controller.update(req, res));
  router.delete('/:id', requireAuth, requireSellerOrAdmin, (req, res) =>
    controller.cancel(req, res),
  );

  return router;
}
