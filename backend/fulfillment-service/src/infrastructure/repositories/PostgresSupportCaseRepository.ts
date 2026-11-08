import { Pool } from 'pg';
import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  SupportCase,
  SupportCasePriority,
  SupportCaseStatus,
} from '../../domain/entities/SupportCase';
import {
  ISupportCaseRepository,
  SupportCaseSearchCriteria,
  SupportCaseSearchPage,
} from '../../domain/repositories/ISupportCaseRepository';
import { loadSeedSupportCases } from '../seeds/fulfillmentSeedLoader';

export class PostgresSupportCaseRepository implements ISupportCaseRepository {
  private isInitialized = false;
  private _prisma?: PrismaClient;

  constructor(prismaOrPool?: PrismaClient | Pool) {
    if (prismaOrPool && 'supportCase' in prismaOrPool) {
      this._prisma = prismaOrPool as PrismaClient;
    }
  }

  private get prisma(): PrismaClient {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
  }

  /**
   * Nạp 3 ticket mẫu nếu bảng rỗng.
   */
  public async seedIfEmpty(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const count = await this.prisma.supportCase.count();
      if (count === 0) {
        await this.seedInitialCases();
      }
    } catch (err) {
      console.warn('[PostgresSupportCaseRepository] Seed check warning:', (err as Error).message);
    }
  }

  public async findById(id: string): Promise<SupportCase | null> {
    const cleanId = id.trim();

    try {
      const row = await this.prisma.supportCase.findFirst({
        where: {
          id: {
            equals: cleanId,
            mode: 'insensitive',
          },
        },
      });

      if (!row) {
        return null;
      }

      return this.mapToDomain(row);
    } catch (err) {
      console.error('[PostgresSupportCaseRepository] findById error:', (err as Error).message);
      return null;
    }
  }

  public async search(criteria: SupportCaseSearchCriteria): Promise<SupportCaseSearchPage> {
    const where: any = {};

    // 1. Lọc theo userId
    if (criteria.userId && criteria.userId.trim().length > 0) {
      where.userId = {
        equals: criteria.userId.trim(),
        mode: 'insensitive',
      };
    }

    // 2. Lọc theo status
    if (criteria.status && criteria.status.trim().length > 0) {
      where.status = {
        equals: criteria.status.trim(),
        mode: 'insensitive',
      };
    }

    // 3. Lọc theo priority
    if (criteria.priority && criteria.priority.trim().length > 0) {
      where.priority = {
        equals: criteria.priority.trim(),
        mode: 'insensitive',
      };
    }

    // 4. Lọc theo từ khóa tìm kiếm (query)
    if (criteria.query && criteria.query.trim().length > 0) {
      const q = criteria.query.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { orderId: { contains: q, mode: 'insensitive' } },
        { orderCode: { contains: q, mode: 'insensitive' } },
        { customer: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Phân trang
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(100, criteria.limit || 10));
    const offset = (page - 1) * limit;

    try {
      const [total, rows] = await Promise.all([
        this.prisma.supportCase.count({ where }),
        this.prisma.supportCase.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      // Sắp xếp ưu tiên: Cao trước, sau đó mới nhất lên đầu
      const priorityWeight: Record<string, number> = {
        CAO: 1,
        HIGH: 1,
        'TRUNG BÌNH': 2,
        MEDIUM: 2,
        THẤP: 3,
        LOW: 3,
      };

      rows.sort((a, b) => {
        const wA = priorityWeight[(a.priority || '').toUpperCase()] || 3;
        const wB = priorityWeight[(b.priority || '').toUpperCase()] || 3;
        if (wA !== wB) return wA - wB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        items: rows.map((r) => this.mapToDomain(r)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (err) {
      console.error('[PostgresSupportCaseRepository] search error:', (err as Error).message);
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      };
    }
  }

  public async save(caseItem: SupportCase): Promise<void> {
    await this.prisma.supportCase.upsert({
      where: { id: caseItem.id },
      create: {
        id: caseItem.id,
        type: caseItem.type,
        orderId: caseItem.orderId,
        orderCode: caseItem.orderCode,
        userId: caseItem.userId,
        customer: caseItem.customer,
        reason: caseItem.reason,
        priority: caseItem.priority,
        status: caseItem.status,
        resolutionNote: caseItem.resolutionNote || null,
        resolvedBy: caseItem.resolvedBy || null,
        createdAt: caseItem.createdAt,
        updatedAt: caseItem.updatedAt,
      },
      update: {
        type: caseItem.type,
        orderId: caseItem.orderId,
        orderCode: caseItem.orderCode,
        userId: caseItem.userId,
        customer: caseItem.customer,
        reason: caseItem.reason,
        priority: caseItem.priority,
        status: caseItem.status,
        resolutionNote: caseItem.resolutionNote || null,
        resolvedBy: caseItem.resolvedBy || null,
        updatedAt: caseItem.updatedAt,
      },
    });
  }

  private mapToDomain(row: {
    id: string;
    type: string;
    orderId: string;
    orderCode: string;
    userId: string;
    customer: string;
    reason: string;
    priority: string;
    status: string;
    resolutionNote?: string | null;
    resolvedBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SupportCase {
    return new SupportCase({
      id: row.id,
      type: row.type,
      orderId: row.orderId,
      orderCode: row.orderCode,
      userId: row.userId,
      customer: row.customer,
      reason: row.reason,
      priority: row.priority as SupportCasePriority,
      status: row.status as SupportCaseStatus,
      resolutionNote: row.resolutionNote || undefined,
      resolvedBy: row.resolvedBy || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  private async seedInitialCases(): Promise<void> {
    const samples = loadSeedSupportCases();

    for (const item of samples) {
      await this.save(item);
    }

    console.log(
      `[PostgresSupportCaseRepository] Đã khởi tạo ${samples.length} support cases mẫu từ seed JSON vào PostgreSQL (Prisma ORM) thành công.`,
    );
  }
}
