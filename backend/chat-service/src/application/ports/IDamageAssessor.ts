export const DAMAGE_TYPES = ['NỨT_VỠ', 'MÓP_MÉO', 'SAI_HÀNG', 'BÌNH_THƯỜNG'] as const;
export const DAMAGE_SEVERITIES = ['THẤP', 'TRUNG_BÌNH', 'CAO'] as const;

export interface DamageAssessment {
  is_damaged: boolean;
  damage_type: (typeof DAMAGE_TYPES)[number];
  severity: (typeof DAMAGE_SEVERITIES)[number];
  summary: string;
}

export interface DamageImageInput {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  expectedItem?: string;
}

export interface IDamageAssessor {
  assessImage(input: DamageImageInput): Promise<DamageAssessment>;
}
