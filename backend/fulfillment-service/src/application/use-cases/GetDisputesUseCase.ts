import { ISupportCaseRepository } from '../../domain/repositories/ISupportCaseRepository';

export interface GetDisputesCriteria {
  status?: string;
  page?: number;
  limit?: number;
  query?: string;
}

/**
 * UseCase: GetDisputesUseCase
 * Lấy danh sách hồ sơ khiếu nại / phân xử trọng tài kèm thời hạn SLA và bằng chứng đối chiếu 2 bên
 * Đáp ứng màn hình Trọng tài khiếu nại (/support/disputes) (SRS 2.3, 3.1.2)
 */
export class GetDisputesUseCase {
  constructor(private readonly supportCaseRepository: ISupportCaseRepository) {}

  public async execute(criteria: GetDisputesCriteria) {
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));

    const result = await this.supportCaseRepository.search({
      status: criteria.status || 'PENDING',
      query: criteria.query,
      page,
      limit,
    });

    const disputes = result.items.map((caseItem) => caseItem.toDisputeDto());

    return {
      items: disputes,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }
}
