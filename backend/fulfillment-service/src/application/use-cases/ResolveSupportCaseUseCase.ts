import { ISupportCaseRepository } from '../../domain/repositories/ISupportCaseRepository';

export interface ResolveSupportCaseRequest {
  caseId: string;
  resolution: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  note: string;
  operatorId?: string;
}

/**
 * UseCase: ResolveSupportCaseUseCase
 * Cập nhật kết quả xử lý khiếu nại (Duyệt, từ chối, chuyển cấp tranh chấp giữa Buyer và Seller) (SRS 2.3, 3.1.2)
 */
export class ResolveSupportCaseUseCase {
  constructor(private readonly supportCaseRepository: ISupportCaseRepository) {}

  public async execute(request: ResolveSupportCaseRequest) {
    const { caseId, resolution, note, operatorId } = request;

    if (!caseId || !caseId.trim()) {
      throw new Error('Mã hồ sơ khiếu nại (caseId) không được để trống.');
    }

    const caseItem = await this.supportCaseRepository.findById(caseId.trim());
    if (!caseItem) {
      throw new Error(`Không tìm thấy hồ sơ khiếu nại với mã '${caseId}'.`);
    }

    caseItem.resolve(resolution, note, operatorId);
    await this.supportCaseRepository.save(caseItem);

    return {
      success: true,
      message: `Đã cập nhật trạng thái khiếu nại thành '${caseItem.status}'.`,
      data: caseItem.toResponseDto(),
    };
  }
}
