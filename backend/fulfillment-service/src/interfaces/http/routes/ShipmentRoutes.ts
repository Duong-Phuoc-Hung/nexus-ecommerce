import { Router } from 'express';
import { ShipmentController } from '../controllers/ShipmentController';

export function createShipmentRoutes(controller: ShipmentController): Router {
  const router = Router();

  router.get('/shipments/:id', (req, res) => controller.getById(req, res));
  router.patch('/shipments/:id/status', (req, res) => controller.updateStatus(req, res));

  return router;
}
