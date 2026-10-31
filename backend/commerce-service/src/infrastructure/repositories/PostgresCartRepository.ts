import { Pool, PoolClient } from 'pg';

export interface CartRecord {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface CartItemRecord {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresCartRepository {
  constructor(private readonly pool: Pool) {}

  private async tx<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * SCRUM-C01 Subtask 2: Xử lý đồng thời (Concurrency Handling)
   * Sử dụng Transaction kèm PostgreSQL Advisory Lock (pg_advisory_xact_lock)
   * dựa trên băm chuỗi 'cart:' + userId.
   * Đảm bảo khi nhiều request đến cùng lúc, CHỈ DUY NHẤT 1 cart active được tạo (MAX_ACTIVE_CART_PER_USER = 1).
   */
  public async getOrCreateCart(userId: string): Promise<CartRecord> {
    return this.tx(async (client) => {
      // 1. Khóa phân tán cấp giao dịch bảo vệ tài nguyên giỏ hàng của user
      await client.query("SELECT pg_advisory_xact_lock(hashtext('cart:' || $1))", [userId]);

      // 2. Tìm kiếm giỏ hàng ACTIVE hiện có chưa hết hạn
      const existing = await client.query(
        `SELECT id, user_id, expires_at FROM commerce_carts
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY id DESC LIMIT 1 FOR SHARE`,
        [userId],
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        return {
          id: String(row.id),
          userId: String(row.user_id),
          expiresAt: new Date(row.expires_at),
        };
      }

      // 3. Nếu chưa có, tạo mới đúng 1 giỏ hàng active
      const created = await client.query(
        `INSERT INTO commerce_carts (user_id, expires_at)
         VALUES ($1, NOW() + INTERVAL '7 days')
         RETURNING id, user_id, expires_at`,
        [userId],
      );

      const row = created.rows[0];
      return {
        id: String(row.id),
        userId: String(row.user_id),
        expiresAt: new Date(row.expires_at),
      };
    });
  }

  public async countActiveCarts(userId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM commerce_carts
       WHERE user_id = $1 AND expires_at > NOW()`,
      [userId],
    );
    return Number(rows[0]?.count || 0);
  }

  public async getCartItems(cartId: string): Promise<CartItemRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT id, cart_id, product_id, quantity, unit_price, created_at, updated_at
       FROM commerce_cart_items
       WHERE cart_id = $1
       ORDER BY id ASC`,
      [cartId],
    );

    return rows.map((r) => ({
      id: String(r.id),
      cartId: String(r.cart_id),
      productId: String(r.product_id),
      quantity: Number(r.quantity),
      unitPrice: Number(r.unit_price),
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  public async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
  ): Promise<void> {
    return this.tx(async (client) => {
      const existing = await client.query(
        `SELECT id, quantity FROM commerce_cart_items WHERE cart_id = $1 AND product_id = $2 FOR UPDATE`,
        [cartId, productId],
      );

      if (existing.rows.length > 0) {
        const itemId = existing.rows[0].id;
        const newQty = Math.min(999, Number(existing.rows[0].quantity) + quantity);
        await client.query(
          `UPDATE commerce_cart_items
           SET quantity = $1, unit_price = $2, updated_at = NOW()
           WHERE id = $3`,
          [newQty, unitPrice, itemId],
        );
      } else {
        await client.query(
          `INSERT INTO commerce_cart_items (cart_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [cartId, productId, quantity, unitPrice],
        );
      }

      await client.query(
        `UPDATE commerce_carts SET updated_at = NOW(), expires_at = NOW() + INTERVAL '7 days' WHERE id = $1`,
        [cartId],
      );
    });
  }

  public async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<boolean> {
    const isNumeric = /^\d+$/.test(itemId);
    const where = isNumeric
      ? 'WHERE id = $1 AND cart_id = $2'
      : 'WHERE product_id = $1 AND cart_id = $2';

    const result = await this.pool.query(
      `UPDATE commerce_cart_items SET quantity = $3, updated_at = NOW() ${where}`,
      [itemId, cartId, quantity],
    );

    await this.touchCart(cartId);
    return (result.rowCount ?? 0) > 0;
  }

  public async removeItem(cartId: string, itemId: string): Promise<boolean> {
    const isNumeric = /^\d+$/.test(itemId);
    const where = isNumeric
      ? 'WHERE id = $1 AND cart_id = $2'
      : 'WHERE product_id = $1 AND cart_id = $2';

    const result = await this.pool.query(`DELETE FROM commerce_cart_items ${where}`, [
      itemId,
      cartId,
    ]);

    await this.touchCart(cartId);
    return (result.rowCount ?? 0) > 0;
  }

  public async clearCart(cartId: string): Promise<void> {
    await this.pool.query(`DELETE FROM commerce_cart_items WHERE cart_id = $1`, [cartId]);
    await this.touchCart(cartId);
  }

  private async touchCart(cartId: string): Promise<void> {
    await this.pool.query(
      `UPDATE commerce_carts SET updated_at = NOW(), expires_at = NOW() + INTERVAL '7 days' WHERE id = $1`,
      [cartId],
    );
  }
}
