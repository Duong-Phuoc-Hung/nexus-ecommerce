import { PrismaClient } from '@prisma/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Category } from '../../domain/entities/Category';

export class PostgresCategoryRepository implements ICategoryRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || PrismaClientWrapper.getInstance();
  }

  public async findAllActive(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.mapRowToCategory(row));
  }

  public async findById(id: string): Promise<Category | null> {
    const isNumeric = /^\d+$/.test(id);
    const row = isNumeric
      ? await this.prisma.category.findUnique({
          where: { id: BigInt(id) },
        })
      : await this.prisma.category.findUnique({
          where: { slug: id },
        });

    if (!row) {
      return null;
    }
    return this.mapRowToCategory(row);
  }

  private mapRowToCategory(row: any): Category {
    return new Category({
      id: String(row.id),
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      imageUrl: row.imageUrl || '',
      parentId: row.parentId !== null && row.parentId !== undefined ? String(row.parentId) : null,
      level: Number(row.level),
      isActive: Boolean(row.isActive),
      displayOrder: Number(row.displayOrder),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
