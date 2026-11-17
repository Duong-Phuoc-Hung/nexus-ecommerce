import crypto from 'node:crypto';
import { Request, Response } from 'express';
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
      const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
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

      const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';
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
          res.status(200).json({
            success: true,
            message: 'Hồ sơ khiếu nại đã được tiếp nhận trước đó (Idempotent).',
            data: existing.toResponseDto(),
          });
          return;
        }
      }
      const supportCase = new SupportCase({
        id,
        orderId: orderId || '',
        orderCode: orderCode || orderId || '',
        customer: customer || 'Khách hàng Nexus',
        userId: userId || user?.sub || 'usr_buyer',
        type: type || 'Yêu cầu trả hàng / hoàn tiền',
        reason: reason || 'Khiếu nại từ khách hàng',
        priority: priority || 'Cao',
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
}
