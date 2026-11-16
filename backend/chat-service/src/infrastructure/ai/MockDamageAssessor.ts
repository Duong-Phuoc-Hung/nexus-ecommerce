import {
  DamageAssessment,
  DamageImageInput,
  IDamageAssessor,
} from '../../application/ports/IDamageAssessor';

export class MockDamageAssessor implements IDamageAssessor {
  public async assessImage(_input: DamageImageInput): Promise<DamageAssessment> {
    return {
      is_damaged: false,
      damage_type: 'BÌNH_THƯỜNG',
      severity: 'THẤP',
      summary:
        '[MOCK] Dữ liệu mẫu dự phòng, chưa đánh giá được ảnh thực tế. Vui lòng nhờ CSKH kiểm tra.',
    };
  }
}
