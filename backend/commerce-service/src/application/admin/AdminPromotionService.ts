import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { Promotion } from '../../domain/entities/Promotion';

export interface CreatePromotionDto {
  code: string;
  name: string;
  description?: string;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  scope?: string;
  categoryIds?: string[];
  startsAt: string | Date;
  endsAt: string | Date;
}

export interface UpdatePromotionDto {
  code?: string;
  name?: string;
  description?: string;
  discountType?: 'FIXED' | 'PERCENT';
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  scope?: string;
  categoryIds?: string[];
  startsAt?: string | Date;
  endsAt?: string | Date;
}

export class AdminPromotionService {
  constructor(private readonly promotionRepo: IPromotionRepository) {}

  public async listPromotions(params: {
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 20)));
    const { items, total } = await this.promotionRepo.searchPromotions({
      q: params.q,
      status: params.status,
      page,
      limit,
    });

    const now = new Date();
    const data = items.map((p) => {
      let displayStatus = p.status;
      if (p.status === 'ACTIVE') {
        if (now < p.startsAt) {
          displayStatus = 'SCHEDULED' as any;
        } else if (now > p.endsAt) {
          displayStatus = 'EXPIRED' as any;
        }
      } else if (now > p.endsAt && p.status !== 'PAUSED') {
        displayStatus = 'EXPIRED' as any;
      }

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        discountType: p.discountType,
        discountValue: p.discountValue,
        maxDiscountAmount: p.maxDiscountAmount,
        minOrderAmount: p.minOrderAmount,
        usageLimit: p.usageLimit,
        usedCount: p.usedCount,
        perUserLimit: p.perUserLimit,
        scope: p.scope,
        categoryIds: p.categoryIds,
        startsAt: p.startsAt.toISOString(),
        endsAt: p.endsAt.toISOString(),
        status: p.status,
        displayStatus,
        createdBy: p.createdBy,
        updatedBy: p.updatedBy,
        createdAt: p.createdAt ? p.createdAt.toISOString() : undefined,
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : undefined,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  public async createPromotion(dto: CreatePromotionDto, adminUserId: string): Promise<any> {
    const code = (dto.code || '').trim().toUpperCase();
    const codeRegex = /^[A-Z0-9_-]{3,32}$/;
    if (!codeRegex.test(code)) {
      const err: any = new Error(
        'Mã khuyến mãi không hợp lệ. Mã phải từ 3 đến 32 ký tự, chỉ gồm chữ in hoa, số, dấu gạch dưới hoặc gạch ngang.',
      );
      err.code = 'INVALID_PROMOTION_CODE';
      err.status = 400;
      throw err;
    }

    const existing = await this.promotionRepo.findByCode(code);
    if (existing) {
      const err: any = new Error(`Mã khuyến mãi '${code}' đã tồn tại trong hệ thống.`);
      err.code = 'PROMOTION_CODE_EXISTS';
      err.status = 409;
      throw err;
    }

    if (!dto.name || !dto.name.trim()) {
      const err: any = new Error('Tên chương trình khuyến mãi không được để trống.');
      err.code = 'INVALID_PROMOTION_NAME';
      err.status = 400;
      throw err;
    }

    const discountType = dto.discountType || 'FIXED';
    const discountValue = Number(dto.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      const err: any = new Error('Giá trị giảm giá phải lớn hơn 0.');
      err.code = 'INVALID_DISCOUNT_VALUE';
      err.status = 400;
      throw err;
    }

    let maxDiscountAmount =
      dto.maxDiscountAmount !== null && dto.maxDiscountAmount !== undefined
        ? Number(dto.maxDiscountAmount)
        : null;

    if (discountType === 'PERCENT') {
      if (discountValue < 1 || discountValue > 90) {
        const err: any = new Error('Phần trăm giảm giá phải nằm trong khoảng từ 1% đến 90%.');
        err.code = 'INVALID_PERCENT_VALUE';
        err.status = 400;
        throw err;
      }
      if (!maxDiscountAmount || maxDiscountAmount <= 0) {
        const err: any = new Error(
          'Với hình thức giảm phần trăm, bắt buộc phải thiết lập mức giảm tối đa (maxDiscountAmount > 0).',
        );
        err.code = 'MAX_DISCOUNT_REQUIRED';
        err.status = 400;
        throw err;
      }
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      const err: any = new Error('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
      err.code = 'INVALID_DATE_RANGE';
      err.status = 400;
      throw err;
    }

    const usageLimit = dto.usageLimit !== undefined ? Number(dto.usageLimit) : 1000;
    if (usageLimit < 1) {
      const err: any = new Error('Hạn mức sử dụng toàn sàn (usageLimit) tối thiểu là 1.');
      err.code = 'INVALID_USAGE_LIMIT';
      err.status = 400;
      throw err;
    }

    const perUserLimit = dto.perUserLimit !== undefined ? Number(dto.perUserLimit) : 1;
    if (perUserLimit < 1) {
      const err: any = new Error('Hạn mức sử dụng mỗi người dùng (perUserLimit) tối thiểu là 1.');
      err.code = 'INVALID_PER_USER_LIMIT';
      err.status = 400;
      throw err;
    }

    const minOrderAmount = dto.minOrderAmount !== undefined ? Number(dto.minOrderAmount) : 0;
    if (minOrderAmount < 0) {
      const err: any = new Error('Giá trị đơn hàng tối thiểu không được âm.');
      err.code = 'INVALID_MIN_ORDER_AMOUNT';
      err.status = 400;
      throw err;
    }

    const created = await this.promotionRepo.createPromotion({
      code,
      name: dto.name.trim(),
      description: dto.description || null,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit,
      perUserLimit,
      scope: dto.scope || 'ALL_USERS',
      categoryIds: Array.isArray(dto.categoryIds) ? dto.categoryIds : [],
      startsAt,
      endsAt,
      status: 'ACTIVE',
      createdBy: adminUserId,
      updatedBy: adminUserId,
    });

    return created;
  }

  public async updatePromotion(
    id: string,
    dto: UpdatePromotionDto,
    adminUserId: string,
  ): Promise<any> {
    const existing = await this.promotionRepo.findById(id);
    if (!existing) {
      const err: any = new Error(`Không tìm thấy mã khuyến mãi với id: ${id}`);
      err.code = 'PROMOTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      if (existing.usedCount > 0) {
        const err: any = new Error(
          'Mã khuyến mãi đã có đơn hàng sử dụng, không được phép thay đổi ký tự mã code.',
        );
        err.code = 'PROMOTION_CODE_LOCKED';
        err.status = 409;
        throw err;
      }
      const newCode = dto.code.trim().toUpperCase();
      const codeRegex = /^[A-Z0-9_-]{3,32}$/;
      if (!codeRegex.test(newCode)) {
        const err: any = new Error('Mã khuyến mãi mới không hợp lệ theo định dạng chuẩn.');
        err.code = 'INVALID_PROMOTION_CODE';
        err.status = 400;
        throw err;
      }
      const dup = await this.promotionRepo.findByCode(newCode);
      if (dup && dup.id !== id) {
        const err: any = new Error(
          `Mã khuyến mãi '${newCode}' đã được sử dụng bởi chiến dịch khác.`,
        );
        err.code = 'PROMOTION_CODE_EXISTS';
        err.status = 409;
        throw err;
      }
    }

    if (dto.usageLimit !== undefined && Number(dto.usageLimit) < existing.usedCount) {
      const err: any = new Error(
        `Không thể hạ hạn mức tổng (${dto.usageLimit}) thấp hơn số lượt đã sử dụng thực tế (${existing.usedCount}).`,
      );
      err.code = 'USAGE_LIMIT_TOO_LOW';
      err.status = 400;
      throw err;
    }

    const discountType = dto.discountType || existing.discountType;
    const discountValue =
      dto.discountValue !== undefined ? Number(dto.discountValue) : existing.discountValue;
    const maxDiscountAmount =
      dto.maxDiscountAmount !== undefined ? dto.maxDiscountAmount : existing.maxDiscountAmount;

    if (discountType === 'PERCENT') {
      if (discountValue < 1 || discountValue > 90) {
        const err: any = new Error('Phần trăm giảm giá phải từ 1% đến 90%.');
        err.code = 'INVALID_PERCENT_VALUE';
        err.status = 400;
        throw err;
      }
      if (!maxDiscountAmount || maxDiscountAmount <= 0) {
        const err: any = new Error('Giảm theo phần trăm bắt buộc phải có mức giảm tối đa > 0.');
        err.code = 'MAX_DISCOUNT_REQUIRED';
        err.status = 400;
        throw err;
      }
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) {
      const err: any = new Error('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
      err.code = 'INVALID_DATE_RANGE';
      err.status = 400;
      throw err;
    }

    const updated = await this.promotionRepo.updatePromotion(id, {
      name: dto.name,
      description: dto.description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount: dto.minOrderAmount,
      usageLimit: dto.usageLimit,
      perUserLimit: dto.perUserLimit,
      scope: dto.scope,
      categoryIds: dto.categoryIds,
      startsAt,
      endsAt,
      updatedBy: adminUserId,
    });

    return updated;
  }

  public async updatePromotionStatus(
    id: string,
    status: 'ACTIVE' | 'PAUSED',
    _reason: string | undefined,
    adminUserId: string,
  ): Promise<any> {
    if (status !== 'ACTIVE' && status !== 'PAUSED') {
      const err: any = new Error("Trạng thái cập nhật chỉ chấp nhận 'ACTIVE' hoặc 'PAUSED'.");
      err.code = 'INVALID_STATUS';
      err.status = 400;
      throw err;
    }

    const existing = await this.promotionRepo.findById(id);
    if (!existing) {
      const err: any = new Error(`Không tìm thấy mã khuyến mãi với id: ${id}`);
      err.code = 'PROMOTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updated = await this.promotionRepo.updatePromotion(id, {
      status,
      updatedBy: adminUserId,
    });

    return updated;
  }

  public async deletePromotion(id: string): Promise<boolean> {
    const existing = await this.promotionRepo.findById(id);
    if (!existing) {
      const err: any = new Error(`Không tìm thấy mã khuyến mãi với id: ${id}`);
      err.code = 'PROMOTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (existing.usedCount > 0) {
      const err: any = new Error(
        'Mã khuyến mãi đã có đơn hàng sử dụng trong lịch sử giao dịch, không thể xóa để bảo toàn dữ liệu kế toán. Bạn có thể chuyển trạng thái sang Tạm dừng (PAUSED).',
      );
      err.code = 'PROMOTION_ALREADY_USED';
      err.status = 409;
      throw err;
    }

    return await this.promotionRepo.deletePromotion(id);
  }

  public async getPromotionUsages(
    id: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const existing = await this.promotionRepo.findById(id);
    if (!existing) {
      const err: any = new Error(`Không tìm thấy mã khuyến mãi với id: ${id}`);
      err.code = 'PROMOTION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const { items, total } = await this.promotionRepo.getPromotionUsages(id, page, limit);

    return {
      data: items.map((u) => ({
        id: u.id,
        orderId: u.orderId,
        userId: u.userId,
        discountAmount: u.discountAmount,
        usedAt: u.usedAt.toISOString(),
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    };
  }
}
