import { Pool } from 'pg';
import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { Promotion, PromotionStatus } from '../../domain/entities/Promotion';
import {
  IPromotionRepository,
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
      discountType: row.discountType as any,
      discountValue: Number(row.discountValue),
      maxDiscountAmount:
        row.maxDiscountAmount !== null && row.maxDiscountAmount !== undefined
          ? Number(row.maxDiscountAmount)
          : null,
      minOrderAmount: Number(row.minOrderAmount || 0),
      usageLimit: Number(row.usageLimit || 1000),
      usedCount: Number(row.usedCount || 0),
      perUserLimit: Number(row.perUserLimit || 1),
      startsAt: new Date(row.startsAt),
      endsAt: new Date(row.endsAt),
      status: row.status as PromotionStatus,
      createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
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
    } catch (err) {
      // Fallback query directly via pg pool if needed
      if (this.pool) {
        const res = await this.pool.query(
          `SELECT * FROM commerce_promotions WHERE UPPER(code) = $1 LIMIT 1`,
          [normalized],
        );
        if (res.rows.length === 0) return null;
        const r = res.rows[0];
        return this.mapToEntity({
          id: r.id,
          code: r.code,
          name: r.name,
          description: r.description,
          discountType: r.discount_type,
          discountValue: r.discount_value,
          maxDiscountAmount: r.max_discount_amount,
          minOrderAmount: r.min_order_amount,
          usageLimit: r.usage_limit,
          usedCount: r.used_count,
          perUserLimit: r.per_user_limit,
          startsAt: r.starts_at,
          endsAt: r.ends_at,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        });
      }
      throw err;
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
    } catch (err) {
      if (this.pool) {
        const res = await this.pool.query(
          `SELECT * FROM commerce_promotions 
           WHERE status = 'ACTIVE' AND starts_at <= NOW() AND ends_at >= NOW()
           ORDER BY min_order_amount ASC`,
        );
        return res.rows.map((r) =>
          this.mapToEntity({
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            discountType: r.discount_type,
            discountValue: r.discount_value,
            maxDiscountAmount: r.max_discount_amount,
            minOrderAmount: r.min_order_amount,
            usageLimit: r.usage_limit,
            usedCount: r.used_count,
            perUserLimit: r.per_user_limit,
            startsAt: r.starts_at,
            endsAt: r.ends_at,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }),
        );
      }
      throw err;
    }
  }

  public async countUserUsages(promotionId: string, userId: string): Promise<number> {
    try {
      const count = await this.prisma.promotionUsage.count({
        where: {
          promotionId,
          userId,
        },
      });
      return count;
    } catch (err) {
      if (this.pool) {
        const res = await this.pool.query(
          `SELECT COUNT(*)::int AS count FROM commerce_promotion_usages WHERE promotion_id = $1 AND user_id = $2`,
          [promotionId, userId],
        );
        return res.rows[0]?.count || 0;
      }
      throw err;
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
      // Raw pg client in transaction
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
}
