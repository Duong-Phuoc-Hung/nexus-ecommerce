/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG ROUTES (SRS 2.7 & SRS 3.2.1)
 * =============================================================================
 */

import { Router } from 'express';
import { EventLogController } from '../controllers/EventLogController';

export function createEventLogRoutes(controller: EventLogController): Router {
  const router = Router();

  router.get('/', controller.getRecentLogs);
  router.get('/:eventId', controller.getLogByEventId);

  return router;
}
