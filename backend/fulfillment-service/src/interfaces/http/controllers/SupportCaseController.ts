import { Request, Response } from 'express';
import { ListSupportCasesUseCase } from '../../../application/use-cases/ListSupportCasesUseCase';
import { ResolveSupportCaseUseCase } from '../../../application/use-cases/ResolveSupportCaseUseCase';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class SupportCaseController {
  constructor(
    private readonly listSupportCasesUseCase: ListSupportCasesUseCase,
    private readonly resolveSupportCaseUseCase: ResolveSupportCaseUseCase,
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
}
