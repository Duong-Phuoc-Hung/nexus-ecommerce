import crypto from 'node:crypto';
import { Pool } from 'pg';
import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { Promotion, PromotionStatus } from '../../domain/entities/Promotion';
import {
  IPromotionRepository,
  PromotionSearchParams,
  PromotionSearchResult,
  PromotionUsageRecord,
  RecordPromotionUsageParams,
} from '../../domain/repositories/IPromotionRepository';

export class PostgresPromotionRepository implements IPromotionRepository {
  private _prisma?: PrismaClient;

  constructor(
    private readonly pool?: Pool,
    prisma?: PrismaClient,
  ) {
    if (prisma) {
      this._prisma = prisma;
    }
  }

  private get prisma(): PrismaClient {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
  }

  private mapToEntity(row: any): Promotion {
    return new Promotion({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      discountType: row.discountType || row.discount_type,
      discountValue: Number(row.discountValue || row.discount_value),
      maxDiscountAmount: (() => {
        const val =
          row.maxDiscountAmount !== undefined ? row.maxDiscountAmount : row.max_discount_amount;
        return val !== null && val !== undefined ? Number(val) : null;
      })(),
      minOrderAmount: Number(row.minOrderAmount ?? row.min_order_amount ?? 0),
      usageLimit: Number(row.usageLimit ?? row.usage_limit ?? 1000),
      usedCount: Number(row.usedCount ?? row.used_count ?? 0),
      perUserLimit: Number(row.perUserLimit ?? row.per_user_limit ?? 1),
      scope: String(row.scope || 'ALL_USERS'),
      categoryIds: Array.isArray(row.categoryIds || row.category_ids)
        ? row.categoryIds || row.category_ids
        : typeof row.category_ids === 'string'
          ? JSON.parse(row.category_ids)
          : [],
      startsAt: new Date(row.startsAt || row.starts_at),
      endsAt: new Date(row.endsAt || row.ends_at),
      status: (row.status as PromotionStatus) || 'ACTIVE',
      createdBy: row.createdBy || row.created_by || null,
      updatedBy: row.updatedBy || row.updated_by || null,
      createdAt:
        row.createdAt || row.created_at ? new Date(row.createdAt || row.created_at) : undefined,
      updatedAt:
        row.updatedAt || row.updated_at ? new Date(row.updatedAt || row.updated_at) : undefined,
    });
  }

  public async findByCode(code: string): Promise<Promotion | null> {
    const normalized = code.trim().toUpperCase();
    try {
      const row = await this.prisma.promotion.findUnique({
        where: { code: normalized },
      });
      if (!row) return null;
      return this.mapToEntity(row);
    } catch {
      if (this.pool) {
        const res = await this.pool.query(
          `SELECT * FROM commerce_promotions WHERE UPPER(code) = $1 LIMIT 1`,
          [normalized],
        );
        if (res.rows.length === 0) return null;
        return this.mapToEntity(res.rows[0]);
      }
      return null;
    }
  }

  public async findById(id: string): Promise<Promotion | null> {
    const key = id.trim();
    try {
      const row = await this.prisma.promotion.findUnique({
        where: { id: key },
      });
      if (!row) return null;
      return this.mapToEntity(row);
    } catch {
      if (this.pool) {
        const res = await this.pool.query(
          `SELECT * FROM commerce_promotions WHERE id = $1 LIMIT 1`,
          [key],
        );
        if (res.rows.length === 0) return null;
        return this.mapToEntity(res.rows[0]);
      }
      return null;
    }
  }

  public async findActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    try {
      const rows = await this.prisma.promotion.findMany({
        where: {
          status: 'ACTIVE',
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        orderBy: { minOrderAmount: 'asc' },
      });
      return rows.map((r) => this.mapToEntity(r));
    } catch {
      if (this.pool) {
        const res = await this.pool.query(
          `SELECT * FROM commerce_promotions 
           WHERE status = 'ACTIVE' AND starts_at <= NOW() AND ends_at >= NOW()
           ORDER BY min_order_amount ASC`,
        );
        return res.rows.map((r: any) => this.mapToEntity(r));
      }
      return [];
    }
  }

  public async countUserUsages(promotionId: string, userId: string): Promise<number> {
    try {
      return await this.prisma.promotionUsage.count({
        where: {
          promotionId,
          userId,
        },
      });
    } catch {
      if (this.pool) {
        const res = await this.pool.query(
          `SELECT COUNT(*)::int AS count FROM commerce_promotion_usages WHERE promotion_id = $1 AND user_id = $2`,
          [promotionId, userId],
        );
        return res.rows[0]?.count || 0;
      }
      return 0;
    }
  }

