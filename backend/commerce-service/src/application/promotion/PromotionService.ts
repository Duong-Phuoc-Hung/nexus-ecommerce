import { Promotion, PromotionReasonCode } from '../../domain/entities/Promotion';
import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { ICatalogClient } from '../checkout/ports';

export interface ValidatePromotionInput {
  code: string;
  userId: string;
  subtotal?: number;
  items?: Array<{ productId: string; quantity: number; unitPrice?: number }>;
}

export interface ValidatePromotionResult {
  valid: boolean;
  code: string;
  name: string | null;
  discountAmount: number;
  subtotal: number;
  reasonCode: PromotionReasonCode | null;
  message: string;
  promotion?: Promotion;
}

export interface PromotionListItemDto {
  code: string;
  name: string;
  description: string | null;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  endsAt: string;
  eligible: boolean;
  estimatedDiscount: number;
  ineligibleReason: string | null;
}

export class PromotionService {
  constructor(
    private readonly promotionRepository: IPromotionRepository,
    private readonly catalogClient?: ICatalogClient,
  ) {}

  public async getPromotionByCode(code: string): Promise<Promotion | null> {
    return this.promotionRepository.findByCode(code);
  }

  public async validatePromotion(input: ValidatePromotionInput): Promise<ValidatePromotionResult> {
    const rawCode = input.code ? input.code.trim().toUpperCase() : '';
    if (!rawCode) {
      return {
        valid: false,
        code: '',
        name: null,
        discountAmount: 0,
        subtotal: 0,
        reasonCode: 'PROMO_NOT_FOUND',
        message: 'Mã giảm giá không được để trống.',
      };
    }

    const promo = await this.promotionRepository.findByCode(rawCode);
    if (!promo) {
      return {
        valid: false,
        code: rawCode,
        name: null,
        discountAmount: 0,
        subtotal: input.subtotal || 0,
        reasonCode: 'PROMO_NOT_FOUND',
        message: `Mã giảm giá "${rawCode}" không tồn tại trên hệ thống.`,
      };
    }

    const now = new Date();
    if (promo.status !== 'ACTIVE' || !promo.isWithinValidityPeriod(now)) {
      return {
        valid: false,
        code: promo.code,
        name: promo.name,
        discountAmount: 0,
        subtotal: input.subtotal || 0,
        reasonCode: 'PROMO_EXPIRED',
        message: `Mã giảm giá "${promo.code}" đã hết hạn hoặc chưa tới thời gian áp dụng.`,
      };
    }

    if (!promo.isQuotaAvailable()) {
      return {
        valid: false,
        code: promo.code,
        name: promo.name,
        discountAmount: 0,
        subtotal: input.subtotal || 0,
        reasonCode: 'PROMO_OUT_OF_QUOTA',
        message: `Mã giảm giá "${promo.code}" đã hết lượt sử dụng trên toàn hệ thống.`,
      };
    }

    if (input.userId) {
      const userUsageCount = await this.promotionRepository.countUserUsages(promo.id, input.userId);
      if (userUsageCount >= promo.perUserLimit) {
        return {
          valid: false,
          code: promo.code,
          name: promo.name,
          discountAmount: 0,
          subtotal: input.subtotal || 0,
          reasonCode: 'PROMO_USER_LIMIT_REACHED',
          message: `Bạn đã sử dụng hết số lượt cho phép (${promo.perUserLimit} lần) của mã "${promo.code}".`,
        };
      }
    }

    // Determine subtotal: use input.subtotal or calculate from items and catalog
    let calculatedSubtotal = input.subtotal !== undefined ? Number(input.subtotal) : 0;
    if (input.items && input.items.length > 0 && (!input.subtotal || input.subtotal <= 0)) {
      calculatedSubtotal = 0;
      for (const item of input.items) {
        let price = item.unitPrice || 0;
        if (!price && this.catalogClient) {
          try {
            const p = await this.catalogClient.findProduct(item.productId);
            if (p) price = p.price;
          } catch {
            // ignore
          }
        }
        calculatedSubtotal += price * item.quantity;
      }
    }

    if (calculatedSubtotal < promo.minOrderAmount) {
      const formattedMin = new Intl.NumberFormat('vi-VN').format(promo.minOrderAmount);
      return {
        valid: false,
        code: promo.code,
        name: promo.name,
        discountAmount: 0,
        subtotal: calculatedSubtotal,
        reasonCode: 'PROMO_MIN_ORDER_NOT_MET',
        message: `Đơn hàng chưa đạt giá trị tối thiểu ${formattedMin} ₫ để áp dụng mã này.`,
      };
    }

    const discountAmount = promo.calculateDiscount(calculatedSubtotal);
    const formattedDiscount = new Intl.NumberFormat('vi-VN').format(discountAmount);

    return {
      valid: true,
      code: promo.code,
      name: promo.name,
      discountAmount,
      subtotal: calculatedSubtotal,
      reasonCode: null,
      message: `Áp dụng thành công mã ${promo.code} (-${formattedDiscount} ₫).`,
      promotion: promo,
    };
  }

  public async getEligiblePromotions(
    userId: string,
    subtotal?: number,
  ): Promise<PromotionListItemDto[]> {
    const promos = await this.promotionRepository.findActivePromotions();
    const result: PromotionListItemDto[] = [];

    for (const promo of promos) {
      let eligible = true;
      let ineligibleReason: string | null = null;

      if (!promo.isQuotaAvailable()) {
        eligible = false;
        ineligibleReason = 'Đã hết lượt sử dụng toàn sàn';
      } else if (userId) {
        const usageCount = await this.promotionRepository.countUserUsages(promo.id, userId);
        if (usageCount >= promo.perUserLimit) {
          eligible = false;
          ineligibleReason = 'Bạn đã dùng hết lượt cho mã này';
        }
      }

      if (eligible && subtotal !== undefined) {
        if (subtotal < promo.minOrderAmount) {
          eligible = false;
          const formattedMin = new Intl.NumberFormat('vi-VN').format(promo.minOrderAmount);
          ineligibleReason = `Đơn tối thiểu ${formattedMin} ₫`;
        }
      }

      const estimatedDiscount = subtotal ? promo.calculateDiscount(subtotal) : 0;

      result.push({
        code: promo.code,
        name: promo.name,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maxDiscountAmount: promo.maxDiscountAmount,
        minOrderAmount: promo.minOrderAmount,
        endsAt: promo.endsAt.toISOString(),
        eligible,
        estimatedDiscount,
        ineligibleReason,
      });
    }

    return result;
  }
}
