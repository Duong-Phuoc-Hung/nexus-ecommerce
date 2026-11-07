import {
  ISupportCaseRepository,
  SupportCaseSearchCriteria,
} from '../../domain/repositories/ISupportCaseRepository';

/**
 * UseCase: ListSupportCasesUseCase
 * Tra cứu danh sách Ticket / Khiếu nại thực tế từ hệ thống (SRS 2.3, 3.1.2)
 * Thay thế cho dữ liệu mock tạm thời ở giao diện Support Dashboard.
 */
export class ListSupportCasesUseCase {
  constructor(private readonly supportCaseRepository: ISupportCaseRepository) {}

  public async execute(criteria: SupportCaseSearchCriteria) {
    const pageResult = await this.supportCaseRepository.search(criteria);

    return {
      items: pageResult.items.map((item) => item.toResponseDto()),
      total: pageResult.total,
      page: pageResult.page,
      limit: pageResult.limit,
      totalPages: pageResult.totalPages,
    };
  }
}
