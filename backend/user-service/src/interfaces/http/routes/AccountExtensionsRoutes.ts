import { Request, Response, Router } from 'express';
import { PostgresUserRepository } from '../../../infrastructure/repositories/PostgresUserRepository';
import { BcryptPasswordHasher } from '../../../infrastructure/security/BcryptPasswordHasher';
import {
  requireAuth,
  requirePermission,
  verifiedAdmin,
} from '../../../infrastructure/security/authorization';
import { restrictionFeature, trustTier } from '../../../application/dtos/AdminUserDto';

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Actor = { sub: string; role: string };

function actor(req: Request): Actor {
  return (req as Request & { user: Actor }).user;
}

function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ success: false, code: error.code, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, code: 'INTERNAL_ERROR', error: 'Không thể xử lý yêu cầu.' });
      }
    }
  };
}

function positiveInteger(input: unknown, fallback: number, max: number): number {
  if (input === undefined) return fallback;
  if (
    typeof input !== 'string' ||
    !/^\d+$/.test(input) ||
    Number(input) < 1 ||
    Number(input) > max
  ) {
    throw new ApiError(400, 'INVALID_PAGINATION', 'Tham số phân trang hoặc lọc không hợp lệ.');
  }
  return Number(input);
}

function commerceUnavailable(): ApiError {
  return new ApiError(
    503,
    'COMMERCE_UNAVAILABLE',
    'Chưa xác minh được đơn hàng. Vui lòng thử lại.',
  );
}

async function commerce(path: string, req: Request): Promise<unknown> {
  const base = (
    process.env.COMMERCE_SERVICE_URL ||
    'http://127.0.0.1:' + (process.env.COMMERCE_SERVICE_PORT || 4003)
  ).replace(/\/$/, '');
  try {
    const response = await fetch(base + path, {
      headers: { Authorization: req.headers.authorization ?? '' },
      signal: AbortSignal.timeout(2500),
    });
    if ([403, 404].includes(response.status) && !path.endsWith('/cases')) {
      throw new ApiError(422, 'ORDER_NOT_ELIGIBLE_FOR_REVIEW', 'Không thể đánh giá đơn hàng này.');
    }
    if (!response.ok) throw commerceUnavailable();
    const envelope = (await response.json()) as { success?: boolean; data?: unknown };
    if (envelope.success !== true || envelope.data == null) throw commerceUnavailable();
    return envelope.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw commerceUnavailable();
  }
}

