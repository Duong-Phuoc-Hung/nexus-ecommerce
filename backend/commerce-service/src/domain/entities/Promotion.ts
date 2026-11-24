export type PromotionDiscountType = 'FIXED' | 'PERCENT';
export type PromotionStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export type PromotionReasonCode =
  | 'PROMO_NOT_FOUND'
  | 'PROMO_EXPIRED'
  | 'PROMO_OUT_OF_QUOTA'
  | 'PROMO_USER_LIMIT_REACHED'
  | 'PROMO_MIN_ORDER_NOT_MET'
  | 'PROMO_INELIGIBLE_ITEMS';

export interface PromotionProps {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  startsAt: Date;
  endsAt: Date;
  status: PromotionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Promotion {
  public readonly id: string;
  public readonly code: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly discountType: PromotionDiscountType;
  public readonly discountValue: number;
  public readonly maxDiscountAmount: number | null;
  public readonly minOrderAmount: number;
  public readonly usageLimit: number;
  public readonly usedCount: number;
  public readonly perUserLimit: number;
  public readonly startsAt: Date;
  public readonly endsAt: Date;
  public readonly status: PromotionStatus;

  constructor(props: PromotionProps) {
    this.id = props.id;
    this.code = props.code.toUpperCase();
    this.name = props.name;
    this.description = props.description ?? null;
    this.discountType = props.discountType;
    this.discountValue = Number(props.discountValue);
    this.maxDiscountAmount =
      props.maxDiscountAmount !== undefined && props.maxDiscountAmount !== null
        ? Number(props.maxDiscountAmount)
        : null;
    this.minOrderAmount = Number(props.minOrderAmount || 0);
    this.usageLimit = Number(props.usageLimit || 1000);
    this.usedCount = Number(props.usedCount || 0);
    this.perUserLimit = Number(props.perUserLimit || 1);
    this.startsAt = new Date(props.startsAt);
    this.endsAt = new Date(props.endsAt);
    this.status = props.status;
  }

  public isWithinValidityPeriod(now: Date = new Date()): boolean {
    return now >= this.startsAt && now <= this.endsAt;
  }

  public isQuotaAvailable(): boolean {
    return this.usedCount < this.usageLimit;
  }

  public calculateDiscount(subtotal: number): number {
    if (subtotal < this.minOrderAmount) {
      return 0;
    }

    let calculated = 0;
    if (this.discountType === 'PERCENT') {
      calculated = Math.round((subtotal * this.discountValue) / 100);
      if (this.maxDiscountAmount !== null && this.maxDiscountAmount > 0) {
        calculated = Math.min(calculated, this.maxDiscountAmount);
      }
    } else {
      calculated = this.discountValue;
    }

    return Math.max(0, Math.min(calculated, subtotal));
  }
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  userId: string;
  orderId: string | null;
  discountAmount: number;
  usedAt: Date;
}
