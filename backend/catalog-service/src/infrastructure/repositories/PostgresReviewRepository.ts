import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { IReviewRepository } from '../../domain/repositories/IReviewRepository';
import { Review } from '../../domain/entities/Review';

export class PostgresReviewRepository implements IReviewRepository {
  private _prisma?: any;

  constructor(prisma?: PrismaClient) {
    if (prisma) this._prisma = prisma;
  }

  private get prisma(): any {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
  }

  public async findByProductId(productId: string): Promise<Review[]> {
    const rows = await this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(
      (r: any) =>
        new Review({
          id: String(r.id),
          productId: String(r.productId),
          userId: String(r.userId),
          userName: r.userName || 'Người mua ẩn danh',
          rating: Number(r.rating),
          comment: r.comment || '',
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        }),
    );
  }

  public async save(review: Review): Promise<void> {
    await this.prisma.review.create({
      data: {
        id: review.id,
        productId: review.productId,
        userId: review.userId,
        userName: review.userName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    });
  }

  public async findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    const row = await this.prisma.review.findFirst({
      where: { userId, productId },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) return null;
    return new Review({
      id: String(row.id),
      productId: String(row.productId),
      userId: String(row.userId),
      userName: row.userName || 'Người mua ẩn danh',
      rating: Number(row.rating),
      comment: row.comment || '',
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
