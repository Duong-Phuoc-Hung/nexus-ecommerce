/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG ROUTES (SRS 2.7 & SRS 3.2.1)
 * =============================================================================
 */

import { Router } from 'express';
import { EventLogController } from '../controllers/EventLogController';
import { requireAuth, requireEventLogPermission } from '../middleware/auth';

export function createEventLogRoutes(controller: EventLogController): Router {
  const router = Router();

  router.post('/internal/record', controller.recordInternalEvent);
  router.get(
    '/',
    requireAuth,
    requireEventLogPermission('EVENT_LOG.VIEW'),
    controller.getRecentLogs,
  );
  router.get(
    '/:eventId',
    requireAuth,
    requireEventLogPermission('EVENT_LOG.VIEW_DETAIL'),
    controller.getLogByEventId,
  );

  return router;
}
