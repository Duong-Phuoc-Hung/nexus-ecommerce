import { Request, Response } from 'express';
import { SellerApplicationService } from '../../../application/use-cases/SellerApplicationUseCases';
import { SellerApplicationError } from '../../../domain/exceptions/SellerApplicationExceptions';
import { AuthenticatedUser } from '../../../infrastructure/security/authorization';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export class SellerApplicationController {
  constructor(private readonly service: SellerApplicationService) {}

  private getUser(req: Request): AuthenticatedUser | undefined {
    return (req as AuthenticatedRequest).user;
  }

  private getParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] || '';
    return String(value || '');
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof SellerApplicationError) {
      res.status(error.status).json({
        success: false,
        code: error.code,
        error: error.message,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        ...(error.details || {}),
      });
      return;
    }

    const message =
      error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xử lý hồ sơ bán hàng.';
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      error: message,
      message,
    });
  }

  // ===========================================================================
  // BUYER ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/v1/seller-applications/me
   */
  public async getMyApplication(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const result = await this.service.getMyApplication(user.sub);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/seller-applications
   */
  public async submitApplication(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const headerIdempotencyKey = req.headers['idempotency-key'];
      const idempotencyKey =
        typeof headerIdempotencyKey === 'string' && headerIdempotencyKey.trim()
          ? headerIdempotencyKey.trim()
          : typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim()
            ? req.body.idempotencyKey.trim()
            : undefined;

      const dto = await this.service.submitApplication(user.sub, req.body || {}, idempotencyKey);
      res.status(201).json({
        success: true,
        message: 'Đã gửi hồ sơ đăng ký bán hàng thành công. Hồ sơ đang chờ Admin xét duyệt.',
        data: dto,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/seller-applications/:id/resubmit
   */
  public async resubmitApplication(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const applicationId = this.getParam(req.params.id);
      const expectedVersion =
        req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;
      const headerIdempotencyKey = req.headers['idempotency-key'];
      const idempotencyKey =
        typeof headerIdempotencyKey === 'string' && headerIdempotencyKey.trim()
          ? headerIdempotencyKey.trim()
          : typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim()
            ? req.body.idempotencyKey.trim()
            : undefined;

      const dto = await this.service.resubmitApplication(
        user.sub,
        applicationId,
        req.body || {},
        expectedVersion,
        idempotencyKey,
      );
      res.status(200).json({
        success: true,
        message: `Đã gửi lại hồ sơ đăng ký bán hàng (phiên bản v${dto.version}).`,
        data: dto,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/seller-applications/:id/withdraw
   */
  public async withdrawApplication(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const applicationId = this.getParam(req.params.id);
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
      const expectedVersion =
        req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;

      const dto = await this.service.withdrawApplication(
        user.sub,
        applicationId,
        expectedVersion,
        reason,
      );
      res.status(200).json({
        success: true,
        message: 'Đã rút hồ sơ đăng ký bán hàng. Bạn có thể chỉnh sửa và gửi lại bất kỳ lúc nào.',
        data: dto,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/seller-applications/:id/activation-eligibility
   */
  public async checkActivationEligibility(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const applicationId = this.getParam(req.params.id);
      const authHeader =
        typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
      const simulateUnavailable = req.query.simulateUnavailable === 'true';

      const result = await this.service.checkActivationEligibility(user.sub, applicationId, {
        authHeader,
        simulateUnavailable,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/seller-applications/:id/activate
   */
  public async activateSeller(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const applicationId = this.getParam(req.params.id);
      const headerIdempotencyKey = req.headers['idempotency-key'];
      const idempotencyKey =
        typeof headerIdempotencyKey === 'string' && headerIdempotencyKey.trim()
          ? headerIdempotencyKey.trim()
          : typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim()
            ? req.body.idempotencyKey.trim()
            : undefined;

      const expectedVersion =
        req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;
      const authHeader =
        typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
      const simulateUnavailable = req.body?.simulateUnavailable === true;

      const result = await this.service.activateSeller(user.sub, applicationId, {
        expectedVersion,
        idempotencyKey,
        authHeader,
        simulateUnavailable,
      });

      res.status(200).json({
        success: true,
        message:
          'Kích hoạt tài khoản Seller thành công. Tài khoản của bạn đã chuyển sang vai trò SELLER.',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/seller-applications/internal/activation-status/:userId
   * Endpoint nội bộ để commerce-service / auction-service kiểm tra khoá chuyển đổi role.
   */
  public async getInternalActivationStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.getParam(req.params.userId);
      const inActivationWindow = await this.service.isUserInActivationWindow(userId);
      res.status(200).json({
        success: true,
        data: {
          userId,
          inActivationWindow,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // ===========================================================================
  // ADMIN ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/v1/admin/seller-applications
   */
  public async listApplicationsForAdmin(req: Request, res: Response): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
      const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const sortBy =
        req.query.sortBy === 'submittedAt' ||
        req.query.sortBy === 'updatedAt' ||
        req.query.sortBy === 'priorityQueue'
          ? req.query.sortBy
          : 'priorityQueue';
      const sortOrder =
        req.query.sortOrder === 'desc' || req.query.sortOrder === 'asc'
          ? req.query.sortOrder
          : 'asc';

      const result = await this.service.listAdminApplications({
        q,
        status,
        fromDate,
        toDate,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        summary: result.summary,
        pagination: result.pagination,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/admin/seller-applications/:id
   */
  public async getApplicationDetailForAdmin(req: Request, res: Response): Promise<void> {
    try {
      const applicationId = this.getParam(req.params.id);
      const result = await this.service.getAdminApplicationDetail(applicationId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/admin/seller-applications/:id/approve
   */
  public async approveApplication(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const applicationId = this.getParam(req.params.id);
      const internalNote =
        typeof req.body?.internalNote === 'string' ? req.body.internalNote : undefined;
      const expectedVersion =
        req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;

      const dto = await this.service.approveApplication({
        applicationId,
        adminId: user.sub,
        expectedVersion,
        internalNote,
      });

      res.status(200).json({
        success: true,
        message:
          'Đã phê duyệt hồ sơ bán hàng (APPROVED). Lưu ý: Tài khoản người dùng vẫn giữ vai trò BUYER cho tới khi tự xác nhận kích hoạt Seller.',
        data: dto,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/admin/seller-applications/:id/reject
   */
  public async rejectApplication(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const applicationId = this.getParam(req.params.id);
      const reason =
        typeof req.body?.rejectionReason === 'string'
          ? req.body.rejectionReason
          : typeof req.body?.reason === 'string'
            ? req.body.reason
            : '';
      const internalNote =
        typeof req.body?.internalNote === 'string' ? req.body.internalNote : undefined;
      const expectedVersion =
        req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;

      const dto = await this.service.rejectApplication({
        applicationId,
        adminId: user.sub,
        expectedVersion,
        reason,
        internalNote,
      });

      res.status(200).json({
        success: true,
        message: 'Đã từ chối hồ sơ đăng ký bán hàng (REJECTED).',
        data: dto,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /api/v1/admin/seller-applications/:id/revoke-approval
   */
  public async revokeApproval(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getUser(req);
      if (!user?.sub) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const applicationId = this.getParam(req.params.id);
      const reason =
        typeof req.body?.reason === 'string'
          ? req.body.reason
          : typeof req.body?.rejectionReason === 'string'
            ? req.body.rejectionReason
            : '';
      const internalNote =
        typeof req.body?.internalNote === 'string' ? req.body.internalNote : undefined;
      const expectedVersion =
        req.body?.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined;

      const dto = await this.service.revokeApproval({
        applicationId,
        adminId: user.sub,
        expectedVersion,
        reason,
        internalNote,
      });

      res.status(200).json({
        success: true,
        message:
          'Đã thu hồi phê duyệt hồ sơ trước khi kích hoạt. Hồ sơ chuyển về trạng thái Cần điều chỉnh (REJECTED).',
        data: dto,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }
}
