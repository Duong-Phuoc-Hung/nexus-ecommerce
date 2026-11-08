import { Request, Response } from 'express';
import { ListSupportCasesUseCase } from '../../../application/use-cases/ListSupportCasesUseCase';
import { ResolveSupportCaseUseCase } from '../../../application/use-cases/ResolveSupportCaseUseCase';
import { GetDisputesUseCase } from '../../../application/use-cases/GetDisputesUseCase';
import { IssueDisputeVerdictUseCase } from '../../../application/use-cases/IssueDisputeVerdictUseCase';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class SupportCaseController {
  constructor(
    private readonly listSupportCasesUseCase: ListSupportCasesUseCase,
    private readonly resolveSupportCaseUseCase: ResolveSupportCaseUseCase,
    private readonly getDisputesUseCase?: GetDisputesUseCase,
    private readonly issueDisputeVerdictUseCase?: IssueDisputeVerdictUseCase,
  ) {}

  /**
   * GET /api/v1/support/cases
   * Danh sách Ticket / Khiếu nại thực tế thay thế dữ liệu mock tạm thời (SRS 2.3, 3.1.2)
   */
  public async listCases(req: Request, res: Response): Promise<void> {
    try {
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await this.listSupportCasesUseCase.execute({
        userId,
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
}
