import { ISupportCaseRepository } from '../../domain/repositories/ISupportCaseRepository';
import { DisputeEvidence } from '../../domain/entities/SupportCase';

export interface SubmitSellerEvidenceInput {
  caseIdOrOrderId: string;
  videos?: string[];
  photos?: string[];
  note?: string;
  sellerId?: string;
  sellerRole?: string;
}

/**
 * UseCase: SubmitSellerEvidenceUseCase
 * Người bán (Seller) nộp bằng chứng đối chất (video đóng hàng, ảnh niêm phong)
 * Phục vụ cho đối soát tranh chấp trọng tài (SRS 2.3, FE-05)
 */
export class SubmitSellerEvidenceUseCase {
  constructor(private readonly supportCaseRepository: ISupportCaseRepository) {}

  public async execute(input: SubmitSellerEvidenceInput) {
    const rawId = (input.caseIdOrOrderId || '').trim();
    if (!rawId) {
      throw new Error('caseId hoặc orderId là bắt buộc.');
    }

    // 1. Tìm hồ sơ khiếu nại theo caseId trước
    let caseItem = await this.supportCaseRepository.findById(rawId);

    // 2. Nếu không tìm thấy bằng caseId, tìm kiếm theo orderId hoặc orderCode
    if (!caseItem) {
      const searchResult = await this.supportCaseRepository.search({
        query: rawId,
        limit: 10,
      });

      const matched = searchResult.items.find(
        (c) =>
          c.orderId.toLowerCase() === rawId.toLowerCase() ||
          c.orderCode.toLowerCase() === rawId.toLowerCase() ||
          c.id.toLowerCase() === rawId.toLowerCase(),
      );

      if (matched) {
        caseItem = matched;
      }
    }

    if (!caseItem) {
      throw new Error(`Không tìm thấy hồ sơ khiếu nại tương ứng với "${rawId}".`);
    }

    // 3. Chuẩn bị bằng chứng của Seller
    const evidence: DisputeEvidence = {
      videos: Array.isArray(input.videos) ? input.videos : [],
      photos: Array.isArray(input.photos) ? input.photos : [],
      note: input.note ? input.note.trim() : undefined,
      submittedAt: new Date(),
    };

    if (evidence.videos!.length === 0 && evidence.photos!.length === 0 && !evidence.note) {
      throw new Error('Vui lòng cung cấp ít nhất 1 ảnh, video hoặc ghi chú đối chất.');
    }

    // 4. Lưu bằng chứng vào thực thể và cập nhật vào repository
    caseItem.submitSellerEvidence(evidence);
    await this.supportCaseRepository.save(caseItem);

    return caseItem.toDisputeDto();
  }
}
