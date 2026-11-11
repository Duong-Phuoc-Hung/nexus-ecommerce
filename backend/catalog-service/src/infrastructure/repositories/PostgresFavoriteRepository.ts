import { PrismaClient } from '@prisma/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { IFavoriteRepository } from '../../domain/repositories/IFavoriteRepository';
import { Favorite } from '../../domain/entities/Favorite';
import { Product } from '../../domain/entities/Product';
import { PostgresProductRepository } from './PostgresProductRepository';

export class PostgresFavoriteRepository implements IFavoriteRepository {
  private _prisma?: any;
  private readonly productRepository: PostgresProductRepository;

  constructor(prisma?: PrismaClient) {
    if (prisma) this._prisma = prisma;
    this.productRepository = new PostgresProductRepository(prisma);
  }

  private get prisma(): any {
    if (!this._prisma) {
      this._prisma = PrismaClientWrapper.getInstance();
    }
    return this._prisma;
  }

  public async findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null> {
    const row = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!row) return null;
    return new Favorite({
      id: row.id,
      userId: row.userId,
      productId: row.productId,
      createdAt: row.createdAt,
    });
  }

  public async findProductsByUserId(userId: string): Promise<Product[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { orderBy: { displayOrder: 'asc' } },
            attributes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const products: Product[] = [];
    for (const row of rows) {
      if (row.product && !row.product.deletedAt) {
        // Map row product using existing mapping logic
        const p = await this.productRepository.findById(row.product.id);
        if (p) products.push(p);
      }
    }
    return products;
  }

  public async add(favorite: Favorite): Promise<void> {
    await this.prisma.favorite.create({
      data: {
        id: favorite.id,
        userId: favorite.userId,
        productId: favorite.productId,
        createdAt: favorite.createdAt,
      },
    });
  }

  public async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({
      where: {
        userId,
        productId,
      },
    });
  }
}
