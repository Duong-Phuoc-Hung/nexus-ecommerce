import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { buildServiceAuthHeader } from '../../../infrastructure/security/internal-service-auth';
import { ListSupportCasesUseCase } from '../../../application/use-cases/ListSupportCasesUseCase';
import { ResolveSupportCaseUseCase } from '../../../application/use-cases/ResolveSupportCaseUseCase';
import { GetDisputesUseCase } from '../../../application/use-cases/GetDisputesUseCase';
import { IssueDisputeVerdictUseCase } from '../../../application/use-cases/IssueDisputeVerdictUseCase';
import { SubmitSellerEvidenceUseCase } from '../../../application/use-cases/SubmitSellerEvidenceUseCase';
import { ISupportCaseRepository } from '../../../domain/repositories/ISupportCaseRepository';
import { SupportCase } from '../../../domain/entities/SupportCase';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class SupportCaseController {
  constructor(
    private readonly listSupportCasesUseCase: ListSupportCasesUseCase,
    private readonly resolveSupportCaseUseCase: ResolveSupportCaseUseCase,
    private readonly getDisputesUseCase?: GetDisputesUseCase,
    private readonly issueDisputeVerdictUseCase?: IssueDisputeVerdictUseCase,
    private readonly submitSellerEvidenceUseCase?: SubmitSellerEvidenceUseCase,
    private readonly supportCaseRepository?: ISupportCaseRepository,
  ) {}

  /**
   * GET /api/v1/support/cases
   * Danh sách Ticket / Khiếu nại thực tế thay thế dữ liệu mock tạm thời (SRS 2.3, 3.1.2)
   */
  public async listCases(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      let userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const orderId =
        typeof req.query.orderId === 'string'
          ? req.query.orderId
          : typeof req.query.order_id === 'string'
            ? req.query.order_id
            : undefined;

      // Bảo vệ chống IDOR: Nếu là BUYER thì bắt buộc chỉ tra cứu case của chính mình
      if (user?.role === 'BUYER') {
        userId = user.sub;
      }

      // Hỗ trợ tra cứu theo orderId qua query parameter: GET /api/v1/support/cases?orderId=... (Chuẩn REST thống nhất)
      if (orderId && this.supportCaseRepository) {
        const found = await this.supportCaseRepository.findByOrderId(orderId);
        if (
          found &&
          user?.role === 'BUYER' &&
          found.userId.toLowerCase() !== user.sub.toLowerCase()
        ) {
          res.status(403).json({
            success: false,
            error: 'Bạn không có quyền truy cập khiếu nại của đơn hàng này.',
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: found ? [found.toResponseDto()] : [],
          pagination: {
            total: found ? 1 : 0,
            page: 1,
            limit: 10,
            totalPages: found ? 1 : 0,
          },
        });
        return;
      }
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
      const query =
        typeof req.query.q === 'string'
          ? req.query.q
          : typeof req.query.query === 'string'
            ? req.query.query
            : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      // Bảo vệ chống IDOR: Nếu là BUYER thì bắt buộc chỉ tra cứu case của chính mình
      if (user?.role === 'BUYER') {
        userId = user.sub;
      }

      const result = await this.listSupportCasesUseCase.execute({
        userId,
        orderId,
        status,
        priority,
        query,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('[SupportCaseController.listCases Error]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tra cứu danh sách khiếu nại hỗ trợ.',
      });
    }
  }

  /**
   * POST /api/v1/support/cases/:id/resolve
   * Cập nhật kết quả xử lý khiếu nại (Duyệt, từ chối, chuyển cấp tranh chấp giữa Buyer và Seller)
   */
  public async resolveCase(req: Request, res: Response): Promise<void> {
    try {
      const caseId = req.params.id as string;
      const { resolution, note } = req.body || {};
      const operatorId = (req as AuthenticatedRequest).user?.sub;

      const result = await this.resolveSupportCaseUseCase.execute({
        caseId,
        resolution,
        note,
        operatorId,
      });

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể cập nhật kết quả xử lý khiếu nại.',
      });
    }
  }

  /**
   * GET /api/v1/support/disputes?status=PENDING&page=1
   * Hàng đợi phân xử tranh chấp trọng tài kèm SLA và bằng chứng đối chiếu 2 bên (SRS 2.3)
   */
  public async listDisputes(req: Request, res: Response): Promise<void> {
    try {
      if (!this.getDisputesUseCase) {
        res.status(500).json({ success: false, error: 'GetDisputesUseCase not configured.' });
        return;
      }

      const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const status = !rawStatus || rawStatus.toUpperCase() === 'ALL' ? undefined : rawStatus;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;

      const result = await this.getDisputesUseCase.execute({
        status,
        page,
        limit,
        query,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('[SupportCaseController.listDisputes Error]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tra cứu hàng đợi tranh chấp trọng tài.',
      });
    }
  }

  /**
   * POST /api/v1/support/disputes/:caseId/verdict
   * Phán quyết trọng tài cho khiếu nại tranh chấp Buyer - Seller
   */
  public async issueVerdict(req: Request, res: Response): Promise<void> {
    try {
      if (!this.issueDisputeVerdictUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'IssueDisputeVerdictUseCase not configured.' });
        return;
      }

      const caseId = req.params.caseId as string;
      const { decision, refundAmount, liableParty, note } = req.body || {};
      const arbitratorId = (req as AuthenticatedRequest).user?.sub || 'usr_staff_arbitrator';

      if (!decision) {
        res.status(400).json({
          success: false,
          error:
            'Trường "decision" là bắt buộc (REFUND_BUYER, REJECT_BUYER, REQUIRE_RETURN_FIRST).',
        });
        return;
      }

      if (!note || !note.trim()) {
        res.status(400).json({
          success: false,
          error: 'Trường "note" (căn cứ phán quyết) là bắt buộc.',
        });
        return;
      }

      const result = await this.issueDisputeVerdictUseCase.execute({
        caseId,
        decision,
        refundAmount: typeof refundAmount === 'number' ? refundAmount : undefined,
        liableParty,
        note,
        arbitratorId,
      });

      res.status(200).json({
        success: true,
        message: 'Ra phán quyết trọng tài thành công.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể ban hành phán quyết trọng tài.',
      });
    }
  }

  public async getDisputeSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!this.issueDisputeVerdictUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'IssueDisputeVerdictUseCase not configured.' });
        return;
      }
      const caseId = String(req.params.caseId || '').trim();
      const record = await this.issueDisputeVerdictUseCase.getSyncStatus(caseId);
      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: error.message || 'Không thể kiểm tra trạng thái đồng bộ.' });
    }
  }

  public async retryDisputeSync(req: Request, res: Response): Promise<void> {
    try {
      if (!this.issueDisputeVerdictUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'IssueDisputeVerdictUseCase not configured.' });
        return;
      }
      const caseId = String(req.params.caseId || '').trim();
      const result = await this.issueDisputeVerdictUseCase.retryCommerceSync(caseId);
      res.status(200).json({
        success: true,
        message:
          result.commerceSync.status === 'SYNCED'
            ? 'Đồng bộ hoàn tiền sang Commerce Service thành công.'
            : 'Commerce Service vẫn chưa sẵn sàng; đã lên lịch thử lại tự động.',
        data: result,
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể thử lại đồng bộ Commerce.' });
    }
  }

  /**
   * POST /api/v1/support/disputes/:caseId/seller-evidence
   * POST /api/v1/support/orders/:orderId/dispute-evidence
   * Seller nộp bằng chứng đóng gói (video, ảnh niêm phong) để đối chất trọng tài
   */
  public async submitSellerEvidence(req: Request, res: Response): Promise<void> {
    try {
      if (!this.submitSellerEvidenceUseCase) {
        res.status(500).json({
          success: false,
          error: 'SubmitSellerEvidenceUseCase not configured.',
        });
        return;
      }

      const caseIdOrOrderId = (req.params.caseId || req.params.orderId || req.params.id) as string;
      const { videos, photos, note } = req.body || {};
      const user = (req as AuthenticatedRequest).user;

      const result = await this.submitSellerEvidenceUseCase.execute({
        caseIdOrOrderId,
        videos: Array.isArray(videos) ? videos : [],
        photos: Array.isArray(photos) ? photos : [],
        note: typeof note === 'string' ? note : undefined,
        sellerId: user?.sub,
        sellerRole: user?.role,
      });

      res.status(200).json({
        success: true,
        message: 'Nộp bằng chứng đóng gói thành công.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể cập nhật bằng chứng đối chất của người bán.',
      });
    }
  }

  /**
   * POST /api/v1/support/cases
   * Tiếp nhận hồ sơ khiếu nại mới từ Chat Service hoặc Buyer
   */
  public async createCase(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user || !user.sub) {
        res.status(401).json({
          success: false,
          error: 'Yêu cầu đăng nhập để tạo hồ sơ khiếu nại.',
        });
        return;
      }

      const {
        caseId,
        orderId,
        orderCode,
        customer,
        userId,
        reason,
        type,
        priority,
        buyerEvidence,
        idempotencyKey: bodyIdempotencyKey,
      } = req.body || {};

      const headerIdempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const idempotencyKey = bodyIdempotencyKey || headerIdempotencyKey;
      const id = caseId || idempotencyKey || crypto.randomUUID();

      if (this.supportCaseRepository) {
        const existing = await this.supportCaseRepository.findById(id);
        if (existing) {
          // Vá lỗ hổng bảo mật rò rỉ thông tin cá nhân:
          // Bắt buộc kiểm tra quyền sở hữu (chính chủ hoặc Staff/Admin)
          const isOwner = existing.userId.toLowerCase() === user.sub.toLowerCase();
          const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'SUPPORT_STAFF';

          if (!isOwner && !isStaffOrAdmin) {
            res.status(403).json({
              success: false,
              error: 'Bạn không có quyền truy cập hồ sơ khiếu nại này.',
            });
            return;
          }

          res.status(200).json({
            success: true,
            message: 'Hồ sơ khiếu nại đã được tiếp nhận trước đó (Idempotent).',
            data: existing.toResponseDto(),
          });
          return;
        }
      }

      // BUYER chỉ có quyền tạo khiếu nại cho chính mình (chống mạo danh userId người khác)
      const effectiveUserId = user.role === 'BUYER' ? user.sub : userId || user.sub;

      const supportCase = new SupportCase({
        id,
        orderId: orderId || '',
        orderCode: orderCode || orderId || '',
        customer: customer || 'Khách hàng Nexus',
        userId: effectiveUserId,
        type: type || 'Yêu cầu trả hàng / hoàn tiền',
        reason: reason || 'Khiếu nại từ khách hàng',
        priority:
          priority ||
          this.classifyCasePriority(
            req.body?.type,
            req.body?.reason,
            req.body?.aiAssessment?.severity,
          ),
        status: 'PENDING',
        buyerEvidence: buyerEvidence
          ? {
              photos: buyerEvidence.photos,
              videos: buyerEvidence.videos,
              note: buyerEvidence.note,
              submittedAt: buyerEvidence.submittedAt
                ? new Date(buyerEvidence.submittedAt)
                : new Date(),
            }
          : undefined,
        createdAt: new Date(),
      });

      if (this.supportCaseRepository) {
        await this.supportCaseRepository.save(supportCase);
      }

      // Đồng bộ trạng thái REFUND_REQUESTED sang commerce-service (SRS 2.3)
      this.syncRefundRequestToCommerce(
        supportCase.orderId,
        supportCase.reason,
        buyerEvidence?.photos || [],
        user?.sub,
      );

      res.status(201).json({
        success: true,
        message: 'Tạo hồ sơ khiếu nại thành công.',
        data: supportCase.toResponseDto(),
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể tạo hồ sơ khiếu nại.',
      });
    }
  }

  private classifyCasePriority(
    type?: string,
    reason?: string,
    aiSeverity?: string,
  ): 'Cao' | 'Trung bình' | 'Thấp' {
    const sev = String(aiSeverity || '').toUpperCase();
    if (sev === 'HIGH' || sev === 'CRITICAL') return 'Cao';

    const combined = `${type || ''} ${reason || ''}`.toLowerCase();
    if (
      /(vỡ|nứt|bể|hỏng|hư|móp|sai hàng|sai mẫu|nhầm|thiếu|không đúng|mất|thất lạc|lừa đảo|giả|đấu giá|broken|damaged|wrong|lost|fraud)/i.test(
        combined,
      )
    ) {
      return 'Cao';
    }
    if (
      /(trễ|chậm|hoàn tiền|trả hàng|đổi trả|delay|refund|return)/i.test(combined) ||
      sev === 'MEDIUM'
    ) {
      return 'Trung bình';
    }
    return 'Thấp';
  }

  /**
   * GET /api/v1/support/cases/by-order/:orderId
   * Tra cứu hồ sơ khiếu nại & phán quyết theo orderId (Dành cho Buyer Portal & Seller đối soát)
   */
  public async getCaseByOrderId(req: Request, res: Response): Promise<void> {
    try {
      if (!this.supportCaseRepository) {
        res.status(500).json({ success: false, error: 'SupportCaseRepository not configured.' });
        return;
      }

      const orderId = (
        typeof req.params.orderId === 'string' && req.params.orderId
          ? req.params.orderId
          : typeof req.params.id === 'string' && req.params.id
            ? req.params.id
            : String(req.params.orderId || req.params.id || '')
      ).trim();
      if (!orderId) {
        res.status(400).json({ success: false, error: 'orderId không được để trống.' });
        return;
      }

      const user = (req as AuthenticatedRequest).user;
      const altIdsRaw = typeof req.query.altIds === 'string' ? req.query.altIds : '';
      const candidateIds = Array.from(
        new Set([orderId, ...altIdsRaw.split(',')].map((v) => v.trim()).filter(Boolean)),
      );

      let foundList = this.supportCaseRepository.findAllByOrderId
        ? await this.supportCaseRepository.findAllByOrderId(candidateIds)
        : [];
      if (foundList.length === 0 && !this.supportCaseRepository.findAllByOrderId) {
        const single = await this.supportCaseRepository.findByOrderId(orderId);
        if (single) foundList = [single];
      }

      if (foundList.length === 0) {
        res.status(200).json({
          success: true,
          data: [],
        });
        return;
      }

      if (user?.role === 'BUYER') {
        const owned = foundList.filter(
          (c) => !c.userId || c.userId.toLowerCase() === user.sub.toLowerCase(),
        );
        if (owned.length === 0) {
          res.status(403).json({
            success: false,
            error: 'Bạn không có quyền truy cập khiếu nại của đơn hàng này.',
          });
          return;
        }
        foundList = owned;
      }

      res.status(200).json({
        success: true,
        data: foundList.map((c) => c.toDisputeDto()),
      });
    } catch (error: any) {
      console.error('[SupportCaseController.getCaseByOrderId Error]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tra cứu hồ sơ khiếu nại theo đơn hàng.',
      });
    }
  }

  /**
   * GET /api/v1/support/cases/:caseId
   * Tra cứu trực tiếp 1 hồ sơ theo caseId có kiểm tra quyền sở hữu (D1/D2)
   */
  public async getCaseById(req: Request, res: Response): Promise<void> {
    try {
      if (!this.supportCaseRepository) {
        res.status(500).json({ success: false, error: 'SupportCaseRepository not configured.' });
        return;
      }

      const caseId = String(req.params.caseId || req.params.id || '').trim();
      if (!caseId) {
        res.status(400).json({ success: false, error: 'caseId không được để trống.' });
        return;
      }

      const found = await this.supportCaseRepository.findById(caseId);
      if (!found) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy hồ sơ khiếu nại "${caseId}".`,
        });
        return;
      }

      const user = (req as AuthenticatedRequest).user;
      if (
        user?.role === 'BUYER' &&
        found.userId &&
        found.userId.toLowerCase() !== user.sub.toLowerCase()
      ) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền truy cập hồ sơ khiếu nại của tài khoản khác.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: found.toDisputeDto(),
      });
    } catch (error: any) {
      console.error('[SupportCaseController.getCaseById Error]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tra cứu hồ sơ khiếu nại.',
      });
    }
  }

  /**
   * POST /api/v1/support/cases/:caseId/return-shipment
   * Buyer gửi mã vận đơn hoàn trả & bằng chứng khi phán quyết yêu cầu REQUIRE_RETURN_FIRST (D4)
   */
  public async submitReturnShipment(req: Request, res: Response): Promise<void> {
    try {
      if (!this.supportCaseRepository) {
        res.status(500).json({ success: false, error: 'SupportCaseRepository not configured.' });
        return;
      }

      const caseId = String(req.params.caseId || req.params.id || '').trim();
      const trackingCode = String(req.body?.trackingCode || '').trim();
      const carrier = String(req.body?.carrier || '').trim();
      const note = String(req.body?.note || '').trim();

      if (!trackingCode) {
        res.status(400).json({ success: false, error: 'Vui lòng nhập mã vận đơn hoàn trả.' });
        return;
      }

      const found = await this.supportCaseRepository.findById(caseId);
      if (!found) {
        res.status(404).json({ success: false, error: `Không tìm thấy hồ sơ "${caseId}".` });
        return;
      }

      const user = (req as AuthenticatedRequest).user;
      if (
        user?.role === 'BUYER' &&
        found.userId &&
        found.userId.toLowerCase() !== user.sub.toLowerCase()
      ) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền cập nhật hồ sơ này.',
        });
        return;
      }

      const existingPhotos = found.buyerEvidence?.photos || [];
      const extraPhotos = Array.isArray(req.body?.photos)
        ? req.body.photos.filter(
            (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0,
          )
        : [];
      const existingNote = found.buyerEvidence?.note || '';
      const returnLine = `[Mã vận đơn hoàn trả] ${carrier ? `${carrier} - ` : ''}${trackingCode}${note ? ` (${note})` : ''}`;

      found.updateBuyerEvidence({
        photos: [...existingPhotos, ...extraPhotos],
        note: existingNote ? `${existingNote}\n${returnLine}` : returnLine,
      });

      await this.supportCaseRepository.save(found);

      res.status(200).json({
        success: true,
        message: 'Đã ghi nhận mã vận đơn hoàn trả hàng.',
        data: found.toDisputeDto(),
      });
    } catch (error: any) {
      console.error('[SupportCaseController.submitReturnShipment Error]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể lưu mã vận đơn hoàn trả.',
      });
    }
  }

  private async syncRefundRequestToCommerce(
    orderId: string,
    reason?: string,
    evidenceUrls?: string[],
    requesterId?: string,
  ): Promise<void> {
    if (!orderId) return;

    const commerceUrl = (
      process.env.COMMERCE_SERVICE_URL ||
      (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
        ? 'http://commerce-service:4003'
        : `http://localhost:${process.env.COMMERCE_SERVICE_PORT || 4003}`)
    ).replace(/\/$/, '');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `${commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}/refund/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildServiceAuthHeader({
              issuer: 'fulfillment-service',
              audience: 'commerce-service',
              scope: 'order:refund:request',
              resource: orderId,
              actor: requesterId ? { sub: requesterId, role: 'BUYER' } : undefined,
            }),
          },
          body: JSON.stringify({
            reason: reason || 'Khách hàng tạo khiếu nại yêu cầu trả hàng / hoàn tiền',
            evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(
          `[SupportCaseController] Đồng bộ yêu cầu hoàn tiền sang Commerce Service (${commerceUrl}) thất bại [HTTP ${response.status}]: ${errorText}`,
        );
      }
    } catch (err: any) {
      console.error(
        `[SupportCaseController] Lỗi kết nối khi đồng bộ yêu cầu hoàn tiền sang Commerce Service (${commerceUrl}):`,
        err.message,
      );
    }
  }
}
