import { Request, Response, Router } from 'express';
import {
  ModerationError,
  ModerationService,
} from '../../../application/use-cases/ModerationService';
import { AuthenticatedRequest, requireModerationAuth } from '../../../infrastructure/security/auth';

export function createModerationRoutes(service: ModerationService): Router {
  const router = Router();
  const admin = requireModerationAuth('ADMIN');
  const seller = requireModerationAuth('SELLER');
  const reporter = requireModerationAuth('BUYER', 'SELLER');
  const actor = (req: Request) => (req as AuthenticatedRequest).user!.id;

  function handle(
    status: number,
    action: (req: Request) => Promise<unknown>,
    envelope: (data: unknown) => Record<string, unknown> = (data) => ({ data }),
  ) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        res.status(status).json({ success: true, ...envelope(await action(req)) });
      } catch (error) {
        if (error instanceof ModerationError) {
          res
            .status(error.status)
            .json({ success: false, error: { code: error.code, message: error.message } });
          return;
        }
        console.error('[CatalogModeration]', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Không thể xử lý kiểm duyệt.' },
        });
      }
    };
  }

  router.get(
    '/moderation/queue',
    admin,
    handle(
      200,
      async (req) => {
        const result = await service.list(req.query);
        return req.query.format === 'items'
          ? { data: result }
          : { data: result.items, pagination: result.pagination };
      },
      (body) => body as Record<string, unknown>,
    ),
  );
  router.get(
    '/moderation/cases/:caseId',
    admin,
    handle(200, (req) => service.detail(req.params.caseId)),
  );
  router.get(
    '/moderation/:productId',
    admin,
    handle(200, (req) => service.productDetail(req.params.productId)),
  );
  router.post(
    '/:id/moderate',
    admin,
    handle(200, (req) => service.decide(req.params.id, actor(req), req.body)),
  );
  router.get(
    '/:id/moderation',
    seller,
    handle(200, (req) => service.sellerStatus(req.params.id, actor(req))),
  );
  router.post(
    '/:id/moderation/resubmit',
    seller,
    handle(200, (req) => service.resubmit(req.params.id, actor(req))),
  );
  router.post(
    '/:id/reports',
    reporter,
    handle(201, (req) => service.report(req.params.id, undefined, actor(req), req.body)),
  );
  router.post(
    '/:id/reviews/:reviewId/reports',
    reporter,
    handle(201, (req) => service.report(req.params.id, req.params.reviewId, actor(req), req.body)),
  );
  return router;
}
