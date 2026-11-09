import { Pool } from 'pg';
import { PrismaClient } from '../database/generated/client';
import { PrismaClientWrapper } from '../database/PrismaClient';
import {
  CartItemRecord,
  CartRecord,
  ICartRepository,
} from '../../domain/repositories/ICartRepository';

export type { CartItemRecord, CartRecord, ICartRepository };

export class PostgresCartRepository implements ICartRepository {
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

  /**
   * SCRUM-C01 Subtask 2: Xử lý đồng thời (Concurrency Handling)
   * Sử dụng Prisma $transaction kèm PostgreSQL Advisory Lock (pg_advisory_xact_lock)
   * dựa trên băm chuỗi 'cart:' + userId.
   * Đảm bảo khi nhiều request đến cùng lúc, CHỈ DUY NHẤT 1 cart active được tạo (MAX_ACTIVE_CART_PER_USER = 1).
   */
  public async getOrCreateCart(userId: string): Promise<CartRecord> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Khóa phân tán cấp giao dịch bảo vệ tài nguyên giỏ hàng của user
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('cart:' || ${userId}))`;

      // 2. Tìm kiếm giỏ hàng ACTIVE hiện có chưa hết hạn
      const existing = await tx.cart.findFirst({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { id: 'desc' },
      });

      if (existing) {
        return {
          id: String(existing.id),
          userId: String(existing.userId),
          expiresAt: existing.expiresAt,
        };
      }

      // 3. Nếu chưa có, tạo mới đúng 1 giỏ hàng active
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const created = await tx.cart.create({
        data: {
          userId,
          expiresAt,
        },
      });

      return {
        id: String(created.id),
        userId: String(created.userId),
        expiresAt: created.expiresAt,
      };
    });
  }

  public async countActiveCarts(userId: string): Promise<number> {
    return this.prisma.cart.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
  }

  public async getCartItems(cartId: string): Promise<CartItemRecord[]> {
    const rows = await this.prisma.cartItem.findMany({
      where: {
        cartId: BigInt(cartId),
      },
      orderBy: { id: 'asc' },
    });

    return rows.map((r) => ({
      id: String(r.id),
      cartId: String(r.cartId),
      productId: String(r.productId),
      quantity: r.quantity,
      unitPrice: Number(r.unitPrice),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  public async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findFirst({
        where: {
          cartId: BigInt(cartId),
          productId: productId,
        },
      });

      if (existing) {
        const newQty = Math.min(999, existing.quantity + quantity);
        await tx.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: newQty,
            unitPrice,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: BigInt(cartId),
            productId: productId,
            quantity,
            unitPrice,
          },
        });
      }

      await tx.cart.update({
        where: { id: BigInt(cartId) },
        data: {
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });
  }

  public async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<boolean> {
    const isNumeric = /^\d+$/.test(itemId);
    const where: any = isNumeric
      ? {
          cartId: BigInt(cartId),
          OR: [{ id: BigInt(itemId) }, { productId: itemId }],
        }
      : { productId: itemId, cartId: BigInt(cartId) };

    const result = await this.prisma.cartItem.updateMany({
      where,
      data: {
        quantity,
        updatedAt: new Date(),
      },
    });

    await this.touchCart(cartId);
    return result.count > 0;
  }

  public async removeItem(cartId: string, itemId: string): Promise<boolean> {
    const isNumeric = /^\d+$/.test(itemId);
    const where: any = isNumeric
      ? {
          cartId: BigInt(cartId),
          OR: [{ id: BigInt(itemId) }, { productId: itemId }],
        }
      : { productId: itemId, cartId: BigInt(cartId) };

    const result = await this.prisma.cartItem.deleteMany({
      where,
    });

    await this.touchCart(cartId);
    return result.count > 0;
  }

  public async clearCart(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { cartId: BigInt(cartId) },
    });
    await this.touchCart(cartId);
  }

  private async touchCart(cartId: string): Promise<void> {
    try {
      await this.prisma.cart.update({
        where: { id: BigInt(cartId) },
        data: {
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } catch {
      // Bỏ qua nếu cart không tìm thấy
    }
  }
}
