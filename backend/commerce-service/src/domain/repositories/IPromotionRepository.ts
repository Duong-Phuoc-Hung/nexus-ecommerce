import { Promotion } from '../entities/Promotion';

export interface RecordPromotionUsageParams {
  promotionId: string;
  userId: string;
  orderId?: string | null;
  discountAmount: number;
}

export interface PromotionSearchParams {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PromotionSearchResult {
  items: Promotion[];
  total: number;
}

export interface PromotionUsageRecord {
  id: string;
  promotionId: string;
  userId: string;
  orderId: string | null;
  discountAmount: number;
  usedAt: Date;
}

export interface IPromotionRepository {
  findByCode(code: string): Promise<Promotion | null>;
  findById(id: string): Promise<Promotion | null>;
  findActivePromotions(): Promise<Promotion[]>;
  countUserUsages(promotionId: string, userId: string): Promise<number>;
  recordUsageAndIncrement(params: RecordPromotionUsageParams, tx?: any): Promise<void>;
  searchPromotions(params: PromotionSearchParams): Promise<PromotionSearchResult>;
  createPromotion(data: Partial<Promotion>): Promise<Promotion>;
  updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion>;
  deletePromotion(id: string): Promise<boolean>;
  getPromotionUsages(
    promotionId: string,
    page?: number,
    limit?: number,
  ): Promise<{ items: PromotionUsageRecord[]; total: number }>;
}
