import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { QueryPolicyFaqInput, QueryPolicyFaqResult } from '../dtos/ChatDtos';

export class QueryPolicyFaqUseCase {
  constructor(private readonly policyRepo: IPolicyRepository) {}

  public async execute(input: QueryPolicyFaqInput): Promise<QueryPolicyFaqResult> {
    const rawQuery = (input.query || '').trim();
    if (!rawQuery) {
      throw new Error('Câu hỏi tra cứu chính sách không được để trống.');
    }

    const matchedPolicies = await this.policyRepo.search(rawQuery, input.category);

    // KỊCH BẢN B.1: Tìm thấy căn cứ chính sách
    if (matchedPolicies.length > 0) {
      const topPolicy = matchedPolicies[0];
      const defaultVal = topPolicy.defaultValue;

      let answer = topPolicy.content;
      // Bổ sung phân biệt giá trị mặc định vs thực tế theo acceptance criteria
      if (topPolicy.category === 'AUCTION') {
        answer += ` (Lưu ý: Mức phạt mặc định của hệ thống là trừ ${defaultVal.penalty_points || 10} điểm uy tín và thời hạn thanh toán là ${defaultVal.pay_window_hours || 24} giờ kể từ khi phiên đấu giá kết thúc).`;
      } else if (topPolicy.category === 'REFUND') {
        answer += ` (Lưu ý: Thời hạn đổi trả tiêu chuẩn là ${defaultVal.return_window_days || 7} ngày kể từ ngày nhận hàng thành công).`;
      }

      return {
        answer,
        isGrounded: true,
        citations: [
          {
            source: topPolicy.citationSource,
            version: topPolicy.version,
            policyCode: topPolicy.policyCode,
            title: topPolicy.title,
          },
        ],
        canEscalate: true,
        matchedPolicy: {
          code: topPolicy.policyCode,
          version: topPolicy.version,
          defaultValue: defaultVal,
        },
      };
    }

    // KỊCH BẢN B.2: Không tìm thấy căn cứ chính sách (Thiếu căn cứ)
    return {
      answer:
        'Hệ thống không tìm thấy căn cứ chính sách quy định cụ thể cho nội dung câu hỏi của bạn trong phiên bản quy chế hiện hành. Vui lòng nhấn nút "Gặp nhân viên hỗ trợ" để được giải đáp chi tiết.',
      isGrounded: false,
      citations: [],
      canEscalate: true,
    };
  }
}
