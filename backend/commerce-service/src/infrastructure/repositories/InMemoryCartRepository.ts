import {
  CartItemRecord,
  CartRecord,
  ICartRepository,
} from '../../domain/repositories/ICartRepository';

export class InMemoryCartRepository implements ICartRepository {
  private carts: Map<string, CartRecord> = new Map(); // cartId -> CartRecord
  private userActiveCart: Map<string, string> = new Map(); // userId -> cartId
  private cartItems: Map<string, CartItemRecord[]> = new Map(); // cartId -> items

  public async getOrCreateCart(userId: string): Promise<CartRecord> {
    const existingCartId = this.userActiveCart.get(userId);
    if (existingCartId) {
      const cart = this.carts.get(existingCartId);
      if (cart) return cart;
    }

    const newCart: CartRecord = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    this.carts.set(newCart.id, newCart);
    this.userActiveCart.set(userId, newCart.id);
    this.cartItems.set(newCart.id, []);

    return newCart;
  }

  public async getCartItems(cartId: string): Promise<CartItemRecord[]> {
    return this.cartItems.get(cartId) || [];
  }

  public async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
  ): Promise<void> {
    const items = this.cartItems.get(cartId) || [];
    const existing = items.find((it) => it.productId === productId);

    if (existing) {
      existing.quantity += quantity;
      existing.unitPrice = unitPrice;
      existing.updatedAt = new Date();
    } else {
      items.push({
        id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        cartId,
        productId,
        quantity,
        unitPrice,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.cartItems.set(cartId, items);
  }

  public async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<boolean> {
    const items = this.cartItems.get(cartId) || [];
    const target = items.find((it) => it.id === itemId || it.productId === itemId);

    if (!target) return false;

    if (quantity <= 0) {
      return this.removeItem(cartId, itemId);
    }

    target.quantity = quantity;
    target.updatedAt = new Date();
    return true;
  }

  public async removeItem(cartId: string, itemId: string): Promise<boolean> {
    const items = this.cartItems.get(cartId) || [];
    const initialLen = items.length;
    const filtered = items.filter((it) => it.id !== itemId && it.productId !== itemId);

    this.cartItems.set(cartId, filtered);
    return filtered.length < initialLen;
  }

  public async clearCart(cartId: string): Promise<void> {
    this.cartItems.set(cartId, []);
  }

  public async countActiveCarts(userId: string): Promise<number> {
    return this.userActiveCart.has(userId) ? 1 : 0;
  }
}
