import { Router } from 'express';
import { AuctionController } from '../controllers/AuctionController';

export function createAuctionRoutes(controller: AuctionController): Router {
  const router = Router();

  router.get('/', (req, res) => controller.getActive(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/:id/bids', (req, res) => controller.placeBid(req, res));

  return router;
}