export function createAccountExtensionsRoutes(
  repository: PostgresUserRepository,
  passwords: BcryptPasswordHasher,
): Router {
  const router = Router();

  async function seller(id: string) {
    const result = await repository.findById(id);
    if (!result || result.role !== 'SELLER' || result.status !== 'ACTIVE') {
      throw new ApiError(404, 'SELLER_NOT_FOUND', 'Không tìm thấy gian hàng đang hoạt động.');
    }
    return result;
  }

  router.post(
    '/change-password',
    requireAuth,
    requirePermission('PROFILE.CHANGE_PASSWORD'),
    route(async (req, res) => {
      const { currentPassword, newPassword } = req.body ?? {};
      if (
        typeof currentPassword !== 'string' ||
        !currentPassword ||
        currentPassword.length > 1024
      ) {
        throw new ApiError(400, 'INVALID_CURRENT_PASSWORD', 'Mật khẩu hiện tại không hợp lệ.');
      }
      const user = await repository.findById(actor(req).sub);
      if (!user || user.status !== 'ACTIVE')
        throw new ApiError(403, 'FORBIDDEN', 'Tài khoản không hoạt động.');
      if (!(await passwords.compare(currentPassword, user.passwordHash))) {
        throw new ApiError(400, 'INVALID_CURRENT_PASSWORD', 'Mật khẩu hiện tại không đúng.');
      }
      if (
        typeof newPassword !== 'string' ||
        newPassword.length < 8 ||
        newPassword.length > 64 ||
        Buffer.byteLength(newPassword) > 72 ||
        !/[a-z]/.test(newPassword) ||
        !/[A-Z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword)
      ) {
        throw new ApiError(
          400,
          'WEAK_PASSWORD',
          'Mật khẩu mới cần 8–64 ký tự, tối đa 72 byte, có chữ hoa, chữ thường và chữ số.',
        );
      }
      if (await passwords.compare(newPassword, user.passwordHash)) {
        throw new ApiError(400, 'PASSWORD_REUSED', 'Mật khẩu mới phải khác mật khẩu hiện tại.');
      }
      if (
        !(await repository.changePassword(
          user.id,
          user.passwordHash,
          await passwords.hash(newPassword),
        ))
      ) {
        throw new ApiError(
          409,
          'PASSWORD_CHANGED',
          'Thông tin xác thực đã thay đổi. Vui lòng thử lại.',
        );
      }
      res.json({ success: true, message: 'Đã cập nhật mật khẩu thành công.' });
    }),
  );

  router.get(
    '/me/reputation',
    requireAuth,
    requirePermission('REPUTATION.VIEW'),
    route(async (req, res) => {
      const user = await repository.findById(actor(req).sub);
      if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
      const [summary, restrictions, events] = await Promise.all([
        repository.ratingsSummary(user.id, false),
        repository.activeRestrictions(user.id),
        repository.reputationHistory(user.id),
      ]);
      const activeRestrictions = restrictions.map((r) => ({
        feature: restrictionFeature(r.restriction),
        reason: r.reason,
        expiresAt: r.expiresAt,
      }));
      res.json({
        success: true,
        data: {
          userId: user.id,
          reputationScore: user.reputationScore,
          ...trustTier(user.reputationScore),
          stats: {
            completedTransactions: null,
            failedTransactions: null,
            successRate: null,
            averageRatingReceived: summary.averageRating,
            totalRatingsReceived: summary.totalReviews,
          },
          biddingEligible:
            user.role === 'BUYER' &&
            user.status === 'ACTIVE' &&
            user.reputationScore >= 50 &&
            !activeRestrictions.some((r) => r.feature === 'AUCTION_BID'),
          minScoreRequiredToBid: 50,
          activeRestrictions,
          recentHistory: events.map((event) => ({
            id: event.id,
            delta: event.points,
            reason: event.reason,
            createdAt: event.createdAt,
          })),
        },
      });
    }),
  );

  router.get(
    '/:sellerId/public-profile',
    route(async (req, res) => {
      const user = await seller(String(req.params.sellerId));
      const ratings = await repository.ratingsSummary(user.id, true);
      res.json({
        success: true,
        data: {
          sellerId: user.id,
          displayName: user.fullName,
          status: user.status,
          joinedAt: user.createdAt,
          reputationScore: user.reputationScore,
          ...trustTier(user.reputationScore),
          ...ratings,
          completedOrders: null,
          successRate: null,
        },
      });
    }),
  );

  router.get(
    '/:sellerId/reviews',
    route(async (req, res) => {
      const admin = verifiedAdmin(req);
      const userId = String(req.params.sellerId);
      const user = admin ? await repository.findById(userId) : await seller(userId);
      if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
      const page = positiveInteger(req.query.page, 1, 100000);
      const limit = positiveInteger(req.query.limit, admin ? 20 : 10, 100);
      const rating =
        req.query.rating === undefined ? undefined : positiveInteger(req.query.rating, 1, 5);
      res.json({
        success: true,
        data: await repository.sellerReviews(user.id, page, limit, rating, admin),
      });
    }),
  );

  router.post(
    '/:sellerId/reviews',
    requireAuth,
    requirePermission('REPUTATION.RATE'),
    route(async (req, res) => {
      const sellerId = String(req.params.sellerId);
      if (actor(req).sub === sellerId)
        throw new ApiError(403, 'SELF_REVIEW_FORBIDDEN', 'Không thể tự đánh giá.');
      const buyer = await repository.findById(actor(req).sub);
      if (!buyer || buyer.role !== 'BUYER' || buyer.status !== 'ACTIVE') {
        throw new ApiError(403, 'FORBIDDEN', 'Chỉ Buyer đang hoạt động được đánh giá.');
      }
      await seller(sellerId);
      const { orderId, rating, comment } = req.body ?? {};
      if (
        typeof orderId !== 'string' ||
        !orderId.trim() ||
        orderId.trim().length > 64 ||
        typeof rating !== 'number' ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5 ||
        (comment !== undefined &&
          comment !== null &&
          (typeof comment !== 'string' || comment.length > 500))
      ) {
        throw new ApiError(
          400,
          'INVALID_REVIEW',
          'Cần orderId, điểm nguyên 1–5 và nhận xét tối đa 500 ký tự.',
        );
      }
      const path = '/api/v1/orders/' + encodeURIComponent(orderId.trim());
      const order = (await commerce(path, req)) as {
        id?: string;
        buyerId?: string;
        sellerId?: string;
        status?: string;
      };
      if (typeof order.id !== 'string' || !order.id.trim() || order.id.length > 64)
        throw commerceUnavailable();
      if (
        order.buyerId !== buyer.id ||
        order.sellerId !== sellerId ||
        !['DELIVERED', 'COMPLETED'].includes(order.status ?? '')
      ) {
        throw new ApiError(
          422,
          'ORDER_NOT_ELIGIBLE_FOR_REVIEW',
          'Đơn chưa giao thành công hoặc không thuộc giao dịch này.',
        );
      }
      const cases = await commerce(path + '/cases', req);
      if (!Array.isArray(cases) || cases.some((entry) => typeof entry?.status !== 'string')) {
        throw commerceUnavailable();
      }
      if (cases.some((entry) => !['RESOLVED', 'REJECTED', 'CLOSED'].includes(entry.status))) {
        throw new ApiError(422, 'ORDER_NOT_ELIGIBLE_FOR_REVIEW', 'Đơn hàng đang có khiếu nại.');
      }
      const review = await repository.addSellerReview(
        sellerId,
        buyer.id,
        order.id,
        rating,
        comment?.trim() || null,
      );
      if (!review) throw new ApiError(409, 'DUPLICATE_REVIEW', 'Đơn hàng này đã được đánh giá.');
      res.status(201).json({ success: true, data: review });
    }),
  );
  return router;
}
