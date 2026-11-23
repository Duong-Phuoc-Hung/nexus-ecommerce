import { Promotion } from '../entities/Promotion';

export interface RecordPromotionUsageParams {
  promotionId: string;
  userId: string;
  orderId?: string | null;
  discountAmount: number;
}

export interface IPromotionRepository {
  findByCode(code: string): Promise<Promotion | null>;
  findActivePromotions(): Promise<Promotion[]>;
  countUserUsages(promotionId: string, userId: string): Promise<number>;
  recordUsageAndIncrement(params: RecordPromotionUsageParams, tx?: any): Promise<void>;
}