  public async recordUsageAndIncrement(
    params: RecordPromotionUsageParams,
    tx?: any,
  ): Promise<void> {
    const client = tx || this.prisma;
    if (client.promotionUsage && client.promotion) {
      await client.promotionUsage.create({
        data: {
          promotionId: params.promotionId,
          userId: params.userId,
          orderId: params.orderId,
          discountAmount: params.discountAmount,
        },
      });
      await client.promotion.update({
        where: { id: params.promotionId },
        data: {
          usedCount: { increment: 1 },
        },
      });
    } else if (tx && typeof tx.query === 'function') {
      await tx.query(
        `INSERT INTO commerce_promotion_usages (promotion_id, user_id, order_id, discount_amount)
         VALUES ($1, $2, $3, $4)`,
        [params.promotionId, params.userId, params.orderId, params.discountAmount],
      );
      await tx.query(`UPDATE commerce_promotions SET used_count = used_count + 1 WHERE id = $1`, [
        params.promotionId,
      ]);
    }
  }

  public async searchPromotions(params: PromotionSearchParams): Promise<PromotionSearchResult> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 20)));
    const offset = (page - 1) * limit;

    const whereConditions: string[] = ['1=1'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.q && params.q.trim()) {
      const q = `%${params.q.trim().toUpperCase()}%`;
      whereConditions.push(`(UPPER(code) LIKE $${paramIndex} OR UPPER(name) LIKE $${paramIndex})`);
      queryParams.push(q);
      paramIndex++;
    }

    const now = new Date();
    if (params.status && params.status !== 'ALL') {
      const statusUpper = params.status.toUpperCase();
      if (statusUpper === 'SCHEDULED') {
        whereConditions.push(`status = 'ACTIVE' AND starts_at > $${paramIndex}`);
        queryParams.push(now);
        paramIndex++;
      } else if (statusUpper === 'EXPIRED') {
        whereConditions.push(`(status = 'EXPIRED' OR ends_at < $${paramIndex})`);
        queryParams.push(now);
        paramIndex++;
      } else if (statusUpper === 'ACTIVE') {
        whereConditions.push(
          `status = 'ACTIVE' AND starts_at <= $${paramIndex} AND ends_at >= $${paramIndex}`,
        );
        queryParams.push(now);
        paramIndex++;
      } else if (statusUpper === 'PAUSED') {
        whereConditions.push(`status = 'PAUSED'`);
      }
    }

    const whereClause = whereConditions.join(' AND ');

    if (this.pool) {
      const countRes = await this.pool.query(
        `SELECT COUNT(*)::int AS total FROM commerce_promotions WHERE ${whereClause}`,
        queryParams,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await this.pool.query(
        `SELECT * FROM commerce_promotions 
         WHERE ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset],
      );

      return {
        items: dataRes.rows.map((r: any) => this.mapToEntity(r)),
        total,
      };
    }

    // Prisma Fallback
    const rows = await this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });
    const total = await this.prisma.promotion.count();

    return {
      items: rows.map((r) => this.mapToEntity(r)),
      total,
    };
  }

  public async createPromotion(data: Partial<Promotion>): Promise<Promotion> {
    const id = data.id || crypto.randomUUID();
    const code = String(data.code || '')
      .trim()
      .toUpperCase();
    const name = String(data.name || '').trim();
    const description = data.description || null;
    const discountType = data.discountType || 'FIXED';
    const discountValue = Number(data.discountValue || 0);
    const maxDiscountAmount =
      data.maxDiscountAmount !== null && data.maxDiscountAmount !== undefined
        ? Number(data.maxDiscountAmount)
        : null;
    const minOrderAmount = Number(data.minOrderAmount || 0);
    const usageLimit = Number(data.usageLimit || 1000);
    const usedCount = 0;
    const perUserLimit = Number(data.perUserLimit || 1);
    const scope = data.scope || 'ALL_USERS';
    const categoryIds = JSON.stringify(data.categoryIds || []);
    const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    const endsAt = data.endsAt ? new Date(data.endsAt) : new Date(Date.now() + 30 * 86400000);
    const status = data.status || 'ACTIVE';
    const createdBy = data.createdBy || null;
    const updatedBy = data.updatedBy || null;

    if (this.pool) {
      const res = await this.pool.query(
        `INSERT INTO commerce_promotions (
          id, code, name, description, discount_type, discount_value, max_discount_amount,
          min_order_amount, usage_limit, used_count, per_user_limit, scope, category_ids,
          starts_at, ends_at, status, created_by, updated_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17, $18, NOW(), NOW()
        ) RETURNING *`,
        [
          id,
          code,
          name,
          description,
          discountType,
          discountValue,
          maxDiscountAmount,
          minOrderAmount,
          usageLimit,
          usedCount,
          perUserLimit,
          scope,
          categoryIds,
          startsAt,
          endsAt,
          status,
          createdBy,
          updatedBy,
        ],
      );
      return this.mapToEntity(res.rows[0]);
    }

    const row = await this.prisma.promotion.create({
      data: {
        id,
        code,
        name,
        description,
        discountType,
        discountValue,
        maxDiscountAmount,
        minOrderAmount,
        usageLimit,
        usedCount,
        perUserLimit,
        scope,
        categoryIds: data.categoryIds || [],
        startsAt,
        endsAt,
        status,
        createdBy,
        updatedBy,
      },
    });
    return this.mapToEntity(row);
  }

  public async updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Promotion not found with id: ${id}`);
    }

    const name = updates.name !== undefined ? updates.name : existing.name;
    const description =
      updates.description !== undefined ? updates.description : existing.description;
    const discountType =
      updates.discountType !== undefined ? updates.discountType : existing.discountType;
    const discountValue =
      updates.discountValue !== undefined ? Number(updates.discountValue) : existing.discountValue;
    const maxDiscountAmount =
      updates.maxDiscountAmount !== undefined
        ? updates.maxDiscountAmount
        : existing.maxDiscountAmount;
    const minOrderAmount =
      updates.minOrderAmount !== undefined
        ? Number(updates.minOrderAmount)
        : existing.minOrderAmount;
    const usageLimit =
      updates.usageLimit !== undefined ? Number(updates.usageLimit) : existing.usageLimit;
    const perUserLimit =
      updates.perUserLimit !== undefined ? Number(updates.perUserLimit) : existing.perUserLimit;
    const scope = updates.scope !== undefined ? updates.scope : existing.scope;
    const categoryIds =
      updates.categoryIds !== undefined ? updates.categoryIds : existing.categoryIds;
    const startsAt = updates.startsAt ? new Date(updates.startsAt) : existing.startsAt;
    const endsAt = updates.endsAt ? new Date(updates.endsAt) : existing.endsAt;
    const status = updates.status !== undefined ? updates.status : existing.status;
    const updatedBy = updates.updatedBy || null;

    if (this.pool) {
      const res = await this.pool.query(
        `UPDATE commerce_promotions SET
          name = $1, description = $2, discount_type = $3, discount_value = $4,
          max_discount_amount = $5, min_order_amount = $6, usage_limit = $7,
          per_user_limit = $8, scope = $9, category_ids = $10::jsonb,
          starts_at = $11, ends_at = $12, status = $13, updated_by = $14, updated_at = NOW()
        WHERE id = $15 RETURNING *`,
        [
          name,
          description,
          discountType,
          discountValue,
          maxDiscountAmount,
          minOrderAmount,
          usageLimit,
          perUserLimit,
          scope,
          JSON.stringify(categoryIds),
          startsAt,
          endsAt,
          status,
          updatedBy,
          id,
        ],
      );
      return this.mapToEntity(res.rows[0]);
    }

    const row = await this.prisma.promotion.update({
      where: { id },
      data: {
        name,
        description,
        discountType,
        discountValue,
        maxDiscountAmount,
        minOrderAmount,
        usageLimit,
        perUserLimit,
        scope,
        categoryIds: categoryIds as any,
        startsAt,
        endsAt,
        status,
        updatedBy,
      },
    });
    return this.mapToEntity(row);
  }

  public async deletePromotion(id: string): Promise<boolean> {
    if (this.pool) {
      const res = await this.pool.query(`DELETE FROM commerce_promotions WHERE id = $1`, [id]);
      return (res.rowCount || 0) > 0;
    }
    await this.prisma.promotion.delete({ where: { id } });
    return true;
  }

  public async getPromotionUsages(
    promotionId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: PromotionUsageRecord[]; total: number }> {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    if (this.pool) {
      const countRes = await this.pool.query(
        `SELECT COUNT(*)::int AS total FROM commerce_promotion_usages WHERE promotion_id = $1`,
        [promotionId],
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await this.pool.query(
        `SELECT id, promotion_id, user_id, order_id, discount_amount, used_at
         FROM commerce_promotion_usages
         WHERE promotion_id = $1
         ORDER BY used_at DESC
         LIMIT $2 OFFSET $3`,
        [promotionId, limitNum, offset],
      );

      const items: PromotionUsageRecord[] = dataRes.rows.map((r: any) => ({
        id: String(r.id),
        promotionId: String(r.promotion_id),
        userId: String(r.user_id),
        orderId: r.order_id ? String(r.order_id) : null,
        discountAmount: Number(r.discount_amount),
        usedAt: new Date(r.used_at),
      }));

      return { items, total };
    }

    const total = await this.prisma.promotionUsage.count({ where: { promotionId } });
    const rows = await this.prisma.promotionUsage.findMany({
      where: { promotionId },
      orderBy: { usedAt: 'desc' },
      skip: offset,
      take: limitNum,
    });

    const items: PromotionUsageRecord[] = rows.map((r) => ({
      id: String(r.id),
      promotionId: String(r.promotionId),
      userId: String(r.userId),
      orderId: r.orderId ? String(r.orderId) : null,
      discountAmount: Number(r.discountAmount),
      usedAt: new Date(r.usedAt),
    }));

    return { items, total };
  }
}
