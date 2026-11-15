import { Request, Response } from 'express';
import { QueryPolicyFaqUseCase } from '../../../application/use-cases/QueryPolicyFaqUseCase';
import { IPolicyRepository } from '../../../domain/repositories/IPolicyRepository';

export class PolicyController {
  constructor(
    private readonly queryPolicyFaqUseCase: QueryPolicyFaqUseCase,
    private readonly policyRepo: IPolicyRepository,
  ) {}

  /**
   * POST /api/v1/chat/faq
   * KỊCH BẢN B: Tra cứu câu hỏi thường gặp đối soát quy chế có trích dẫn nguồn
   */
  public async queryFaq(req: Request, res: Response): Promise<void> {
    try {
      const { query, category } = req.body;
      const result = await this.queryPolicyFaqUseCase.execute({
        query,
        category,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể tra cứu câu hỏi.' });
    }
  }

  /**
   * GET /api/v1/chat/policies
   * Danh sách toàn bộ các quy chế sàn đang có hiệu lực
   */
  public async listPolicies(_req: Request, res: Response): Promise<void> {
    try {
      const policies = await this.policyRepo.listAllActive();
      res.status(200).json({
        success: true,
        data: policies.map((p) => p.toDto()),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
